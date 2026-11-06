import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Clipboard from "expo-clipboard"
import { ApiError } from "../../lib/api"
import { API_BASE_URL } from "../../constants"
import { instructorApi, type InstructorSession } from "../../lib/instructor-api"
import {
  formatCourseDefaultPasswordHint,
  getStudentRosterDefaultPassword,
} from "../../lib/roster-password"
import { FACULTY_BRAND } from "../../constants/faculty-theme"
import { BRAND } from "../../constants"
import { FacultyFilterSheet } from "./faculty-module-shell"
import {
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSection,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { useAppToast } from "../../context/AppToastProvider"

type Scope = { instructorId: number; courseId: number }
type AddMode = "roster" | "invitation"

type Props = {
  visible: boolean
  scope: Scope | null
  courseCode?: string
  courseTitle?: string
  sessions: InstructorSession[]
  defaultSessionCode?: string
  onClose: () => void
  onAdded: () => void
}

export function FacultyAddStudentModal({
  visible,
  scope,
  courseCode,
  courseTitle,
  sessions,
  defaultSessionCode,
  onClose,
  onAdded,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const { showSuccess, showInfo } = useAppToast()
  const [mode, setMode] = useState<AddMode>("roster")
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [approvalBehavior, setApprovalBehavior] = useState<"require_faculty_approval" | "auto_approve_verified_invite">(
    "require_faculty_approval",
  )
  const [expiresInHours, setExpiresInHours] = useState("168")
  const [maxUses, setMaxUses] = useState("1")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [invitationToken, setInvitationToken] = useState("")
  const [invitationLink, setInvitationLink] = useState("")

  const sessionOptions = useMemo(
    () =>
      sessions
        .filter((s) => s.code?.toUpperCase() !== "BETA")
        .map((s) => ({
          value: String(s.id),
          label: s.description?.trim() || s.code,
        })),
    [sessions],
  )

  const selectedSession = sessions.find((s) => s.id === sessionId)
  const defaultPassword = getStudentRosterDefaultPassword(courseCode)

  useEffect(() => {
    if (!visible) {
      setMode("roster")
      setStudentId("")
      setFullName("")
      setEmail("")
      setApprovalBehavior("require_faculty_approval")
      setExpiresInHours("168")
      setMaxUses("1")
      setError("")
      setSuccessMessage("")
      setInvitationToken("")
      setInvitationLink("")
      return
    }
    const match = sessions.find((s) => s.code === defaultSessionCode)
    setSessionId(match?.id ?? sessions.find((s) => s.code?.toUpperCase() !== "BETA")?.id ?? null)
  }, [visible, sessions, defaultSessionCode])

  async function submitRoster() {
    if (!scope || !sessionId) {
      setError("Select a section.")
      return
    }
    if (!studentId.trim() || !fullName.trim()) {
      setError("Student ID and full name are required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await instructorApi.importStudents(scope, {
        session_id: sessionId,
        session_code: selectedSession?.code,
        rows: [
          {
            student_id: studentId.trim(),
            full_name: fullName.trim(),
            email: email.trim() || undefined,
          },
        ],
      })
      const { added, updated, skipped } = res.summary
      const detail =
        added > 0
          ? `${fullName.trim()} was added to ${selectedSession?.code ?? "the section"}. They can sign in with the course default password shown above.`
          : updated > 0
            ? `${fullName.trim()} was updated in the roster.`
            : skipped > 0
              ? "This student could not be imported. Check the ID and try again."
              : "Import completed."
      setSuccessMessage(detail)
      if (added > 0 || updated > 0) showSuccess(added > 0 ? "Student added" : "Roster updated")
      onAdded()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add student.")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitInvitation() {
    if (!scope || !sessionId) {
      setError("Select a section.")
      return
    }
    const hours = Number(expiresInHours)
    const uses = Number(maxUses)
    if (!Number.isFinite(hours) || hours < 1) {
      setError("Expiration must be at least 1 hour.")
      return
    }
    if (!Number.isFinite(uses) || uses < 1) {
      setError("Use limit must be at least 1.")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const res = await instructorApi.createAccessInvitation(scope, {
        allowedAccountType: "student",
        scopeType: "section",
        sessionId,
        approvalBehavior,
        expiresInHours: hours,
        maxUses: uses,
      })
      const base = API_BASE_URL.replace(/\/$/, "")
      const link = `${base}/student/login?invite=${encodeURIComponent(res.token)}`
      setInvitationToken(res.token)
      setInvitationLink(link)
      const detail =
        approvalBehavior === "auto_approve_verified_invite"
          ? "Invitation created. Students who verify email through this link can join without a separate faculty approval step."
          : "Invitation created. Students must verify email, then you approve their access request."
      setSuccessMessage(detail)
      showSuccess("Invitation created")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create invitation.")
    } finally {
      setSubmitting(false)
    }
  }

  async function copyInvitationLink() {
    if (!invitationLink) return
    await Clipboard.setStringAsync(invitationLink)
    showInfo("Invitation link copied")
  }

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose}>
      <FacultySheetChrome topInset={insets.top} title="Add student" onClose={onClose} />

      <ScrollView
        contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={localStyles.modeRow}>
          <Pressable
            style={[localStyles.modeBtn, mode === "roster" && localStyles.modeBtnActive]}
            onPress={() => setMode("roster")}
          >
            <Text style={[localStyles.modeBtnText, mode === "roster" && localStyles.modeBtnTextActive]}>
              Add to roster
            </Text>
          </Pressable>
          <Pressable
            style={[localStyles.modeBtn, mode === "invitation" && localStyles.modeBtnActive]}
            onPress={() => setMode("invitation")}
          >
            <Text style={[localStyles.modeBtnText, mode === "invitation" && localStyles.modeBtnTextActive]}>
              Invitation link
            </Text>
          </Pressable>
        </View>

        {mode === "roster" ? (
          <FacultySheetNotice
            tone="warning"
            message={`New students receive the default password for ${formatCourseDefaultPasswordHint(courseCode, courseTitle)} (${defaultPassword}). They can change it after signing in.`}
          />
        ) : (
          <FacultySheetNotice
            tone="warning"
            message="Create a secure, scoped invitation for student self-registration. The link only works for the selected section and account type."
          />
        )}

        <FacultySheetSection label="Section" tone={SHEET_SECTION.edit}>
          <FacultySheetField label="Section">
            <Pressable style={localStyles.picker} onPress={() => setSessionSheetOpen(true)}>
              <Text style={localStyles.pickerText}>
                {selectedSession?.description?.trim() || selectedSession?.code || "Select section"}
              </Text>
            </Pressable>
          </FacultySheetField>
        </FacultySheetSection>

        {mode === "roster" ? (
          <FacultySheetSection label="Student" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Student ID">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={studentId}
                onChangeText={setStudentId}
                placeholder="PVAMU ID"
                autoCapitalize="characters"
              />
            </FacultySheetField>
            <FacultySheetField label="Full name">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="First Last"
              />
            </FacultySheetField>
            <FacultySheetField label="Email (optional)">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="student@pvamu.edu"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </FacultySheetField>
          </FacultySheetSection>
        ) : (
          <FacultySheetSection label="Invitation settings" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Approval behavior">
              <View style={localStyles.modeRow}>
                <Pressable
                  style={[
                    localStyles.modeBtn,
                    approvalBehavior === "require_faculty_approval" && localStyles.modeBtnActive,
                  ]}
                  onPress={() => setApprovalBehavior("require_faculty_approval")}
                >
                  <Text
                    style={[
                      localStyles.modeBtnText,
                      approvalBehavior === "require_faculty_approval" && localStyles.modeBtnTextActive,
                    ]}
                  >
                    Require approval
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    localStyles.modeBtn,
                    approvalBehavior === "auto_approve_verified_invite" && localStyles.modeBtnActive,
                  ]}
                  onPress={() => setApprovalBehavior("auto_approve_verified_invite")}
                >
                  <Text
                    style={[
                      localStyles.modeBtnText,
                      approvalBehavior === "auto_approve_verified_invite" && localStyles.modeBtnTextActive,
                    ]}
                  >
                    Auto after verify
                  </Text>
                </Pressable>
              </View>
            </FacultySheetField>
            <FacultySheetField label="Expires in hours">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={expiresInHours}
                onChangeText={setExpiresInHours}
                keyboardType="number-pad"
                placeholder="168"
              />
            </FacultySheetField>
            <FacultySheetField label="Max uses">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={maxUses}
                onChangeText={setMaxUses}
                keyboardType="number-pad"
                placeholder="1"
              />
            </FacultySheetField>
          </FacultySheetSection>
        )}

        {invitationLink ? (
          <FacultySheetSection label="Share invitation" tone={SHEET_SECTION.roster}>
            <Text selectable style={collabSheetStyles.bodyText}>
              {invitationLink}
            </Text>
            <Pressable style={localStyles.secondaryBtn} onPress={() => void copyInvitationLink()}>
              <Text style={localStyles.secondaryBtnText}>Copy link</Text>
            </Pressable>
            {invitationToken ? (
              <Text selectable style={[collabSheetStyles.bodyText, { marginTop: 8 }]}>
                Token: {invitationToken}
              </Text>
            ) : null}
          </FacultySheetSection>
        ) : null}

        {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}
        {successMessage ? <Text style={collabSheetStyles.bodyText}>{successMessage}</Text> : null}

        {successMessage ? (
          <Pressable style={localStyles.submitBtn} onPress={onClose}>
            <Text style={localStyles.submitText}>Done</Text>
          </Pressable>
        ) : (
          <Pressable
            style={localStyles.submitBtn}
            disabled={submitting}
            onPress={() => void (mode === "roster" ? submitRoster() : submitInvitation())}
          >
            {submitting ? (
              <ActivityIndicator color={BRAND.white} />
            ) : (
              <Text style={localStyles.submitText}>
                {mode === "roster" ? "Add to roster" : "Create invitation"}
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>

      <FacultyFilterSheet
        visible={sessionSheetOpen}
        title="Section"
        subtitle="Which section should this student join?"
        options={sessionOptions}
        value={sessionId != null ? String(sessionId) : ""}
        onSelect={(v) => setSessionId(Number(v))}
        onClose={() => setSessionSheetOpen(false)}
      />
    </FacultySheetModal>
  )
}

const localStyles = StyleSheet.create({
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: BRAND.white,
  },
  modeBtnActive: {
    backgroundColor: FACULTY_BRAND.accent,
    borderColor: FACULTY_BRAND.accent,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: FACULTY_BRAND.ink,
    textAlign: "center",
  },
  modeBtnTextActive: {
    color: BRAND.white,
  },
  picker: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: BRAND.white,
  },
  pickerText: { fontSize: 15, fontWeight: "600", color: FACULTY_BRAND.ink },
  submitBtn: {
    backgroundColor: FACULTY_BRAND.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: BRAND.white, fontWeight: "600", fontSize: 16 },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: BRAND.white,
  },
  secondaryBtnText: {
    color: FACULTY_BRAND.accent,
    fontWeight: "600",
  },
})
