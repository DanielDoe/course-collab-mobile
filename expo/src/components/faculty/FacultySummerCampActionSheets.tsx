import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { AppAlert } from "../../lib/app-alert"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type SummerCampProgram,
  type SummerCampRequest,
  type SummerCampTraining,
  type SummerCampTrainingDetail,
} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  FACULTY_SUMMER_CAMP_COLOR,
  facultySummerCampDraftWash,
  facultySummerCampRequestThumb,
  facultySummerCampStatus,
  facultySummerCampTrackThumb,
  statusLabel,
} from "../../lib/faculty-summer-camp-theme"
import { FacultyStatusPill } from "./faculty-shared"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetField,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetTextInput,
  FacultySheetWorkflow,
  useCollabSheetStyles,
  FacultySheetStatChip,
  FacultySheetStatRow,

} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"
import { campDatePayload, normalizeCampIsoDate } from "../../lib/faculty-summer-camp-utils"

function PublishWorkflow({
  title,
  body,
  actionLabel,
  loading,
  onAction,
}: {
  title: string
  body: string
  actionLabel: string
  loading?: boolean
  onAction: () => void
}) {
  const { native, tokens, type } = useModuleTheme()

  return (
    <View
      style={[
        localStyles.publishCard,
        {
          backgroundColor: facultySummerCampDraftWash(tokens),
          borderColor: `${FACULTY_SUMMER_CAMP_COLOR.draft}33`,
        },
      ]}
    >
      <Text style={[type.caption, { color: FACULTY_SUMMER_CAMP_COLOR.draft, fontWeight: "700", letterSpacing: 0.4 }]}>
        {title}
      </Text>
      <Text style={[type.caption, { color: native.label, lineHeight: 20, fontWeight: "600" }]}>{body}</Text>
      <Pressable
        style={[localStyles.publishBtn, { backgroundColor: FACULTY_SUMMER_CAMP_COLOR.action }]}
        disabled={loading}
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        {loading ? (
          <ActivityIndicator color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
            <Text style={[localStyles.publishBtnText, { color: FACULTY_SUMMER_CAMP_COLOR.actionInk }]}>
              {actionLabel}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  )
}

function SummerTrackRow({
  trainingId,
  title,
  meta,
  status,
  isLast,
  onPress,
}: {
  trainingId: number
  title: string
  meta: string
  status: string
  isLast?: boolean
  onPress: () => void
}) {
  const { native, tokens, type } = useModuleTheme()
  const statusMeta = facultySummerCampStatus(status)

  return (
    <Pressable
      style={({ pressed }) => [
        localStyles.trackRow,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
        },
        !isLast && { marginBottom: 8 },
        pressed && { opacity: 0.88 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${statusMeta.label}`}
    >
      <SolidListThumbTile thumb={facultySummerCampTrackThumb(trainingId)} icon="school" size="compact" />
      <View style={localStyles.trackCopy}>
        <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 15, lineHeight: 21 }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={localStyles.trackMetaRow}>
          <Ionicons
            name={statusMeta.icon}
            size={statusMeta.icon === "ellipse" ? 8 : 12}
            color={statusMeta.color}
          />
          <Text style={[type.footnote, { color: statusMeta.color, fontWeight: "600" }]}>{statusMeta.label}</Text>
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}> · {meta}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    </Pressable>
  )
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "published" || status === "active") return "success"
  if (status === "draft") return "warning"
  return "neutral"
}

type CampProps = {
  visible: boolean
  camp: SummerCampProgram | null
  trainings: SummerCampTraining[]
  acting: boolean
  onClose: () => void
  onUpdated: () => void
  onAddTraining: (camp: SummerCampProgram) => void
  onOpenTraining: (training: SummerCampTraining) => void
}

export function FacultySummerCampProgramActionSheet({
  visible,
  camp,
  trainings,
  acting,
  onClose,
  onUpdated,
  onAddTraining,
  onOpenTraining,
}: CampProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible || !camp) return
    setTitle(camp.title)
    setDescription(camp.description ?? "")
    setStartDate(normalizeCampIsoDate(camp.start_date))
    setEndDate(normalizeCampIsoDate(camp.end_date))
    setDirty(false)
    setError("")
  }, [visible, camp])

  if (!camp) return null

  async function saveEdits() {
    if (!scope || !camp) return
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    let dates: { start_date?: string; end_date?: string }
    try {
      dates = campDatePayload(startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check the program dates.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await instructorApi.updateSummerCamp(scope, {
        camp_id: camp.id,
        title: title.trim(),
        description: description.trim() || undefined,
        ...dates,
      })
      setDirty(false)
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save program.")
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    if (!scope || !camp) return
    setSaving(true)
    try {
      await instructorApi.updateSummerCamp(scope, { camp_id: camp.id, status: "published" })
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish program.")
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    if (!scope || !camp) return
    AppAlert.alert(
      "Delete program?",
      "This permanently removes the draft program and its tracks. Campers cannot be enrolled.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setSaving(true)
              setError("")
              try {
                await instructorApi.deleteSummerCamp(scope, camp.id)
                onClose()
                onUpdated()
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not delete program.")
              } finally {
                setSaving(false)
              }
            })()
          },
        },
      ],
    )
  }

  const isPublished = camp.status === "published" || camp.status === "active"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={{ paddingBottom: insets.bottom }}>
        <FacultySheetChrome
          topInset={insets.top}
          title="Summer program"
          onClose={onClose}
          rightSlot={
            dirty ? (
              <Pressable
                onPress={() => void saveEdits()}
                disabled={saving}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Save"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={FACULTY_SUMMER_CAMP_COLOR.action} />
                ) : (
                  <Text style={[type.bodyEmphasis, { color: FACULTY_SUMMER_CAMP_COLOR.action, fontSize: 15 }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            ) : null
          }
        />

        <ScrollView contentContainerStyle={collabSheetStyles.scroll} keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
          <FacultySheetHero
            title={camp.title}
            subtitle={`${camp.training_count ?? trainings.length} tracks · ${camp.enrollment_count ?? 0} enrolled`}
            icon="sunny-outline"
            pills={<FacultyStatusPill label={statusLabel(camp.status)} tone={statusTone(camp.status)} />}
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip
              icon="albums-outline"
              label="Tracks"
              value={String(trainings.length)}
              tone={SHEET_METRIC.primary}
            />
            <FacultySheetStatChip
              icon="people-outline"
              label="Enrolled"
              value={String(camp.enrollment_count ?? 0)}
              tone={SHEET_METRIC.people}
            />
            <FacultySheetStatChip
              icon="flag-outline"
              label="Status"
              value={isPublished ? "Live" : "Draft"}
              tone={isPublished ? SHEET_METRIC.info : SHEET_METRIC.pending}
            />
          </FacultySheetStatRow>

          {error ? (
            <Text style={[type.caption, { color: tokens.danger, fontWeight: "600", marginBottom: 8 }]}>{error}</Text>
          ) : null}

          <FacultySheetSection label="Program details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Title">
              <FacultySheetTextInput
                value={title}
                placeholder="Summer Camp 2026"
                accessibilityLabel="Title"
                onChangeText={(v) => {
                  setTitle(v)
                  setDirty(true)
                }}
              />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <FacultySheetTextInput
                multiline
                value={description}
                placeholder="Describe this summer program…"
                accessibilityLabel="Description"
                onChangeText={(v) => {
                  setDescription(v)
                  setDirty(true)
                }}
              />
            </FacultySheetField>
            <FacultySheetField label="Start date">
              <FacultySummerCampDatePicker
                value={startDate}
                onChange={(next) => {
                  setStartDate(next)
                  setDirty(true)
                }}
                accessibilityLabel="Start date"
              />
            </FacultySheetField>
            <FacultySheetField label="End date">
              <FacultySummerCampDatePicker
                value={endDate}
                onChange={(next) => {
                  setEndDate(next)
                  setDirty(true)
                }}
                accessibilityLabel="End date"
              />
            </FacultySheetField>
          </FacultySheetSection>

          {!isPublished ? (
            <PublishWorkflow
              title="Ready to launch?"
              body="Publishing makes this program visible for camper enrollment."
              actionLabel="Publish program"
              loading={saving || acting}
              onAction={() => void publish()}
            />
          ) : null}

          <FacultySheetSection
            label="Training tracks"
            hint={`${trainings.length} under this program`}
            tone={SHEET_SECTION.roster}
            action={
              <Pressable
                style={[
                  localStyles.addChip,
                  { backgroundColor: `${FACULTY_SUMMER_CAMP_COLOR.link}18`, borderColor: `${FACULTY_SUMMER_CAMP_COLOR.link}44` },
                ]}
                onPress={() => onAddTraining(camp)}
                accessibilityRole="button"
                accessibilityLabel="Add track"
              >
                <Ionicons name="add" size={16} color={FACULTY_SUMMER_CAMP_COLOR.link} />
                <Text style={[type.caption, { color: FACULTY_SUMMER_CAMP_COLOR.link, fontWeight: "700" }]}>
                  Add track
                </Text>
              </Pressable>
            }
          >
            {trainings.length === 0 ? (
              <Text style={[type.caption, { color: native.secondaryLabel, fontStyle: "italic" }]}>
                No tracks yet. Add one to get started.
              </Text>
            ) : (
              <View>
                {trainings.map((t, index) => (
                  <SummerTrackRow
                    key={t.id}
                    trainingId={t.id}
                    title={t.title}
                    meta={`${t.enrollment_count ?? 0} enrolled`}
                    status={t.status}
                    isLast={index === trainings.length - 1}
                    onPress={() => onOpenTraining(t)}
                  />
                ))}
              </View>
            )}
          </FacultySheetSection>

          {!isPublished ? (
            <Pressable
              style={[localStyles.deleteBtn, { borderColor: `${tokens.danger}55` }]}
              disabled={saving || acting}
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete program"
            >
              <Ionicons name="trash-outline" size={18} color={tokens.danger} />
              <Text style={[type.bodyEmphasis, { color: tokens.danger, fontSize: 15 }]}>Delete program</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

type TrainingProps = {
  visible: boolean
  training: SummerCampTraining | null
  acting: boolean
  onClose: () => void
  onUpdated: () => void
}

export function FacultySummerCampTrainingActionSheet({
  visible,
  training,
  acting,
  onClose,
  onUpdated,
}: TrainingProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()

  const [detail, setDetail] = useState<SummerCampTrainingDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible || !training || !scope) return
    setTitle(training.title)
    setDescription(training.description ?? "")
    setDirty(false)
    setError("")
    setLoadingDetail(true)
    instructorApi
      .getSummerCampTrainingDetail(scope, training.id)
      .then(setDetail)
      .catch((err) => {
        setDetail(null)
        setError(err instanceof ApiError ? err.message : "Could not load track metrics.")
      })
      .finally(() => setLoadingDetail(false))
  }, [visible, training, scope])

  if (!training) return null

  async function saveEdits() {
    if (!scope || !training) return
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await instructorApi.updateSummerCampTraining(scope, {
        training_id: training.id,
        title: title.trim(),
        description: description.trim() || undefined,
      })
      setDirty(false)
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save training track.")
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    if (!scope || !training) return
    setSaving(true)
    try {
      await instructorApi.updateSummerCampTraining(scope, { training_id: training.id, status: "published" })
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish training.")
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    if (!scope || !training) return
    AppAlert.alert(
      "Delete track?",
      "This permanently removes the draft training track.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setSaving(true)
              setError("")
              try {
                await instructorApi.deleteSummerCampTraining(scope, training.id)
                onClose()
                onUpdated()
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not delete track.")
              } finally {
                setSaving(false)
              }
            })()
          },
        },
      ],
    )
  }

  const isPublished = training.status === "published" || training.status === "active"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={{ paddingBottom: insets.bottom }}>
        <FacultySheetChrome
          topInset={insets.top}
          title="Training track"
          onClose={onClose}
          rightSlot={
            dirty ? (
              <Pressable
                onPress={() => void saveEdits()}
                disabled={saving}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Save"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={FACULTY_SUMMER_CAMP_COLOR.action} />
                ) : (
                  <Text style={[type.bodyEmphasis, { color: FACULTY_SUMMER_CAMP_COLOR.action, fontSize: 15 }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            ) : null
          }
        />

        <ScrollView
          contentContainerStyle={collabSheetStyles.scroll}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={loadingDetail}
              onRefresh={() => {
                if (!scope || !training) return
                setLoadingDetail(true)
                instructorApi
                  .getSummerCampTrainingDetail(scope, training.id)
                  .then(setDetail)
                  .catch((err) => {
                    setDetail(null)
                    setError(err instanceof ApiError ? err.message : "Could not load track metrics.")
                  })
                  .finally(() => setLoadingDetail(false))
              }}
              tintColor={FACULTY_SUMMER_CAMP_COLOR.action}
            />
          }
        >
          <FacultySheetHero
            title={training.title}
            subtitle={training.camp_title ?? "Summer program"}
            icon="school-outline"
            pills={<FacultyStatusPill label={statusLabel(training.status)} tone={statusTone(training.status)} />}
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip
              icon="layers-outline"
              label="Modules"
              value={String(detail?.module_count ?? "—")}
              tone={SHEET_METRIC.primary}
            />
            <FacultySheetStatChip
              icon="document-text-outline"
              label="Submissions"
              value={String(detail?.submission_count ?? "—")}
              tone={SHEET_METRIC.info}
            />
            <FacultySheetStatChip
              icon="time-outline"
              label="Pending"
              value={String(detail?.pending_submission_count ?? 0)}
              tone={(detail?.pending_submission_count ?? 0) > 0 ? SHEET_METRIC.danger : SHEET_METRIC.neutral}
            />
          </FacultySheetStatRow>

          {error ? (
            <Text style={[type.caption, { color: tokens.danger, fontWeight: "600", marginBottom: 8 }]}>{error}</Text>
          ) : null}

          {loadingDetail && !detail ? (
            <ActivityIndicator color={FACULTY_SUMMER_CAMP_COLOR.action} style={{ marginVertical: 16 }} />
          ) : detail ? (
            <FacultySheetSection label="Track activity" tone={SHEET_SECTION.highlight}>
              <FacultySheetGroupedList>
                <FacultySheetMetricRow icon="layers-outline" label="Modules" value={String(detail.module_count ?? 0)} />
                <FacultySheetMetricRow
                  icon="document-text-outline"
                  label="Submissions"
                  value={String(detail.submission_count ?? 0)}
                />
                <FacultySheetMetricRow
                  icon="time-outline"
                  label="Pending review"
                  value={String(detail.pending_submission_count ?? 0)}
                  tone={(detail.pending_submission_count ?? 0) > 0 ? "rose" : undefined}
                  isLast
                />
              </FacultySheetGroupedList>
            </FacultySheetSection>
          ) : null}

          {(detail?.pending_submission_count ?? 0) > 0 ? (
            <FacultySheetNotice
              tone="warning"
              message="Pending submissions are reviewed in the instructor web dashboard (Dashboard → Summer Camp → this track). Counts on mobile are read-only."
            />
          ) : null}

          <FacultySheetSection label="Track details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Title">
              <FacultySheetTextInput
                value={title}
                placeholder="Track title"
                accessibilityLabel="Title"
                onChangeText={(v) => {
                  setTitle(v)
                  setDirty(true)
                }}
              />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <FacultySheetTextInput
                multiline
                value={description}
                placeholder="Describe this training track…"
                accessibilityLabel="Description"
                onChangeText={(v) => {
                  setDescription(v)
                  setDirty(true)
                }}
              />
            </FacultySheetField>
          </FacultySheetSection>

          {!isPublished ? (
            <PublishWorkflow
              title="Open for enrollment"
              body="Published tracks appear on the public summer camp page."
              actionLabel="Publish track"
              loading={saving || acting}
              onAction={() => void publish()}
            />
          ) : null}

          {!isPublished ? (
            <Pressable
              style={[localStyles.deleteBtn, { borderColor: `${tokens.danger}55` }]}
              disabled={saving || acting}
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete track"
            >
              <Ionicons name="trash-outline" size={18} color={tokens.danger} />
              <Text style={[type.bodyEmphasis, { color: tokens.danger, fontSize: 15 }]}>Delete track</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

export function FacultySummerCampRejectReasonSheet({
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const { type } = useModuleTheme()
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (visible) setReason("")
  }, [visible])

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      accessibilityLabel="Close reject request"
    >
      <GlassSheetBackground style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) }}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, { color: native.label, marginTop: 4 }]}>Reject camper request?</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18, marginBottom: 12 }]}>
          The camper will not gain access unless they submit a new request.
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (optional)"
          placeholderTextColor={native.tertiaryLabel}
          multiline
          style={[
            requestSheetStyles.rejectInput,
            {
              color: native.label,
              borderColor: native.separator,
              backgroundColor: native.secondaryGrouped,
            },
          ]}
        />
        <View style={requestSheetStyles.rejectActions}>
          <Pressable
            style={({ pressed }) => [
              requestSheetStyles.rejectBtn,
              { borderColor: native.separator, opacity: pressed ? 0.8 : 1 },
            ]}
            disabled={submitting}
            onPress={onClose}
          >
            <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              requestSheetStyles.rejectBtn,
              requestSheetStyles.rejectBtnPrimary,
              { backgroundColor: NATIVE.destructive, opacity: pressed || submitting ? 0.85 : 1 },
            ]}
            disabled={submitting}
            onPress={() => onSubmit(reason.trim())}
          >
            <Text style={[type.caption, { color: "#fff", fontWeight: "700" }]}>Reject</Text>
          </Pressable>
        </View>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

export function FacultySummerCampRequestActionSheet({
  visible,
  request,
  acting,
  onClose,
  onApprove,
  onReject,
}: {
  visible: boolean
  request: SummerCampRequest | null
  acting: boolean
  onClose: () => void
  onApprove: () => void
  onReject: (reason?: string) => void
}) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const { type } = useModuleTheme()
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  useEffect(() => {
    if (!visible) {
      setConfirmApprove(false)
      setRejectOpen(false)
    }
  }, [visible])

  if (!request) return null

  const pending = request.status === "pending" || request.status === "requested"
  const statusMeta = facultySummerCampStatus(pending ? "pending" : request.status)
  const thumb = facultySummerCampRequestThumb(request.id)

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title="Request details"
            onClose={onClose}
            accentColor={FACULTY_SUMMER_CAMP_COLOR.link}
          />

          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          >
            <FacultySheetHero
              title={request.full_name}
              subtitle={request.email ?? request.student_id ?? "Summer camp request"}
              icon="mail-outline"
              thumbColor={thumb.fill}
              pills={
                statusMeta ? (
                  <FacultyStatusPill label={statusMeta.label} tone={pending ? "warning" : "neutral"} />
                ) : null
              }
            />

            <FacultySheetSection label="Inbox request" tone={SHEET_SECTION.roster}>
              <FacultySheetGroupedList>
                <FacultySheetMetricRow icon="id-card-outline" label="Student ID" value={request.student_id || "—"} />
                {request.email ? (
                  <FacultySheetMetricRow icon="mail-outline" label="Email" value={request.email} />
                ) : null}
                <FacultySheetMetricRow
                  icon="pricetag-outline"
                  label="Kind"
                  value={(request.request_kind ?? "request").replace(/_/g, " ")}
                />
                {request.organization ? (
                  <FacultySheetMetricRow icon="business-outline" label="Organization" value={request.organization} />
                ) : null}
                {request.school_affiliation ? (
                  <FacultySheetMetricRow icon="school-outline" label="School" value={request.school_affiliation} />
                ) : null}
                <FacultySheetMetricRow
                  icon="time-outline"
                  label="Submitted"
                  value={formatFacultyRelativeTime(request.created_at)}
                  isLast
                />
              </FacultySheetGroupedList>
            </FacultySheetSection>

            {pending ? (
              <FacultySheetSection label="Your decision" tone={SHEET_SECTION.workflow}>
                <FacultySheetWorkflow
                  title="Pending review"
                  body="Approving creates the camper account so they can sign in. Reject if the request should not proceed."
                  acting={acting}
                  approveLabel="Approve request"
                  rejectLabel="Reject"
                  onApprove={() => setConfirmApprove(true)}
                  onReject={() => setRejectOpen(true)}
                />
              </FacultySheetSection>
            ) : null}
          </ScrollView>

          {confirmApprove ? (
            <FacultySheetConfirm
              title="Approve camper request?"
              body={`${request.full_name} will be able to sign in with the credentials from this request.`}
              confirmLabel="Approve"
              danger={false}
              onCancel={() => setConfirmApprove(false)}
              onConfirm={() => {
                setConfirmApprove(false)
                onApprove()
              }}
            />
          ) : null}
        </FacultySheetContainer>
      </Modal>

      <FacultySummerCampRejectReasonSheet
        visible={rejectOpen}
        submitting={acting}
        onClose={() => setRejectOpen(false)}
        onSubmit={(reason) => {
          setRejectOpen(false)
          onReject(reason || undefined)
        }}
      />
    </>
  )
}

const requestSheetStyles = StyleSheet.create({
  rejectInput: {
    minHeight: 88,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 20,
  },
  rejectActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  rejectBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rejectBtnPrimary: { borderWidth: 0 },
})

const localStyles = StyleSheet.create({
  publishCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  publishBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
  },
  publishBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trackCopy: { flex: 1, gap: 2, minWidth: 0 },
  trackMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 2, marginTop: 2 },
  deleteBtn: {
    marginTop: 16,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
})
