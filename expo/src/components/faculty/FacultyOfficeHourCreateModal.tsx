import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorStudent } from "../../lib/instructor-api"
import { FACULTY_OFFICE_HOURS_COLOR } from "../../lib/faculty-office-hours-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetSubmitButton,
  useSheetPlaceholderColor,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"

type Scope = { instructorId: number; courseId: number }
type Step = "student" | "details"

const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
]

type Props = {
  visible: boolean
  scope: Scope | null
  onClose: () => void
  onCreated: () => void
}

export function FacultyOfficeHourCreateModal({ visible, scope, onClose, onCreated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const sheetPlaceholder = useSheetPlaceholderColor()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<Step>("student")
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [topic, setTopic] = useState("")
  const [area, setArea] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [preferredDate, setPreferredDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible || !scope) return
    setLoadingStudents(true)
    void instructorApi
      .getStudents(scope)
      .then(setStudents)
      .finally(() => setLoadingStudents(false))
  }, [visible, scope])

  useEffect(() => {
    if (!visible) {
      setStep("student")
      setStudentSearch("")
      setSelectedId(null)
      setTopic("")
      setArea("")
      setDescription("")
      setPriority("medium")
      setPreferredDate("")
      setError("")
    }
  }, [visible])

  const filtered = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      [s.full_name, s.student_id, s.email, s.section].filter(Boolean).join(" ").toLowerCase().includes(q),
    )
  }, [students, studentSearch])

  const selected = students.find((s) => s.id === selectedId) ?? null

  function chooseStudent(student: InstructorStudent) {
    setSelectedId(student.id)
    setStudentSearch("")
    setError("")
    setStep("details")
  }

  function changeStudent() {
    setStep("student")
    setError("")
  }

  async function submit() {
    if (!scope || !selectedId) {
      setError("Select a student.")
      setStep("student")
      return
    }
    if (!topic.trim()) {
      setError("Topic is required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await instructorApi.createOfficeHourOnBehalf(scope, {
        studentId: selectedId,
        topic: topic.trim(),
        areaOfConcern: area.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        preferredDates: preferredDate.trim() ? [preferredDate.trim()] : undefined,
      })
      AppAlert.alert("Request created", `Office hours request added for ${selected?.full_name ?? "student"}.`)
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
        <FacultySheetChrome
          topInset={insets.top}
          title={step === "student" ? "Choose student" : "Request details"}
          subtitle={step === "details" && selected ? selected.full_name : undefined}
          onClose={onClose}
          accentColor={FACULTY_OFFICE_HOURS_COLOR.link}
        />

        {step === "student" ? (
          <ScrollView
            contentContainerStyle={[
              collabSheetStyles.scroll,
              { paddingTop: 8, gap: 12, paddingBottom: insets.bottom + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          >
            <FacultySheetNotice
              tone="warning"
              message="Search the roster first. After you pick a student you can add the request details."
            />
            <FacultySheetSection label="Roster" tone={SHEET_SECTION.roster}>
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="Search by name or student ID…"
                placeholderTextColor={sheetPlaceholder}
                autoCorrect={false}
                autoFocus
              />
              {loadingStudents ? (
                <ActivityIndicator color={FACULTY_OFFICE_HOURS_COLOR.link} style={{ marginVertical: 16 }} />
              ) : filtered.length === 0 ? (
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  {students.length === 0 ? "No students in this course." : "No matching students."}
                </Text>
              ) : (
                <View style={localStyles.studentList}>
                  {filtered.map((student) => {
                    const active = student.id === selectedId
                    return (
                      <Pressable
                        key={student.id}
                        style={[
                          localStyles.studentRow,
                          {
                            borderColor: active ? FACULTY_OFFICE_HOURS_COLOR.action : native.separator,
                            backgroundColor: active
                              ? hexToRgba(FACULTY_OFFICE_HOURS_COLOR.action, tokens.isDark ? 0.18 : 0.1)
                              : native.fill,
                          },
                        ]}
                        onPress={() => chooseStudent(student)}
                      >
                        <Text style={[type.bodyEmphasis, { color: native.label }]}>{student.full_name}</Text>
                        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                          {student.student_id}
                          {student.section ? ` · ${student.section}` : ""}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </FacultySheetSection>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[
              collabSheetStyles.scroll,
              { paddingTop: 8, gap: 14, paddingBottom: insets.bottom + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          >
            {selected ? (
              <Pressable
                style={[
                  localStyles.studentRow,
                  {
                    borderColor: FACULTY_OFFICE_HOURS_COLOR.action,
                    backgroundColor: hexToRgba(FACULTY_OFFICE_HOURS_COLOR.action, tokens.isDark ? 0.18 : 0.1),
                  },
                ]}
                onPress={changeStudent}
              >
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{selected.full_name}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  {[selected.student_id, selected.section].filter(Boolean).join(" · ")}
                  {" · "}
                  <Text style={{ color: FACULTY_OFFICE_HOURS_COLOR.link }}>Change student</Text>
                </Text>
              </Pressable>
            ) : null}

            <FacultySheetSection label="Request details" tone={SHEET_SECTION.edit}>
              <FacultySheetField label="Topic">
                <TextInput
                  style={collabSheetStyles.fieldInput}
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="What would they like to discuss?"
                  placeholderTextColor={sheetPlaceholder}
                />
              </FacultySheetField>
              <FacultySheetField label="Area of concern">
                <TextInput
                  style={collabSheetStyles.fieldInput}
                  value={area}
                  onChangeText={setArea}
                  placeholder="Optional"
                  placeholderTextColor={sheetPlaceholder}
                />
              </FacultySheetField>
              <FacultySheetField label="Description">
                <TextInput
                  style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder="Additional context for you"
                  placeholderTextColor={sheetPlaceholder}
                />
              </FacultySheetField>
              <FacultySheetField label="Preferred date">
                <FacultySummerCampDatePicker
                  value={preferredDate}
                  onChange={setPreferredDate}
                  accessibilityLabel="Preferred date"
                />
              </FacultySheetField>
              <View style={localStyles.priorityRow}>
                {PRIORITIES.map((p) => {
                  const active = priority === p.id
                  return (
                    <Pressable
                      key={p.id}
                      style={[
                        localStyles.priorityChip,
                        {
                          borderColor: active ? FACULTY_OFFICE_HOURS_COLOR.action : native.separator,
                          backgroundColor: active
                            ? hexToRgba(FACULTY_OFFICE_HOURS_COLOR.action, tokens.isDark ? 0.18 : 0.1)
                            : native.fill,
                        },
                      ]}
                      onPress={() => setPriority(p.id)}
                    >
                      <Text
                        style={[
                          type.caption,
                          { color: native.secondaryLabel, fontWeight: "700" },
                          active && { color: FACULTY_OFFICE_HOURS_COLOR.action },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </FacultySheetSection>

            {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

            <FacultySheetSubmitButton
              label={submitting ? "Creating…" : "Create request"}
              onPress={() => void submit()}
              disabled={submitting}
              loading={submitting}
            />
          </ScrollView>
        )}
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  studentList: { gap: 8 },
  studentRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  priorityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
