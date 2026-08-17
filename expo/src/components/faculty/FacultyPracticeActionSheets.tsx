import { useEffect, useMemo, useState } from "react"
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { PracticeStudentProgress, PracticeTopic } from "../../lib/instructor-api"
import { studentInitials } from "../../lib/faculty-students-utils"
import { FACULTY_PRACTICE_COLOR, facultyPracticeTopicThumb } from "../../lib/faculty-practice-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyStatusPill } from "./faculty-shared"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetField,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSaveChip,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetToggleRow,
} from "./faculty-collab-sheet-ui"
import { SHEET_PRACTICE, SHEET_SECTION } from "./faculty-sheet-semantics"
import { NativeSelect } from "../NativeSelect"
import { DAILY_LIMIT_OPTIONS } from "./FacultyNativePickers"
import {
  practiceStudentAccuracy,
  practiceStudentAttempts,
  practiceStudentCorrect,
  practiceStudentName,
  practiceStudentScore,
  practiceStudentTotalQuestions,
  PracticeAccuracyPanel} from "./FacultyPracticeModals"

function topicAvailability(topic: PracticeTopic, session: string) {
  return topic.availability[session] ?? topic.availability.ALL
}

type TopicProps = {
  visible: boolean
  topic: PracticeTopic | null
  session: string
  acting: boolean
  onClose: () => void
  onManageQuestions?: () => void
  onToggle: (topic: PracticeTopic, enabled: boolean) => void | Promise<boolean>
  onSaveLimit: (topic: PracticeTopic, dailyLimit: number) => void
  onRemove: (topic: PracticeTopic) => void
}

export function FacultyPracticeTopicActionSheet({
  visible,
  topic,
  session,
  acting,
  onClose,
  onManageQuestions,
  onToggle,
  onSaveLimit,
  onRemove}: TopicProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [dailyLimit, setDailyLimit] = useState("10")
  const [enabled, setEnabled] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    if (!visible || !topic) return
    const avail = topicAvailability(topic, session)
    setDailyLimit(String(avail?.daily_limit ?? 10))
    setEnabled(avail?.is_available ?? false)
    setDirty(false)
    setConfirmRemove(false)
  }, [visible, topic, session])

  if (!topic) return null

  const sessionLabel = session === "ALL" ? "all sections" : session

  function saveLimit() {
    const limit = Number.parseInt(dailyLimit, 10)
    if (Number.isFinite(limit) && limit >= 1) {
      onSaveLimit(topic!, limit)
      setDirty(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Practice topic" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={topic.name}
            subtitle={`Scope: ${sessionLabel}`}
            icon="library-outline"
            thumbColor={FACULTY_PRACTICE_COLOR.topicThumb}
            pills={
              <FacultyStatusPill label={enabled ? "Available" : "Hidden"} tone={enabled ? "success" : "neutral"} />
            }
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip
              icon="help-circle-outline"
              label="Questions"
              value={String(topic.question_count)}
              tone={SHEET_PRACTICE.questions}
            />
            <FacultySheetStatChip
              icon="speedometer-outline"
              label="Daily limit"
              value={dailyLimit}
              tone={SHEET_PRACTICE.dailyLimit}
            />
          </FacultySheetStatRow>

          <FacultySheetSection label="Availability" tone={SHEET_SECTION.workflow}>
            <FacultySheetToggleRow
              icon="eye-outline"
              title="Available to students"
              subtitle={`Controls access for ${sessionLabel}`}
              value={enabled}
              disabled={acting}
              onValueChange={(v) => {
                const previous = enabled
                setEnabled(v)
                void Promise.resolve(onToggle(topic, v)).then((ok) => {
                  if (ok === false) setEnabled(previous)
                })
              }}
            />
          </FacultySheetSection>

          <FacultySheetSection
            label="Daily limit"
            tone={SHEET_SECTION.edit}
            action={dirty ? <FacultySheetSaveChip saving={acting} onPress={saveLimit} /> : null}
          >
            <FacultySheetField label="Questions per day">
              <NativeSelect
                placeholder="20 questions / day"
                value={dailyLimit}
                options={DAILY_LIMIT_OPTIONS}
                onChange={(v) => {
                  setDailyLimit(v)
                  setDirty(true)
                }}
              />
            </FacultySheetField>
          </FacultySheetSection>

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
            {onManageQuestions ? (
              <FacultySheetActionRow
                icon="list-outline"
                label="Manage questions"
                subtitle="Add, edit, or remove practice questions"
                tone="primary"
                accent={SHEET_PRACTICE.manageQuestions}
                onPress={onManageQuestions}
              />
            ) : null}
            <FacultySheetActionRow
              icon="trash-outline"
              label={`Remove from ${sessionLabel}`}
              subtitle="Topic stays in the bank but is hidden here"
              tone="danger"
              onPress={() => setConfirmRemove(true)}
            />
          </FacultySheetSection>
        </ScrollView>

        {confirmRemove ? (
          <FacultySheetConfirm
            title="Remove topic?"
            body={`“${topic.name}” will be removed from ${sessionLabel}.`}
            confirmLabel="Remove"
            onCancel={() => setConfirmRemove(false)}
            onConfirm={() => {
              setConfirmRemove(false)
              onRemove(topic)
            }}
          />
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}

type StudentProps = {
  visible: boolean
  student: PracticeStudentProgress | null
  acting: boolean
  onClose: () => void
  onViewReport: () => void
  onReset: () => void
}

export function FacultyPracticeStudentActionSheet({
  visible,
  student,
  acting,
  onClose,
  onViewReport,
  onReset }: StudentProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [confirmReset, setConfirmReset] = useState(false)

  const lastPracticedLabel = useMemo(() => {
    if (!student?.last_practiced) return "No practice sessions yet"
    const d = new Date(student.last_practiced)
    if (Number.isNaN(d.getTime())) return "Last practiced recently"
    return `Last practiced ${d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"})}`
  }, [student?.last_practiced])

  if (!student) return null

  const topics = student.topics_practiced ?? []
  const attempts = practiceStudentAttempts(student)
  const avgScore = Math.round(practiceStudentScore(student))
  const accuracy = Math.round(practiceStudentAccuracy(student))
  const correct = practiceStudentCorrect(student)
  const totalQuestions = practiceStudentTotalQuestions(student)
  const streak = student.streak ?? 0
  const name = practiceStudentName(student)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Practice progress" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={name}
            subtitle={lastPracticedLabel}
            initials={studentInitials(name)}
            thumbColor={FACULTY_PRACTICE_COLOR.studentThumb}
            pills={
              <>
                {student.student_section ? (
                  <FacultyStatusPill label={`Section ${student.student_section}`} tone="neutral" />
                ) : null}
                {student.student_number ? (
                  <FacultyStatusPill label={student.student_number} tone="neutral" />
                ) : null}
              </>
            }
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip
              icon="analytics-outline"
              label="Accuracy"
              value={`${accuracy}%`}
              tone={SHEET_PRACTICE.accuracy}
            />
            <FacultySheetStatChip
              icon="repeat-outline"
              label="Attempts"
              value={String(attempts)}
              tone={SHEET_PRACTICE.attempts}
            />
            <FacultySheetStatChip
              icon="library-outline"
              label="Topics"
              value={String(topics.length)}
              tone={SHEET_PRACTICE.topics}
            />
          </FacultySheetStatRow>

          <FacultySheetSection label="Practice overview" tone={SHEET_SECTION.highlight}>
            <PracticeAccuracyPanel
              accuracy={accuracy}
              meta={`${correct} correct of ${totalQuestions > 0 ? totalQuestions : "—"} questions · ${avgScore}% avg score`}
            />
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="repeat-outline" label="Attempts" value={String(attempts)} />
              <FacultySheetMetricRow icon="help-circle-outline" label="Questions answered" value={String(totalQuestions)} />
              <FacultySheetMetricRow icon="checkmark-circle-outline" label="Correct answers" value={String(correct)} />
              <FacultySheetMetricRow icon="library-outline" label="Topics covered" value={String(topics.length)} />
              {streak > 0 ? (
                <FacultySheetMetricRow icon="flame-outline" label="Current streak" value={`${streak} days`} isLast />
              ) : (
                <FacultySheetMetricRow icon="trending-up-outline" label="Avg score" value={`${avgScore}%`} isLast />
              )}
            </FacultySheetGroupedList>
          </FacultySheetSection>

          <FacultySheetSection label="Topics practiced" hint={`${topics.length} in this course`} tone={SHEET_SECTION.roster}>
            {topics.length > 0 ? (
              topics.map((topic) => {
                const thumb = facultyPracticeTopicThumb(topic)
                return (
                  <View
                    key={topic}
                    style={[
                      localStyles.topicRow,
                      { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                    ]}
                  >
                    <SolidListThumbTile thumb={thumb} icon="book-outline" size="compact" />
                    <Text
                      style={[type.bodyEmphasis, localStyles.topicName, { color: native.label }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {topic}
                    </Text>
                  </View>
                )
              })
            ) : (
              <Text style={collabSheetStyles.emptyText}>No topic activity recorded yet.</Text>
            )}
          </FacultySheetSection>

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
            <FacultySheetActionRow
              icon="document-text-outline"
              label="View full report"
              subtitle="Attempts, answers, and topic breakdown"
              tone="primary"
              accent={SHEET_PRACTICE.viewReport}
              onPress={onViewReport}
            />
            <FacultySheetActionRow
              icon="refresh-outline"
              label="Reset all practice progress"
              subtitle="Clears all practice data for this student"
              tone="danger"
              disabled={acting}
              onPress={() => setConfirmReset(true)}
            />
          </FacultySheetSection>
        </ScrollView>

        {confirmReset ? (
          <FacultySheetConfirm
            title="Reset progress?"
            body={`Clears all practice data for ${name}.`}
            confirmLabel="Reset"
            onCancel={() => setConfirmReset(false)}
            onConfirm={() => {
              setConfirmReset(false)
              onReset()
            }}
          />
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  topicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topicName: { flex: 1, fontSize: 14, lineHeight: 20 },
})