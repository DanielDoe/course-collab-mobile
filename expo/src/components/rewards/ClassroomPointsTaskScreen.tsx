import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { semanticSoft } from "../../lib/themed-module-theme"
import {
  assignmentKindLabel,
  isSolutionAssignment,
  shortenTaskTitle} from "../../lib/classroom-submission"
import { formatRelativeTime, rewardsApi, type ClassroomSubmission } from "../../lib/rewards-api"
import { CircuitSolutionSubmitPanel } from "./CircuitSolutionSubmitPanel"
import { CodeAssignmentSubmitPanel } from "./CodeAssignmentSubmitPanel"
import { QuestionContentWebView, QuestionMediaView } from "./QuestionContent"
import { parseQuestionMedia } from "../../lib/classroom-submission"
import { QuestionPrepareGate } from "../questions/QuestionPrepareGate"
import { extractAssignmentQuestionTexts } from "../../lib/question-prepare"
import { TaskMetaChip, TaskSectionCard, useRewardsTheme } from "./rewards-shared"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useModuleContentStyle } from "../../lib/responsive-layout"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function findAssignment(
  data: Awaited<ReturnType<typeof rewardsApi.getClassroomSubmissions>>,
  id: number,
): ClassroomSubmission | null {
  const pools = [
    ...(data.submissions ?? []),
    ...(data.pendingSubmissions ?? []),
    ...(data.missingSubmissions ?? []),
  ]
  return pools.find((item) => item.id === id) ?? null
}

export function ClassroomPointsTaskScreen() {
  const router = useRouter()
  const scrollPad = useModuleScrollContentPadding(24)
  const moduleContent = useModuleContentStyle()
  const session = useStudentSession()
  const theme = useRewardsTheme()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { id } = useLocalSearchParams<{ id: string }>()
  const taskId = Number(id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [assignment, setAssignment] = useState<ClassroomSubmission | null>(null)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(taskId)) return
    try {
      const data = await rewardsApi.getClassroomSubmissions(session)
      const found = findAssignment(data, taskId)
      if (!found) {
        setError("This assignment could not be found or may have expired.")
        setAssignment(null)
      } else {
        setAssignment(found)
        setError("")
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load assignment.")
    }
  }, [session, taskId])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const questionConfig = assignment?.question_config
  const questionText =
    questionConfig?.question_text?.trim() || assignment?.description?.trim() || ""
  const uploadConfig = questionConfig?.solution_upload_config
  const instructions = uploadConfig?.submission_instructions?.trim()
  const isSolution = assignment ? isSolutionAssignment(assignment) : false
  const isPending = assignment?.pending || assignment?.classroomPoint?.status === "pending"
  const isDisabled = isPending

  const displayTitle = useMemo(
    () => (assignment ? shortenTaskTitle(assignment.title) : "Assignment"),
    [assignment],
  )

  const dueLabel = useMemo(() => {
    if (!assignment?.due_at) return null
    return `Due ${formatRelativeTime(assignment.due_at)}`
  }, [assignment?.due_at])

  const prepareTexts = useMemo(
    () =>
      assignment
        ? extractAssignmentQuestionTexts(
            questionConfig?.question_text || assignment.description || undefined,
            instructions,
          )
        : null,
    [assignment, questionConfig?.question_text, instructions],
  )

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.background }]}>
        <NotetakerScreenHeader title="Assignment" fallbackHref="/module/classroom-points" />
        <QuestionPrepareGate
          fetching
          texts={null}
          title="Preparing assignment"
          subtitle="Loading problem statement and instructions"
        >
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </QuestionPrepareGate>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <NotetakerScreenHeader title={displayTitle} fallbackHref="/module/classroom-points" />
      <QuestionPrepareGate
        fetching={false}
        texts={prepareTexts}
        title="Preparing assignment"
        subtitle="Loading problem statement and instructions"
        enabled={Boolean(prepareTexts?.length)}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, scrollPad, moduleContent]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: semanticSoft(tokens.danger, tokens.isDark),
              borderColor: hexToRgba(tokens.danger, tokens.isDark ? 0.4 : 0.28),
            },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
          <Text style={[styles.errorText, { color: native.label }]}>{error}</Text>
        </View>
      ) : null}

      {assignment ? (
        <>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: native.label }]} numberOfLines={1} ellipsizeMode="tail">
              {displayTitle}
            </Text>
            <View style={styles.chipRow}>
              <TaskMetaChip label={assignmentKindLabel(assignment.submission_kind)} tone="kind" />
              {dueLabel ? <TaskMetaChip label={dueLabel} tone="due" /> : null}
              {isPending ? <TaskMetaChip label="Pending review" tone="pending" /> : null}
            </View>
          </View>

          {isPending && assignment.classroomPoint?.instructorFeedback ? (
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: semanticSoft(tokens.warning, tokens.isDark),
                  borderColor: hexToRgba(tokens.warning, tokens.isDark ? 0.38 : 0.26),
                },
              ]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={tokens.warning} />
              <View style={styles.feedbackCopy}>
                <QuestionContentWebView text={assignment.classroomPoint.instructorFeedback} embedded compact />
              </View>
            </View>
          ) : null}

          <TaskSectionCard title="Problem" icon="help-circle-outline" flush>
            <QuestionMediaView media={parseQuestionMedia(questionConfig?.question_media)} embedded />
            {questionText ? (
              <View style={styles.questionBody}>
                <QuestionContentWebView text={questionText} embedded />
              </View>
            ) : null}
            {instructions ? (
              <View
                style={[
                  styles.instructionsCallout,
                  { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder },
                ]}
              >
                <View style={styles.instructionsHead}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
                  <Text style={[styles.instructionsLabel, { color: native.label }]}>Instructions</Text>
                </View>
                <View style={styles.instructionsContent}>
                  <QuestionContentWebView text={instructions} embedded compact />
                </View>
              </View>
            ) : null}
          </TaskSectionCard>

          <TaskSectionCard
            title={isSolution ? "Submit solution" : "Submit code"}
            icon={isSolution ? "cloud-upload-outline" : "code-slash-outline"}
          >
            {isSolution ? (
              <CircuitSolutionSubmitPanel
                session={session!}
                assignmentId={assignment.id}
                maxFiles={uploadConfig?.max_files ?? 10}
                requireUpload={uploadConfig?.require_solution_upload !== false}
                disabled={isDisabled}
                onSubmitted={() => router.back()}
              />
            ) : (
              <CodeAssignmentSubmitPanel
                session={session!}
                assignmentId={assignment.id}
                title={assignment.title}
                disabled={isDisabled}
                onSubmitted={() => router.back()}
              />
            )}
          </TaskSectionCard>
        </>
      ) : null}
      </ScrollView>
      </QuestionPrepareGate>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1},
  errorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  titleBlock: { gap: 10 },
  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.2},
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1},
  feedbackCopy: { flex: 1, minWidth: 0 },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18 },
  questionBody: { paddingHorizontal: 14, paddingVertical: 10 },
  instructionsCallout: {
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1},
  instructionsHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  instructionsLabel: { fontSize: 12, fontWeight: "600" },
  instructionsContent: { flex: 1, minWidth: 0 },
})
