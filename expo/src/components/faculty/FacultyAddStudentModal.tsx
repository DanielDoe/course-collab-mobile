import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorSession } from "../../lib/instructor-api"
import {
  formatCourseDefaultPasswordHint,
  getStudentRosterDefaultPassword} from "../../lib/roster-password"
import { FACULTY_BRAND } from "../../constants/faculty-theme"
import { BRAND } from "../../constants"
import { FacultyFilterSheet } from "./faculty-module-shell"
import {
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSection
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

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
  onAdded}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const sessionOptions = useMemo(
    () =>
      sessions
        .filter((s) => s.code?.toUpperCase() !== "BETA")
        .map((s) => ({
          value: String(s.id),
          label: s.description?.trim() || s.code})),
    [sessions],
  )

  const selectedSession = sessions.find((s) => s.id === sessionId)
  const defaultPassword = getStudentRosterDefaultPassword(courseCode)

  useEffect(() => {
    if (!visible) {
      setStudentId("")
      setFullName("")
      setEmail("")
      setError("")
      setSuccessMessage("")
      return
    }
    const match = sessions.find((s) => s.code === defaultSessionCode)
    setSessionId(match?.id ?? sessions.find((s) => s.code?.toUpperCase() !== "BETA")?.id ?? null)
  }, [visible, sessions, defaultSessionCode])

  async function submit() {
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
            email: email.trim() || undefined},
        ]})
      const { added, updated, skipped } = res.summary
      setSuccessMessage(
        added > 0
          ? `${fullName.trim()} was added to ${selectedSession?.code ?? "the section"}. They can sign in with the course default password shown above.`
          : updated > 0
            ? `${fullName.trim()} was updated in the roster.`
            : skipped > 0
              ? "This student could not be imported. Check the ID and try again."
              : "Import completed.",
      )
      onAdded()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add student.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose}>
      <FacultySheetChrome topInset={insets.top} title="Add student" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetNotice
            tone="warning"
            message={`New students receive the default password for ${formatCourseDefaultPasswordHint(courseCode, courseTitle)} (${defaultPassword}). They can change it after signing in.`}
          />

          <FacultySheetSection label="Enrollment" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Section">
              <Pressable style={localStyles.picker} onPress={() => setSessionSheetOpen(true)}>
                <Text style={localStyles.pickerText}>
                  {selectedSession?.description?.trim() || selectedSession?.code || "Select section"}
                </Text>
              </Pressable>
            </FacultySheetField>
            <FacultySheetField label="Student ID">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={studentId}
                onChangeText={setStudentId}
                onEndEditing={(e) => setStudentId(e.nativeEvent.text ?? "")}
                placeholder="PVAMU ID"
                accessibilityLabel="Student ID"
                autoCapitalize="characters"
              />
            </FacultySheetField>
            <FacultySheetField label="Full name">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                onEndEditing={(e) => setFullName(e.nativeEvent.text ?? "")}
                placeholder="First Last"
                accessibilityLabel="Full name"
              />
            </FacultySheetField>
            <FacultySheetField label="Email (optional)">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={email}
                onChangeText={setEmail}
                onEndEditing={(e) => setEmail(e.nativeEvent.text ?? "")}
                placeholder="student@pvamu.edu"
                accessibilityLabel="Email"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </FacultySheetField>
          </FacultySheetSection>

          {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}
          {successMessage ? <Text style={collabSheetStyles.bodyText}>{successMessage}</Text> : null}

          {successMessage ? (
            <Pressable
              style={localStyles.submitBtn}
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={onClose}
            >
              <Text style={localStyles.submitText}>Done</Text>
            </Pressable>
          ) : (
            <Pressable style={localStyles.submitBtn} disabled={submitting} accessibilityRole="button" accessibilityLabel="Add to roster" onPress={() => void submit()}>
              {submitting ? (
                <ActivityIndicator color={BRAND.white} />
              ) : (
                <Text style={localStyles.submitText}>Add to roster</Text>
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
  picker: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: BRAND.white},
  pickerText: { fontSize: 15, fontWeight: "600", color: FACULTY_BRAND.ink },
  submitBtn: {
    backgroundColor: FACULTY_BRAND.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"},
  submitText: { color: BRAND.white, fontWeight: "600", fontSize: 16 }})