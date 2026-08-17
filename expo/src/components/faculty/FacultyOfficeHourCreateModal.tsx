import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
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
  FacultySheetSection
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"

type Scope = { instructorId: number; courseId: number }

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
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
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
    const list = q
      ? students.filter((s) =>
          [s.full_name, s.student_id, s.email, s.section].filter(Boolean).join(" ").toLowerCase().includes(q),
        )
      : students
    return list.slice(0, 30)
  }, [students, studentSearch])

  const selected = students.find((s) => s.id === selectedId)

  async function submit() {
    if (!scope || !selectedId) {
      setError("Select a student.")
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
        preferredDates: preferredDate.trim() ? [preferredDate.trim()] : undefined})
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
          title="New office hours request"
          onClose={onClose}
          accentColor={FACULTY_OFFICE_HOURS_COLOR.link}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetNotice
            tone="warning"
            message="Create a request on behalf of a student. They will see it in Course Info → Office Hours."
          />

          <FacultySheetSection label="Student" tone={SHEET_SECTION.roster}>
            <TextInput
              style={collabSheetStyles.fieldInput}
              value={studentSearch}
              onChangeText={setStudentSearch}
              placeholder="Search roster…"
            />
            {loadingStudents ? (
              <ActivityIndicator color={FACULTY_OFFICE_HOURS_COLOR.link} style={{ marginVertical: 12 }} />
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
                      onPress={() => setSelectedId(student.id)}
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

          <FacultySheetSection label="Request details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Topic">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={topic}
                onChangeText={setTopic}
                placeholder="What would they like to discuss?"
              />
            </FacultySheetField>
            <FacultySheetField label="Area of concern">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={area}
                onChangeText={setArea}
                placeholder="Optional"
              />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <TextInput
                style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Additional context for you"
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

          <Pressable
            style={[localStyles.submitBtn, { backgroundColor: FACULTY_OFFICE_HOURS_COLOR.action }]}
            disabled={submitting}
            onPress={() => void submit()}
          >
            {submitting ? (
              <ActivityIndicator color={FACULTY_OFFICE_HOURS_COLOR.actionInk} />
            ) : (
              <Text style={localStyles.submitText}>Create request</Text>
            )}
          </Pressable>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  studentList: { gap: 8, maxHeight: 200 },
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
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
})