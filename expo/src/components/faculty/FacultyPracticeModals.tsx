import { useEffect, useState } from "react"
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi,
  type InstructorSession,
  type PracticeStudentProgress} from "../../lib/instructor-api"
import { FacultyFilterChip } from "./faculty-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetSection,
  FacultySheetSubmitButton,
} from "./faculty-collab-sheet-ui"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { NativeSelect } from "../NativeSelect"
import { DAILY_LIMIT_OPTIONS } from "./FacultyNativePickers"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_PRACTICE_COLOR } from "../../lib/faculty-practice-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

export function practiceStudentName(student: PracticeStudentProgress): string {
  return student.student_name ?? student.full_name ?? "Student"
}

export function practiceStudentScore(student: PracticeStudentProgress): number {
  return student.avg_score ?? student.accuracy ?? 0
}

export function practiceStudentAttempts(student: PracticeStudentProgress): number {
  return student.total_attempts ?? student.total_questions ?? 0
}

export function practiceStudentCorrect(student: PracticeStudentProgress): number {
  return student.total_correct ?? student.correct_answers ?? 0
}

export function practiceStudentTotalQuestions(student: PracticeStudentProgress): number {
  return student.total_questions ?? 0
}

export function practiceStudentAccuracy(student: PracticeStudentProgress): number {
  if (student.accuracy != null && Number.isFinite(student.accuracy)) return student.accuracy
  const total = practiceStudentTotalQuestions(student)
  const correct = practiceStudentCorrect(student)
  if (total > 0) return (correct / total) * 100
  return practiceStudentScore(student)
}

/** Shared accuracy meter for practice student sheets and reports. */
export function PracticeAccuracyPanel({
  accuracy,
  meta,
  label = "Accuracy",
}: {
  accuracy: number
  meta: string
  label?: string
}) {
  const { native, type } = useModuleTheme()
  const clamped = Math.min(100, Math.max(0, accuracy))
  const barColor =
    clamped >= 80
      ? FACULTY_PRACTICE_COLOR.success
      : clamped >= 60
        ? FACULTY_PRACTICE_COLOR.challenge
        : FACULTY_PRACTICE_COLOR.accuracy

  return (
    <View style={panelStyles.block}>
      <View style={panelStyles.head}>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>{label}</Text>
        <Text style={[type.bodyEmphasis, { fontSize: 20, color: barColor }]}>{clamped}%</Text>
      </View>
      <View style={[panelStyles.track, { backgroundColor: native.fill }]}>
        <View style={[panelStyles.fill, { width: `${clamped}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>{meta}</Text>
    </View>
  )
}

const panelStyles = StyleSheet.create({
  block: { gap: 8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  track: { height: 8, borderRadius: NATIVE.sectionRadius, overflow: "hidden" },
  fill: { height: "100%", borderRadius: NATIVE.sectionRadius },
})

type FacultyScope = { instructorId: number; courseId: number }

type ConfigureProps = {
  visible: boolean
  scope: FacultyScope | null
  sessions: InstructorSession[]
  selectedSession: string
  acting: boolean
  onClose: () => void
  onSaved: () => void
}

export function FacultyPracticeConfigureModal({
  visible,
  scope,
  sessions,
  selectedSession,
  acting,
  onClose,
  onSaved }: ConfigureProps) {
  useSuppressModuleSearchDock(visible)
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [session, setSession] = useState(selectedSession)
  const [dailyLimit, setDailyLimit] = useState("10")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setSession(selectedSession)
    setDailyLimit("10")
    setError("")
  }, [visible, selectedSession])

  async function save() {
    if (!scope) return
    const limit = Number.parseInt(dailyLimit, 10)
    if (!Number.isFinite(limit) || limit < 1) {
      setError("Daily limit must be at least 1.")
      return
    }
    setError("")
    setSaving(true)
    try {
      await instructorApi.savePracticeConfig(scope, {
        session,
        dailyLimit: limit,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save configuration.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Practice settings" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <FacultySheetSection label="Session scope" tone={SHEET_SECTION.roster}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <FacultyFilterChip label="All sections" active={session === "ALL"} onPress={() => setSession("ALL")} />
              {sessions.map((s) => (
                <FacultyFilterChip
                  key={s.id}
                  label={s.code}
                  active={session === s.code}
                  onPress={() => setSession(s.code)}
                />
              ))}
            </ScrollView>
          </FacultySheetSection>

          <FacultySheetSection
            label="Daily limit"
            hint="Default daily question limit for this session scope."
            tone={SHEET_SECTION.edit}
          >
            <FacultySheetField label="Daily question limit">
              <NativeSelect
                placeholder="20 questions / day"
                value={dailyLimit}
                options={DAILY_LIMIT_OPTIONS}
                onChange={setDailyLimit}
              />
            </FacultySheetField>
          </FacultySheetSection>

          {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

          <FacultySheetSubmitButton
            label="Save settings"
            onPress={() => void save()}
            disabled={saving || acting}
            loading={saving || acting}
          />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  chipRow: { gap: 8, paddingVertical: 4 }})