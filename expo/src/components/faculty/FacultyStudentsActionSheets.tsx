import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  formatFacultyRelativeTime,
  type InstructorAccountRequest,
  type InstructorPasswordResetRequest,
} from "../../lib/instructor-api"
import {
  accountRequestKindLabel,
  directoryRequestIsPending,
  studentInitials,
} from "../../lib/faculty-students-utils"
import {
  FACULTY_STUDENTS_COLOR,
  facultyStudentAccountRequestThumb,
  facultyStudentDirectoryStatus,
  facultyStudentResetThumb,
} from "../../lib/faculty-students-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetWorkflow,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

type ResetSheetProps = {
  visible: boolean
  row: InstructorPasswordResetRequest | null
  acting: boolean
  onClose: () => void
  onApprove: () => void
  onReject: (reason?: string) => void
}

type RequestSheetProps = {
  visible: boolean
  row: InstructorAccountRequest | null
  acting: boolean
  onClose: () => void
  onApprove: () => void
  onReject: (reason?: string) => void
}

function formatSheetWhen(value?: string | null): string {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return value
  }
}

function FacultySheetRejectOverlay({
  visible,
  title,
  body,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean
  title: string
  body: string
  submitting: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (visible) setReason("")
  }, [visible])

  if (!visible) return null

  return (
    <View
      style={[
        rejectOverlayStyles.wrap,
        { backgroundColor: tokens.isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.45)" },
      ]}
    >
      <View
        style={[
          rejectOverlayStyles.card,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: native.separator,
          },
        ]}
      >
        <Text style={[type.sheetTitle, { color: native.label }]}>{title}</Text>
        <Text style={[type.secondary, rejectOverlayStyles.body, { color: native.secondaryLabel }]}>{body}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (optional)"
          placeholderTextColor={native.tertiaryLabel}
          multiline
          editable={!submitting}
          accessibilityLabel="Reason (optional)"
          style={[
            localStyles.rejectInput,
            {
              color: native.label,
              borderColor: native.separator,
              backgroundColor: native.groupedBackground,
            },
          ]}
        />
        <View style={localStyles.rejectActions}>
          <Pressable
            style={({ pressed }) => [
              localStyles.rejectBtn,
              { borderColor: native.separator, opacity: pressed || submitting ? 0.8 : 1 },
            ]}
            disabled={submitting}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              localStyles.rejectBtn,
              localStyles.rejectBtnPrimary,
              {
                backgroundColor: FACULTY_STUDENTS_COLOR.danger,
                opacity: pressed || submitting ? 0.85 : 1,
              },
            ]}
            disabled={submitting}
            onPress={() => onSubmit(reason.trim())}
            accessibilityRole="button"
            accessibilityLabel="Decline"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[type.caption, { color: "#fff", fontWeight: "700" }]}>Decline</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  )
}

export function FacultyPasswordResetActionSheet({
  visible,
  row,
  acting,
  onClose,
  onApprove,
  onReject,
}: ResetSheetProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  useEffect(() => {
    if (!visible) {
      setConfirmApprove(false)
      setRejectOpen(false)
    }
  }, [visible])

  const pending = row ? directoryRequestIsPending(row.status) : false
  const statusMeta = row ? facultyStudentDirectoryStatus(row.status) : null
  const thumb = useMemo(() => (row ? facultyStudentResetThumb(row.id) : null), [row])

  if (!row || !thumb) return null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Password reset"
          onClose={onClose}
          accentColor={FACULTY_STUDENTS_COLOR.link}
        />

        <View style={sheetBodyStyles.body}>
          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
          <FacultySheetHero
            title={row.full_name}
            subtitle={row.email ?? row.student_number ?? "Student account"}
            initials={studentInitials(row.full_name)}
            thumbColor={thumb.fill}
            pills={
              <>
                {row.section ? <FacultyStatusPill label={row.section} tone="neutral" /> : null}
                {statusMeta ? (
                  <FacultyStatusPill label={statusMeta.label} tone={pending ? "warning" : "live"} />
                ) : null}
                {row.is_platform_guest ? <FacultyStatusPill label="Platform guest" tone="live" /> : null}
              </>
            }
          />

          <FacultySheetSection label="Request details" tone={SHEET_SECTION.roster}>
            <FacultySheetGroupedList>
              {row.student_number ? (
                <FacultySheetMetricRow icon="id-card-outline" label="Student number" value={row.student_number} />
              ) : null}
              {row.email ? (
                <FacultySheetMetricRow icon="mail-outline" label="Email" value={row.email} />
              ) : null}
              <FacultySheetMetricRow
                icon="time-outline"
                label="Requested"
                value={`${formatSheetWhen(row.requested_at)} · ${formatFacultyRelativeTime(row.requested_at)}`}
              />
              {row.reviewed_at ? (
                <FacultySheetMetricRow
                  icon="checkmark-done-outline"
                  label="Reviewed"
                  value={formatSheetWhen(row.reviewed_at)}
                  isLast={!row.admin_notes}
                />
              ) : null}
              {row.admin_notes ? (
                <FacultySheetMetricRow icon="document-text-outline" label="Notes" value={row.admin_notes} isLast />
              ) : null}
            </FacultySheetGroupedList>
          </FacultySheetSection>

          {pending ? (
            <FacultySheetSection label="Your decision" tone={SHEET_SECTION.workflow}>
              <FacultySheetWorkflow
                title="Pending review"
                body="Approving issues a temporary password for the student's next sign-in. They must change it after logging in."
                acting={acting}
                approveLabel="Approve reset"
                rejectLabel="Decline"
                onApprove={() => setConfirmApprove(true)}
                onReject={() => setRejectOpen(true)}
              />
            </FacultySheetSection>
          ) : null}
          </ScrollView>

          {confirmApprove ? (
            <FacultySheetConfirm
              title="Approve password reset?"
              body={`${row.full_name} will receive a temporary password for their next sign-in.`}
              confirmLabel="Approve"
              danger={false}
              onCancel={() => setConfirmApprove(false)}
              onConfirm={() => {
                setConfirmApprove(false)
                onApprove()
              }}
            />
          ) : null}

          <FacultySheetRejectOverlay
            visible={rejectOpen}
            title="Decline password reset?"
            body="The student will need to submit a new request if they still cannot sign in."
            submitting={acting}
            onClose={() => setRejectOpen(false)}
            onSubmit={(reason) => {
              setRejectOpen(false)
              onReject(reason || undefined)
            }}
          />
        </View>
      </FacultySheetContainer>
    </Modal>
  )
}

export function FacultyAccountRequestActionSheet({
  visible,
  row,
  acting,
  onClose,
  onApprove,
  onReject,
}: RequestSheetProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  useEffect(() => {
    if (!visible) {
      setConfirmApprove(false)
      setRejectOpen(false)
    }
  }, [visible])

  const pending = row ? directoryRequestIsPending(row.status) : false
  const statusMeta = row ? facultyStudentDirectoryStatus(row.status) : null
  const thumb = useMemo(() => (row ? facultyStudentAccountRequestThumb(row.id) : null), [row])
  const kindLabel = row ? accountRequestKindLabel(row.request_kind) : "Account request"

  if (!row || !thumb) return null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title={kindLabel}
          onClose={onClose}
          accentColor={FACULTY_STUDENTS_COLOR.link}
        />

        <View style={sheetBodyStyles.body}>
          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
          <FacultySheetHero
            title={row.full_name}
            subtitle={row.email ?? row.student_id}
            initials={studentInitials(row.full_name)}
            thumbColor={thumb.fill}
            pills={
              <>
                <FacultyStatusPill label={kindLabel} tone="live" />
                {row.section ? <FacultyStatusPill label={row.section} tone="neutral" /> : null}
                {row.guest_purpose ? (
                  <FacultyStatusPill label={row.guest_purpose.replace(/_/g, " ")} tone="neutral" />
                ) : null}
                {statusMeta ? (
                  <FacultyStatusPill label={statusMeta.label} tone={pending ? "warning" : "live"} />
                ) : null}
              </>
            }
          />

          <FacultySheetSection label="Request details" tone={SHEET_SECTION.roster}>
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="person-outline" label="Student ID" value={row.student_id} />
              {row.email ? <FacultySheetMetricRow icon="mail-outline" label="Email" value={row.email} /> : null}
              {row.organization ? (
                <FacultySheetMetricRow icon="business-outline" label="Organization" value={row.organization} />
              ) : null}
              <FacultySheetMetricRow
                icon="calendar-outline"
                label="Submitted"
                value={`${formatSheetWhen(row.created_at)} · ${formatFacultyRelativeTime(row.created_at)}`}
                isLast={!row.guest_purpose_detail}
              />
              {row.guest_purpose_detail ? (
                <FacultySheetMetricRow
                  icon="chatbox-ellipses-outline"
                  label="Purpose detail"
                  value={row.guest_purpose_detail}
                  isLast
                />
              ) : null}
            </FacultySheetGroupedList>
          </FacultySheetSection>

            {pending ? (
              <FacultySheetSection label="Your decision" tone={SHEET_SECTION.workflow}>
                <FacultySheetWorkflow
                  title="Pending review"
                  body={
                    row.request_kind === "guest"
                      ? "Approving creates or links a guest account so they can access course materials."
                      : "Approving enrolls this student in the course roster."
                  }
                  acting={acting}
                  approveLabel="Approve request"
                  rejectLabel="Decline"
                  onApprove={() => setConfirmApprove(true)}
                  onReject={() => setRejectOpen(true)}
                />
              </FacultySheetSection>
            ) : (
              <FacultySheetSection label="Decision" tone={SHEET_SECTION.workflow}>
                <FacultySheetGroupedList>
                  <FacultySheetMetricRow
                    icon="information-circle-outline"
                    label="Status"
                    value={statusMeta?.label ?? row.status}
                    isLast
                  />
                </FacultySheetGroupedList>
              </FacultySheetSection>
            )}
          </ScrollView>

          {confirmApprove ? (
            <FacultySheetConfirm
              title="Approve account request?"
              body={`${row.full_name} will gain access according to the ${kindLabel.toLowerCase()} workflow.`}
              confirmLabel="Approve"
              danger={false}
              onCancel={() => setConfirmApprove(false)}
              onConfirm={() => {
                setConfirmApprove(false)
                onApprove()
              }}
            />
          ) : null}

          <FacultySheetRejectOverlay
            visible={rejectOpen}
            title="Decline account request?"
            body="They will not gain access unless they submit a new request."
            submitting={acting}
            onClose={() => setRejectOpen(false)}
            onSubmit={(reason) => {
              setRejectOpen(false)
              onReject(reason || undefined)
            }}
          />
        </View>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
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
    minHeight: 44,
  },
  rejectBtnPrimary: { borderWidth: 0 },
})

const rejectOverlayStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  body: { lineHeight: 20 },
})

const sheetBodyStyles = StyleSheet.create({
  body: { flex: 1, position: "relative" },
})
