import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { fetchStudentLectureViewerData } from "../../lib/student-lecture-api"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { LectureSamplePracticeConfig } from "../../lib/lecture-types"
import { formatCourseLabel } from "./lecture-list-utils"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { LectureSlidePreviewToolbar } from "./LectureSlidePreviewToolbar"
import { StudentLectureSamplePracticePanel } from "./StudentLectureSamplePracticePanel"
import { StudentLectureWebToolModal } from "./StudentLectureWebToolModal"
import { QuestionPrepareGate } from "../questions/QuestionPrepareGate"
import { extractLectureSamplePracticeQuestionTexts } from "../../lib/question-prepare"
import { buildStudentLectureToolPath } from "../../constants/module-web-paths"

type Props = {
  lectureId: number
  week: number
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

/** Full-page sample practice for a lecture — not a stacked sheet. */
export function StudentLectureSamplePracticeScreen({ lectureId, week }: Props) {
  const router = useRouter()
  const session = useStudentSession()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const courseLabel = formatCourseLabel(session)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [config, setConfig] = useState<LectureSamplePracticeConfig | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set())
  const [webOpen, setWebOpen] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await fetchStudentLectureViewerData(session, lectureId)
      const next = data.samplePractice
      setConfig(next)
      setExpandedId(next.questions[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sample practice.")
    }
  }, [session, lectureId])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const title = config?.button_label?.trim() || "Sample Practice"
  const prepareTexts = useMemo(
    () => (config?.questions.length ? extractLectureSamplePracticeQuestionTexts(config.questions) : null),
    [config?.questions],
  )

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <LectureSlidePreviewToolbar
        title={title}
        backLabel="Lecture"
        onBack={() => router.back()}
      />

      {loading ? (
        <QuestionPrepareGate
          fetching
          texts={null}
          title="Preparing sample practice"
          subtitle="Loading example questions and answer choices"
        >
          <View style={styles.center}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading sample practice…</Text>
          </View>
        </QuestionPrepareGate>
      ) : error ? (
        <View style={styles.center}>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load" body={error} />
        </View>
      ) : config && config.questions.length > 0 && session ? (
        <QuestionPrepareGate
          fetching={false}
          texts={prepareTexts}
          title="Preparing sample practice"
          subtitle="Loading example questions and answer choices"
          enabled={Boolean(prepareTexts?.length)}
        >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <StudentLectureSamplePracticePanel
            lectureId={lectureId}
            studentDatabaseId={session.databaseId}
            courseLabel={courseLabel}
            config={config}
            expandedId={expandedId}
            reviewedIds={reviewedIds}
            onToggle={(questionId) =>
              setExpandedId((current) => (current === questionId ? null : questionId))
            }
            onReviewed={(questionId) =>
              setReviewedIds((current) => new Set(current).add(questionId))
            }
          />
        </ScrollView>
        </QuestionPrepareGate>
      ) : (
        <View style={styles.center}>
          <FacultyEmptyState
            icon="sparkles-outline"
            title="No sample practice yet"
            body="Your instructor has not published practice examples for this lecture."
          />
        </View>
      )}

      {webOpen ? (
        <StudentLectureWebToolModal
          visible={webOpen}
          title={title}
          webPath={buildStudentLectureToolPath(lectureId, week, "sample-practice")}
          panel="sample-practice"
          onClose={() => setWebOpen(false)}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
})
