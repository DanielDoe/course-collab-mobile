import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  ASSESSMENT_TYPE_CONFIG,
  countLiveSections,
  formatAssessmentWindow,
  type AssessmentType} from "../../lib/faculty-assessment-utils"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import {
  instructorApi,
  type InstructorQuiz,
  type InstructorQuizDetail,
  type InstructorSession} from "../../lib/instructor-api"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultySessionAccessList } from "./FacultySessionAccessList"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetHero,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  quiz: InstructorQuiz | null
  assessmentType: AssessmentType
  scope: Scope | null
  sessions: InstructorSession[]
  togglingKey: string | null
  onClose: () => void
  onUpdated: () => void
  onEdit: () => void
  onToggleSession: (quizId: number, sessionCode: string, next: boolean) => void
}

function ActionButton({
  label,
  icon,
  tone = "default",
  disabled,
  onPress}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tone?: "default" | "danger"
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <FacultySheetActionRow
      icon={icon}
      label={label}
      tone={tone === "danger" ? "danger" : tone === "default" ? "default" : "primary"}
      disabled={disabled}
      onPress={onPress}
    />
  )
}

export function FacultyAssessmentDetailModal({
  quiz,
  assessmentType,
  scope,
  sessions,
  togglingKey,
  onClose,
  onUpdated,
  onEdit,
  onToggleSession}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const config = ASSESSMENT_TYPE_CONFIG[assessmentType]

  const [detail, setDetail] = useState<InstructorQuizDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const loadDetail = useCallback(async () => {
    if (!scope || !quiz) return
    setLoading(true)
    try {
      setDetail(await instructorApi.getQuiz(scope, quiz.id))
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [scope, quiz])

  useEffect(() => {
    if (!quiz) {
      setDetail(null)
      return
    }
    void loadDetail()
  }, [quiz, loadDetail])

  if (!quiz) return null

  const windowLabel = formatAssessmentWindow(quiz.available_from, quiz.available_until)
  const liveSections = countLiveSections(quiz, sessions)

  function openEdit() {
    onEdit()
  }

  function openResults() {
    onClose()
    router.push("/module/results" as never)
  }

  function confirmDelete() {
    AppAlert.alert(
      "Move to trash?",
      `"${quiz!.title}" will be moved to trash and can be restored within 24 hours.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (!scope) return
              setActing("delete")
              try {
                await instructorApi.deleteQuiz(scope, quiz!.id)
                onClose()
                onUpdated()
              } catch (err) {
                AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
              } finally {
                setActing(null)
              }
            })()
          }},
      ],
    )
  }

  function confirmClone() {
    AppAlert.alert("Duplicate assessment?", `Create a copy of "${quiz!.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Duplicate",
        onPress: () => {
          void (async () => {
            if (!scope) return
            setActing("clone")
            try {
              const res = await instructorApi.cloneQuiz(scope, quiz!.id)
              onUpdated()
              AppAlert.alert("Duplicated", "A copy was created.")
            } catch (err) {
              AppAlert.alert("Duplicate failed", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setActing(null)
            }
          })()
        }},
    ])
  }

  return (
    <Modal visible={Boolean(quiz)} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title={config.shortLabel} onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={quiz.title}
            subtitle={config.shortLabel}
            icon="document-text-outline"
            pills={
              <>
                <FacultyStatusPill label={quiz.is_active ? "Live" : "Closed"} tone={quiz.is_active ? "live" : "neutral"} />
                <FacultyStatusPill label={config.shortLabel} tone="neutral" />
              </>
            }
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={FACULTY_ASSESSMENT_COLOR.link} />
            </View>
          ) : null}

          {quiz.description || detail?.description ? (
            <Text style={collabSheetStyles.bodyText}>{quiz.description ?? detail?.description}</Text>
          ) : null}

          <FacultySheetStatRow>
            <FacultySheetStatChip
              icon="help-circle-outline"
              label="Questions"
              value={String(quiz.question_count ?? detail?.questions?.length ?? 0)}
              tone={SHEET_METRIC.primary}
            />
            <FacultySheetStatChip
              icon="people-outline"
              label="Attempts"
              value={String(quiz.total_attempts ?? 0)}
              tone={SHEET_METRIC.info}
            />
            <FacultySheetStatChip
              icon="layers-outline"
              label="Sections open"
              value={`${liveSections}/${sessions.length}`}
              tone={SHEET_METRIC.secondary}
            />
          </FacultySheetStatRow>

          {windowLabel ? <FacultySheetNotice tone="warning" message={windowLabel} /> : null}

          <FacultySheetSection label="Section access" tone={SHEET_SECTION.roster}>
            <FacultySessionAccessList
              sessions={sessions}
              sessionAccess={quiz.session_access}
              quizId={quiz.id}
              togglingKey={togglingKey}
              onToggleSession={onToggleSession}
            />
          </FacultySheetSection>

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
            <View style={styles.actionsGrid}>
              <ActionButton label="Edit" icon="create-outline" onPress={openEdit} />
              <ActionButton
                label="Duplicate"
                icon="copy-outline"
                disabled={acting === "clone"}
                onPress={confirmClone}
              />
              <ActionButton label="Results" icon="bar-chart-outline" onPress={openResults} />
              <ActionButton
                label="Delete"
                icon="trash-outline"
                tone="danger"
                disabled={acting === "delete"}
                onPress={confirmDelete}
              />
            </View>
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  loadingBox: { paddingVertical: 8, alignItems: "center" },
  actionsGrid: { gap: 8 }})