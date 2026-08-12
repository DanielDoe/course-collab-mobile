import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import type { InstructorStudent } from "../../lib/instructor-api"
import { instructorApi } from "../../lib/instructor-api"
import { MANUAL_AWARD_CATEGORIES } from "../../lib/faculty-classroom-points-utils"
import { FACULTY_CLASSROOM_POINTS_COLOR } from "../../lib/faculty-classroom-points-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { semanticSoft } from "../../lib/themed-module-theme"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetSection,
  FacultySheetSubmitButton,
  FacultySheetTextInput,
  FACULTY_SHEET_CHIP_RADIUS,
} from "./faculty-collab-sheet-ui"
import { SHEET_CLASSROOM_POINTS } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  defaultSession?: string
  initialStudentId?: number | null
  onClose: () => void
  onAwarded: () => void
}

export function FacultyManualAwardModal({
  visible,
  scope,
  defaultSession,
  initialStudentId = null,
  onClose,
  onAwarded,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [points, setPoints] = useState("1")
  const [reason, setReason] = useState("")
  const [category, setCategory] = useState<string>(MANUAL_AWARD_CATEGORIES[0].value)
  const [session, setSession] = useState(defaultSession ?? "")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!visible || !scope) return
    setLoadingStudents(true)
    void instructorApi
      .getStudents(scope)
      .then(setStudents)
      .finally(() => setLoadingStudents(false))
  }, [visible, scope])

  useEffect(() => {
    if (defaultSession) setSession(defaultSession)
  }, [defaultSession, visible])

  useEffect(() => {
    if (!visible) return
    if (initialStudentId != null) setSelectedId(initialStudentId)
  }, [visible, initialStudentId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students.slice(0, 40)
    return students
      .filter((s) =>
        [s.full_name, s.student_id, s.section, s.session_code].filter(Boolean).join(" ").toLowerCase().includes(q),
      )
      .slice(0, 40)
  }, [students, search])

  const selected = students.find((s) => s.id === selectedId)

  async function handleSubmit() {
    if (!scope || !selectedId || !selected) return
    const pts = Number(points)
    if (!Number.isFinite(pts) || pts <= 0) {
      AppAlert.alert("Invalid points", "Enter a positive number.")
      return
    }
    if (!reason.trim()) {
      AppAlert.alert("Reason required", "Describe why points are being awarded.")
      return
    }
    const section = session.trim() || selected.section || selected.session_code || "ALL"
    setSubmitting(true)
    try {
      await instructorApi.awardClassroomPointsManual(scope, {
        studentId: selectedId,
        points: pts,
        reason: reason.trim(),
        category,
        session: section,
      })
      AppAlert.alert("Awarded", `${pts} points added for ${selected.full_name}.`)
      setReason("")
      setPoints("1")
      setSelectedId(null)
      onAwarded()
      onClose()
    } catch (err) {
      AppAlert.alert("Award failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={styles.root}>
        <FacultySheetChrome
          topInset={insets.top}
          title="Award points"
          onClose={onClose}
          accentColor={FACULTY_CLASSROOM_POINTS_COLOR.link}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[collabSheetStyles.scroll, styles.scrollContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetSection label="Award details" tone={SHEET_CLASSROOM_POINTS.award}>
            <FacultySheetField label="Points">
              <FacultySheetTextInput value={points} onChangeText={setPoints} keyboardType="decimal-pad" placeholder="1.0" />
            </FacultySheetField>

            <FacultySheetField label="Category">
              <View style={styles.chips}>
                {MANUAL_AWARD_CATEGORIES.map((cat) => {
                  const active = category === cat.value
                  return (
                    <Pressable
                      key={cat.value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? FACULTY_CLASSROOM_POINTS_COLOR.action
                            : semanticSoft(FACULTY_CLASSROOM_POINTS_COLOR.link, tokens.isDark),
                          borderColor: active ? FACULTY_CLASSROOM_POINTS_COLOR.action : native.separator,
                        },
                      ]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <Text
                        style={[
                          type.caption,
                          { fontWeight: "700", color: active ? "#ffffff" : native.label },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </FacultySheetField>

            <FacultySheetField label="Section">
              <FacultySheetTextInput
                value={session}
                onChangeText={setSession}
                placeholder="ECE2202-001"
                autoCapitalize="characters"
              />
            </FacultySheetField>

            <FacultySheetField label="Reason">
              <FacultySheetTextInput
                multiline
                value={reason}
                onChangeText={setReason}
                placeholder="Participation in lab review…"
              />
            </FacultySheetField>
          </FacultySheetSection>

          <FacultySheetSection label="Student" tone={SHEET_CLASSROOM_POINTS.leaderboard}>
            {selected ? (
              <View
                style={[
                  styles.selectedBanner,
                  {
                    backgroundColor: semanticSoft(FACULTY_CLASSROOM_POINTS_COLOR.link, tokens.isDark),
                    borderColor: `${FACULTY_CLASSROOM_POINTS_COLOR.link}44`,
                  },
                ]}
              >
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{selected.full_name}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  {selected.student_id} · {selected.section ?? selected.session_code ?? "—"}
                </Text>
              </View>
            ) : null}

            <FacultySheetField label="Find student">
              <FacultySheetTextInput value={search} onChangeText={setSearch} placeholder="Search name or ID…" />
            </FacultySheetField>

            {loadingStudents ? (
              <ActivityIndicator color={FACULTY_CLASSROOM_POINTS_COLOR.link} style={styles.loader} />
            ) : filtered.length === 0 ? (
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                No students match your search.
              </Text>
            ) : (
              <ScrollView
                style={styles.studentListScroll}
                contentContainerStyle={styles.studentListContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {filtered.map((student) => {
                  const active = selectedId === student.id
                  return (
                    <Pressable
                      key={student.id}
                      style={[
                        styles.studentRow,
                        {
                          backgroundColor: active
                            ? semanticSoft(FACULTY_CLASSROOM_POINTS_COLOR.link, tokens.isDark)
                            : native.secondaryGrouped,
                          borderColor: active ? FACULTY_CLASSROOM_POINTS_COLOR.link : native.separator,
                        },
                      ]}
                      onPress={() => {
                        setSelectedId(student.id)
                        if (!session) setSession(student.section ?? student.session_code ?? "")
                      }}
                    >
                      <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 14 }]}>{student.full_name}</Text>
                      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                        {student.student_id} · {student.section ?? student.session_code ?? "—"}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            )}
          </FacultySheetSection>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopColor: native.separator,
              backgroundColor: native.groupedBackground,
            },
          ]}
        >
          <FacultySheetSubmitButton
            label="Award points"
            onPress={() => void handleSubmit()}
            disabled={submitting || !selectedId}
            loading={submitting}
          />
        </View>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loader: { marginVertical: 12 },
  selectedBanner: {
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
    marginBottom: 4,
  },
  studentListScroll: { maxHeight: 220 },
  studentListContent: { gap: 6 },
  studentRow: {
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
