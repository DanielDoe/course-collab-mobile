import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { fetchStudentLectureViewerData } from "../../lib/student-lecture-api"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { LectureWorkspaceConfig } from "../../lib/lecture-types"
import { defaultWorkspaceConfig } from "../../lib/lecture-types"
import { buildStudentLectureToolPath } from "../../constants/module-web-paths"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { LectureSlidePreviewToolbar } from "./LectureSlidePreviewToolbar"
import { StudentLectureWorkspacePanel } from "./StudentLectureWorkspacePanel"
import { StudentLectureWebToolModal } from "./StudentLectureWebToolModal"
import { QuestionPrepareGate } from "../questions/QuestionPrepareGate"
import { extractLectureWorkspaceQuestionTexts } from "../../lib/question-prepare"
import { buildLectureWorkspaceStudentViewInjectScript } from "../../lib/web-session-inject"

type Props = {
  lectureId: number
  week: number
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

/** Full-page in-class workspace for a lecture — view-only ink for students. */
export function StudentLectureWorkspaceScreen({ lectureId, week }: Props) {
  const router = useRouter()
  const session = useStudentSession()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [config, setConfig] = useState<LectureWorkspaceConfig>(defaultWorkspaceConfig())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [webOpen, setWebOpen] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await fetchStudentLectureViewerData(session, lectureId)
      const next = data.workspace
      setConfig(next)
      setExpandedId(next.questions[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load workspace.")
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

  const title = config.button_label?.trim() || config.title?.trim() || "Workspace"
  const prepareTexts = useMemo(
    () => (config.questions.length ? extractLectureWorkspaceQuestionTexts(config.questions) : null),
    [config.questions],
  )

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <LectureSlidePreviewToolbar
        title={title}
        backLabel="Slide preview"
        onBack={() => router.back()}
        trailing={
          <Pressable
            onPress={() => setWebOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open web workspace"
          >
            <Ionicons name="globe-outline" size={22} color={tokens.accent} />
          </Pressable>
        }
      />

      {loading ? (
        <QuestionPrepareGate
          fetching
          texts={null}
          title="Preparing workspace"
          subtitle="Loading lecture questions and solutions"
        >
          <View style={styles.center}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading workspace…</Text>
          </View>
        </QuestionPrepareGate>
      ) : error ? (
        <View style={styles.center}>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load" body={error} />
        </View>
      ) : config.questions.length > 0 && session ? (
        <QuestionPrepareGate
          fetching={false}
          texts={prepareTexts}
          title="Preparing workspace"
          subtitle="Loading lecture questions and solutions"
          enabled={Boolean(prepareTexts?.length)}
        >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StudentLectureWorkspacePanel
            lectureId={lectureId}
            studentDatabaseId={session.databaseId}
            config={config}
            expandedId={expandedId}
            onToggle={(questionId) =>
              setExpandedId((current) => (current === questionId ? null : questionId))
            }
          />
        </ScrollView>
        </QuestionPrepareGate>
      ) : (
        <View style={styles.center}>
          <FacultyEmptyState
            icon="easel-outline"
            title="No workspace problems yet"
            body="Your instructor has not published in-class workspace problems for this lecture."
          />
        </View>
      )}

      {webOpen ? (
        <StudentLectureWebToolModal
          visible={webOpen}
          title={title}
          webPath={buildStudentLectureToolPath(lectureId, week, "workspace")}
          panel="workspace"
          extraInjectScript={buildLectureWorkspaceStudentViewInjectScript()}
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
