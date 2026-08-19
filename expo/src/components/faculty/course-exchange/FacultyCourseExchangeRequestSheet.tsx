import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES,
  COURSE_EXCHANGE_MODULE_LABELS,
  EXCHANGE_INDEPENDENT_COPY_NOTE,
  type CourseExchangeModule,
  type ExchangeRequestDetail,
  type ExchangeSupplementOptions,
  type ExchangeTimelineEntry,
  exchangeRequestStatusLabel,
  exchangeRequestStatusColor,
  isCourseExchangeImportableStatus,
  mergeSupplementModules,
  summarizeCloneCounts,
} from "../../../lib/course-exchange-shared"
import { FACULTY_COURSE_EXCHANGE_COLOR } from "../../../lib/faculty-course-exchange-theme"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetNotice,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty-collab-sheet-ui"
import { FacultyCourseExchangeModulePicker } from "./FacultyCourseExchangeModulePicker"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { AppButton } from "../../theme/AppButton"
import { FacultyStatusPill } from "../faculty-shared"

type Props = {
  visible: boolean
  request: ExchangeRequestDetail | null
  mode: "sent" | "received"
  destinationLabel?: string | null
  loading: boolean
  onClose: () => void
  onImport?: () => void
  onReview?: () => void
  onApprove?: (modules: CourseExchangeModule[]) => Promise<void>
  onReject?: (reason?: string) => Promise<void>
  onSupplement?: (modules: CourseExchangeModule[]) => Promise<void>
}

function formatWhen(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function TimelineList({ entries }: { entries: ExchangeTimelineEntry[] }) {
  const native = useThemedNative()
  const type = useNativeType()
  if (!entries.length) {
    return <Text style={[type.secondary, { color: native.secondaryLabel }]}>No activity recorded yet.</Text>
  }
  return (
    <View style={styles.timeline}>
      {entries.map((entry) => (
        <View key={entry.id} style={[styles.timelineRow, { borderLeftColor: native.separator }]}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>{entry.label}</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {formatWhen(entry.at)}
            {entry.actorName ? ` · ${entry.actorName}` : ""}
          </Text>
          {entry.modules.length > 0 ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {entry.modules.map((m) => COURSE_EXCHANGE_MODULE_LABELS[m]).join(" · ")}
            </Text>
          ) : null}
          {entry.note ? (
            <Text style={[type.caption, { color: native.tertiaryLabel, fontStyle: "italic" }]}>{entry.note}</Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function RejectReasonSheet({
  visible,
  loading,
  onClose,
  onSubmit,
}: {
  visible: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (reason?: string) => void
}) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (visible) setReason("")
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.rejectBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.rejectCard, { backgroundColor: native.secondaryGrouped, paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[type.sheetTitle, { color: native.label }]}>Decline request?</Text>
          <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 12 }]}>
            The requester will see your note if you add one.
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (optional)"
            placeholderTextColor={native.tertiaryLabel}
            multiline
            style={[
              styles.rejectInput,
              { color: native.label, borderColor: native.separator, backgroundColor: native.fill },
            ]}
          />
          <View style={styles.footerActions}>
            <AppButton label="Cancel" variant="secondary" onPress={onClose} disabled={loading} />
            <AppButton
              label="Decline"
              backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.danger}
              disabled={loading}
              loading={loading}
              onPress={() => onSubmit(reason.trim() || undefined)}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function FacultyCourseExchangeRequestSheet({
  visible,
  request,
  mode,
  destinationLabel,
  loading,
  onClose,
  onImport,
  onReview,
  onApprove,
  onReject,
  onSupplement,
}: Props) {
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()
  const native = useThemedNative()
  const type = useNativeType()
  const collabSheetStyles = useCollabSheetStyles()

  const [timeline, setTimeline] = useState<ExchangeTimelineEntry[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approvalModules, setApprovalModules] = useState<CourseExchangeModule[]>([
    ...COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES,
  ])
  const [supplementSelected, setSupplementSelected] = useState<CourseExchangeModule[]>([])
  const [supplementOptions, setSupplementOptions] = useState<ExchangeSupplementOptions | null>(null)
  const [supplementLoading, setSupplementLoading] = useState(false)
  const [showSupplement, setShowSupplement] = useState(false)

  const status = request?.status.toUpperCase() ?? ""
  const canImport = mode === "sent" && isCourseExchangeImportableStatus(status)
  const canReview = mode === "received" && (request?.needsReview || status === "PENDING")
  const cloneSummary = summarizeCloneCounts(request?.clone_summary ?? null)
  const importFailed = status === "FAILED"

  const supplementModuleHints = useMemo(() => {
    if (!supplementOptions) return undefined
    const hints: Partial<Record<CourseExchangeModule, string>> = {}
    for (const mod of supplementOptions.addableModules) hints[mod] = "Instant import"
    for (const mod of supplementOptions.requiresApproval) hints[mod] = "Needs approval"
    return hints
  }, [supplementOptions])

  const supplementAllowed = useMemo(() => {
    const fromApi = mergeSupplementModules(supplementOptions)
    if (fromApi.length) return fromApi
    return request?.missingModules ?? []
  }, [supplementOptions, request?.missingModules])

  useEffect(() => {
    if (!visible || !request?.id || !scope) {
      setTimeline([])
      setReviewMode(false)
      setRejectOpen(false)
      setShowSupplement(false)
      setSupplementOptions(null)
      return
    }
    setTimelineLoading(true)
    instructorApi
      .getCourseExchangeTimeline(scope, request.id)
      .then(setTimeline)
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false))

    setApprovalModules(
      request.approved_modules?.length
        ? [...request.approved_modules]
        : request.shareableModules?.length
          ? [...request.shareableModules]
          : [...COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES],
    )
  }, [visible, request, scope])

  useEffect(() => {
    if (!visible || !request?.id || !scope || mode !== "sent") {
      setSupplementOptions(null)
      setShowSupplement(false)
      return
    }

    const hasMissing = (request.missingModules?.length ?? 0) > 0
    if (!hasMissing && status !== "COPIED" && status !== "COMPLETED") {
      setShowSupplement(false)
      return
    }

    setSupplementLoading(true)
    instructorApi
      .getCourseExchangeSupplementOptions(scope, request.id)
      .then((options) => {
        setSupplementOptions(options)
        const addable = options.addableModules ?? []
        const fallback = request.missingModules ?? []
        const initial = addable.length ? addable : fallback
        setSupplementSelected(initial)
        setShowSupplement(initial.length > 0)
      })
      .catch(() => {
        setSupplementOptions(null)
        const fallback = request.missingModules ?? []
        setSupplementSelected(fallback)
        setShowSupplement(fallback.length > 0)
      })
      .finally(() => setSupplementLoading(false))
  }, [visible, request?.id, request?.missingModules, scope, mode, status])

  if (!request) return null

  const title = [request.courseCode, request.courseTitle].filter(Boolean).join(" — ")

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <FacultySheetContainer style={{ flex: 1 }}>
          <FacultySheetChrome
            title={title || `Request #${request.id}`}
            subtitle={mode === "received" ? request.requesterName : request.creatorName}
            topInset={insets.top}
            onClose={onClose}
            accentColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
          />
          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          >
            <View style={styles.statusRow}>
              <FacultyStatusPill
                label={exchangeRequestStatusLabel(status)}
                tone={
                  exchangeRequestStatusColor(status) === "success"
                    ? "success"
                    : exchangeRequestStatusColor(status) === "danger"
                      ? "danger"
                      : exchangeRequestStatusColor(status) === "warning"
                        ? "warning"
                        : "neutral"
                }
              />
            </View>

            {request.rejection_reason ? (
              <FacultySheetNotice tone="danger" message={`Declined: ${request.rejection_reason}`} />
            ) : null}

            {request.purpose ? (
              <FacultySheetSection label="Purpose">
                <Text style={[type.secondary, { color: native.secondaryLabel }]}>{request.purpose}</Text>
              </FacultySheetSection>
            ) : null}

            <FacultySheetSection label="Requested modules">
              <Text style={[type.secondary, { color: native.secondaryLabel }]}>
                {request.requested_modules.map((m) => COURSE_EXCHANGE_MODULE_LABELS[m]).join(" · ")}
              </Text>
            </FacultySheetSection>

            {request.approved_modules?.length ? (
              <FacultySheetSection label="Approved modules">
                <Text style={[type.secondary, { color: native.secondaryLabel }]}>
                  {request.approved_modules.map((m) => COURSE_EXCHANGE_MODULE_LABELS[m]).join(" · ")}
                </Text>
              </FacultySheetSection>
            ) : null}

            {destinationLabel ? (
              <FacultySheetSection label="Destination course">
                <Text style={[type.body, { color: native.label }]}>{destinationLabel}</Text>
              </FacultySheetSection>
            ) : null}

            {cloneSummary ? (
              <FacultySheetSection label="Import summary">
                <Text style={[type.secondary, { color: native.secondaryLabel }]}>{cloneSummary}</Text>
              </FacultySheetSection>
            ) : null}

            {request.clone_error ? (
              <FacultySheetNotice tone="danger" message={request.clone_error} />
            ) : null}

            <FacultySheetNotice tone="warning" message={EXCHANGE_INDEPENDENT_COPY_NOTE} />

            {reviewMode ? (
              <FacultySheetSection label="Approve modules">
                <FacultyCourseExchangeModulePicker
                  allowed={request.shareableModules}
                  selected={approvalModules}
                  onChange={setApprovalModules}
                  defaults={COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES}
                />
                <View style={styles.footerActions}>
                  <AppButton label="Cancel" variant="secondary" onPress={() => setReviewMode(false)} />
                  <AppButton
                    label="Approve"
                    backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
                    disabled={loading || approvalModules.length === 0}
                    onPress={() => void onApprove?.(approvalModules).then(() => setReviewMode(false))}
                  />
                </View>
              </FacultySheetSection>
            ) : null}

            {showSupplement && mode === "sent" ? (
              <FacultySheetSection label="Add missing modules">
                {supplementLoading ? (
                  <ActivityIndicator color={FACULTY_COURSE_EXCHANGE_COLOR.link} />
                ) : (
                  <>
                    {supplementOptions?.addableModules.length ? (
                      <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 8 }]}>
                        Instant import modules copy immediately. Others require creator approval.
                      </Text>
                    ) : null}
                    <FacultyCourseExchangeModulePicker
                      allowed={supplementAllowed}
                      selected={supplementSelected}
                      onChange={setSupplementSelected}
                      moduleHints={supplementModuleHints}
                    />
                    <AppButton
                      label="Add selected modules"
                      backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
                      disabled={loading || supplementSelected.length === 0}
                      onPress={() => void onSupplement?.(supplementSelected)}
                    />
                  </>
                )}
              </FacultySheetSection>
            ) : null}

            <FacultySheetSection label="Timeline">
              {timelineLoading ? (
                <ActivityIndicator color={FACULTY_COURSE_EXCHANGE_COLOR.link} />
              ) : (
                <TimelineList entries={timeline} />
              )}
            </FacultySheetSection>

            <View style={styles.footerActions}>
              {canReview && !reviewMode ? (
                <>
                  <AppButton
                    label="Reject"
                    variant="secondary"
                    onPress={() => setRejectOpen(true)}
                    disabled={loading}
                  />
                  <AppButton
                    label="Review & approve"
                    backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
                    onPress={() => (onReview ? onReview() : setReviewMode(true))}
                    disabled={loading}
                  />
                </>
              ) : null}
              {canImport ? (
                <AppButton
                  label={importFailed ? "Retry import" : "Import to destination"}
                  backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
                  onPress={() => void onImport?.()}
                  disabled={loading}
                />
              ) : null}
            </View>
          </ScrollView>
        </FacultySheetContainer>
      </Modal>

      <RejectReasonSheet
        visible={rejectOpen}
        loading={loading}
        onClose={() => setRejectOpen(false)}
        onSubmit={(reason) => {
          void onReject?.(reason)?.then(() => setRejectOpen(false))
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  statusRow: { marginBottom: 8 },
  timeline: { gap: 12, paddingLeft: 8 },
  timelineRow: { borderLeftWidth: 2, paddingLeft: 12, gap: 2 },
  footerActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  rejectBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  rejectCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  rejectInput: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
})
