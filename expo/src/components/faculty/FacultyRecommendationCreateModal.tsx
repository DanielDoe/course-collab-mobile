import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorSession, type InstructorStudent } from "../../lib/instructor-api"
import {
  RECOMMENDATION_PURPOSES,
  formatRecommendationDeadlineShort,
  recommendationPurposeLabel,
  recommendationPurposeShort} from "../../lib/faculty-recommendations-utils"
import { FACULTY_RECOMMENDATIONS_COLOR } from "../../lib/faculty-recommendations-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyFilterSheet } from "./faculty-module-shell"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  sessions: InstructorSession[]
  onClose: () => void
  onCreated: () => void
}

function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export function FacultyRecommendationCreateModal({
  visible,
  scope,
  sessions,
  onClose,
  onCreated}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [purpose, setPurpose] = useState("scholarship")
  const [deadline, setDeadline] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const sessionOptions = useMemo(
    () =>
      sessions
        .filter((s) => s.code?.toUpperCase() !== "BETA")
        .map((s) => ({ value: String(s.id), label: s.description?.trim() || s.code })),
    [sessions],
  )

  const selectedSession = sessions.find((s) => s.id === sessionId)
  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  useEffect(() => {
    if (!visible || !scope) return
    setLoadingStudents(true)
    void instructorApi
      .getStudents(scope)
      .then(setStudents)
      .finally(() => setLoadingStudents(false))
    setSessionId(sessions.find((s) => s.code?.toUpperCase() !== "BETA")?.id ?? null)
  }, [visible, scope, sessions])

  useEffect(() => {
    if (!visible) {
      setStudentSearch("")
      setSelectedStudentId(null)
      setPurpose("scholarship")
      setDeadline("")
      setDescription("")
      setError("")
    }
  }, [visible])

  const filtered = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    const list = q
      ? students.filter((s) =>
          [s.full_name, s.student_id, s.email, s.section].filter(Boolean).join(" ").toLowerCase().includes(q),
        )
      : students
    return list.slice(0, 30)
  }, [students, studentSearch])

  async function submit() {
    if (!scope || !selectedStudentId || !sessionId) {
      setError("Select a student and course section.")
      return
    }
    if (!deadline.trim()) {
      setError("Deadline is required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await instructorApi.createRecommendationOnBehalf(scope, {
        studentId: selectedStudentId,
        courseId: sessionId,
        instructorId: scope.instructorId,
        purpose,
        deadline: deadline.trim() || undefined,
        studentRequestDescription: description.trim() || undefined})
      AppAlert.alert(
        "Letter request created",
        `Recommendation request started for ${selectedStudent?.full_name ?? "student"}. Open it from your queue to review and approve.`,
      )
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="New letter request" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {selectedStudent ? (
            <FacultySheetHero
              title={selectedStudent.full_name}
              subtitle={[selectedStudent.student_id, selectedStudent.section].filter(Boolean).join(" · ")}
              initials={studentInitials(selectedStudent.full_name)}
              pills={
                <>
                  <FacultyStatusPill label={recommendationPurposeLabel(purpose)} tone="live" />
                  {selectedSession?.code ? (
                    <FacultyStatusPill label={selectedSession.code} tone="neutral" />
                  ) : null}
                </>
              }
            />
          ) : (
            <FacultySheetHero
              title="Recommendation letter"
              subtitle="Start a request on behalf of a student"
              icon="document-text-outline"
            />
          )}

          <FacultySheetNotice message="Creates a recommendation request in your queue. You can approve, edit, and release the letter from the workspace." />

          {selectedStudent && selectedSession ? (
            <FacultySheetStatRow>
              <FacultySheetStatChip icon="school-outline" label="Section" value={selectedSession.code} tone="sky" />
              <FacultySheetStatChip icon="flag-outline" label="Purpose" value={recommendationPurposeShort(purpose)} tone="violet" />
              <FacultySheetStatChip
                icon="calendar-outline"
                label="Deadline"
                value={deadline.trim() ? formatRecommendationDeadlineShort(deadline.trim()) : "None"}
                tone="amber"
              />
            </FacultySheetStatRow>
          ) : null}

          <FacultySheetSection label="Student" hint="Search your roster and tap to select">
            <TextInput
              style={collabSheetStyles.fieldInput}
              value={studentSearch}
              onChangeText={setStudentSearch}
              placeholder="Search by name, ID, or email…"
            />
            {loadingStudents ? (
              <ActivityIndicator color={FACULTY_RECOMMENDATIONS_COLOR.action} style={{ marginVertical: 12 }} />
            ) : filtered.length === 0 ? (
              <Text style={collabSheetStyles.emptyText}>No students match your search.</Text>
            ) : (
              <View style={collabSheetStyles.memberList}>
                {filtered.map((student) => {
                  const active = student.id === selectedStudentId
                  return (
                    <Pressable
                      key={student.id}
                      style={[
                        collabSheetStyles.memberRow,
                        active && styles.memberRowActive,
                      ]}
                      onPress={() => {
                        setSelectedStudentId(student.id)
                        const match = sessions.find(
                          (s) => s.code === student.session_code || s.code === student.section,
                        )
                        if (match) setSessionId(match.id)
                      }}
                    >
                      <View style={collabSheetStyles.memberAvatar}>
                        <Text style={collabSheetStyles.memberAvatarText}>
                          {studentInitials(student.full_name)}
                        </Text>
                      </View>
                      <View style={collabSheetStyles.memberCopy}>
                        <View style={collabSheetStyles.memberNameRow}>
                          <Text style={collabSheetStyles.memberName}>{student.full_name}</Text>
                          {active ? <FacultyStatusPill label="Selected" tone="success" /> : null}
                        </View>
                        <Text style={collabSheetStyles.memberId}>
                          {student.student_id}
                          {student.section ? ` · ${student.section}` : ""}
                        </Text>
                      </View>
                      <Ionicons
                        name={active ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={active ? FACULTY_RECOMMENDATIONS_COLOR.action : "#cbd5e1"}
                      />
                    </Pressable>
                  )
                })}
              </View>
            )}
          </FacultySheetSection>

          <FacultySheetSection label="Letter details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Course section">
              <Pressable
                style={[
                  styles.picker,
                  {
                    borderColor: native.separator,
                    backgroundColor: native.fill,
                  },
                ]}
                onPress={() => setSessionSheetOpen(true)}
              >
                <Text style={[styles.pickerText, { color: native.label }]}>
                  {selectedSession?.description?.trim() || selectedSession?.code || "Select section"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={native.secondaryLabel} />
              </Pressable>
            </FacultySheetField>

            <FacultySheetField label="Purpose">
              <View style={styles.purposeGrid}>
                {RECOMMENDATION_PURPOSES.map((p) => {
                  const active = purpose === p.id
                  return (
                    <Pressable
                      key={p.id}
                      style={[
                        styles.purposeChip,
                        {
                          borderColor: active ? FACULTY_RECOMMENDATIONS_COLOR.action : native.separator,
                          backgroundColor: active
                            ? hexToRgba(FACULTY_RECOMMENDATIONS_COLOR.action, tokens.isDark ? 0.18 : 0.1)
                            : native.fill,
                        },
                      ]}
                      onPress={() => setPurpose(p.id)}
                    >
                      <Text
                        style={[
                          styles.purposeText,
                          { color: native.secondaryLabel },
                          active && { color: FACULTY_RECOMMENDATIONS_COLOR.action },
                        ]}
                      >{p.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </FacultySheetField>

            <FacultySheetField label="Deadline">
              <FacultySummerCampDatePicker
                value={deadline}
                onChange={setDeadline}
                accessibilityLabel="Deadline"
              />
            </FacultySheetField>

            <FacultySheetField label="Student context">
              <TextInput
                style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Programs, deadlines, or background for the letter"
              />
            </FacultySheetField>
          </FacultySheetSection>

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetActionRow
            icon="add-circle-outline"
            label="Create request"
            subtitle={
              selectedStudent
                ? `For ${selectedStudent.full_name} · ${recommendationPurposeLabel(purpose)}`
                : "Select a student first"
            }
            tone="primary"
            loading={submitting}
            disabled={!selectedStudentId || !sessionId || submitting}
            onPress={() => void submit()}
          />
        </ScrollView>

        <FacultyFilterSheet
          visible={sessionSheetOpen}
          title="Course section"
          subtitle="Which course section is this letter for?"
          options={sessionOptions}
          value={sessionId != null ? String(sessionId) : ""}
          onSelect={(v) => setSessionId(Number(v))}
          onClose={() => setSessionSheetOpen(false)}
        />
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  memberRowActive: {
    borderColor: FACULTY_RECOMMENDATIONS_COLOR.action,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: { flex: 1, fontSize: 15, fontWeight: "600", paddingRight: 8 },
  purposeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  purposeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  purposeText: { fontSize: 12, fontWeight: "700" },
})