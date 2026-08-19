import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { WebView } from "react-native-webview"
import { useRouter } from "expo-router"
import { ApiError } from "../../lib/api"
import { fetchStudentLectureViewerData } from "../../lib/student-lecture-api"
import { buildStudentAuthenticatedDeckSource } from "../../lib/lecture-deck-url"
import { loadLectureDeckForWebView } from "../../lib/lecture-deck-loader"
import { getAllowedWebViewOriginPrefixes } from "../../lib/trusted-origins"
import { studentApi, type StudentLectureDetail } from "../../lib/student-api"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { defaultWorkspaceConfig } from "../../lib/lecture-types"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { LectureSlidePreviewToolbar } from "./LectureSlidePreviewToolbar"
import { LectureToolsToolbarButton } from "./LectureToolsToolbarButton"
import { StudentLectureToolsSheet } from "./StudentLectureToolsSheet"

type Props = {
  lectureId: number
  week: number
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

/** Native student lecture viewer — slides first, tools navigate to full-page practice and workspace. */
export function StudentLectureViewerScreen({ lectureId, week }: Props) {
  const router = useRouter()
  const session = useStudentSession()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lecture, setLecture] = useState<StudentLectureDetail | null>(null)
  const [deckUrl, setDeckUrl] = useState<string | null>(null)
  const [samplePracticeCount, setSamplePracticeCount] = useState(0)
  const [samplePracticeLabel, setSamplePracticeLabel] = useState("Sample Practice")
  const [workspace, setWorkspace] = useState(defaultWorkspaceConfig())
  const [toolsOpen, setToolsOpen] = useState(false)
  const [deckLoading, setDeckLoading] = useState(false)
  const [deckError, setDeckError] = useState("")
  const [deckSource, setDeckSource] = useState<{
    uri: string
    headers?: Record<string, string>
  } | null>(null)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(lectureId)) return
    setError("")
    try {
      const data = await fetchStudentLectureViewerData(session, lectureId)
      setLecture(data.lecture)
      setDeckUrl(data.deckUrl)
      setSamplePracticeCount(data.samplePractice.questions.length)
      setSamplePracticeLabel(data.samplePractice.button_label?.trim() || "Sample Practice")
      setWorkspace(data.workspace)

      const progress = data.lecture.progress_percentage
      if (progress != null && progress < 100) {
        void studentApi.updateLectureProgress(session, lectureId, Math.max(progress, 1)).catch(() => undefined)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load lecture.")
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

  useEffect(() => {
    let cancelled = false
    if (!session || !deckUrl) {
      setDeckSource(null)
      setDeckError("")
      setDeckLoading(false)
      return
    }
    setDeckLoading(true)
    setDeckError("")
    void (async () => {
      const authSource = await buildStudentAuthenticatedDeckSource(deckUrl, session)
      if (!authSource || cancelled) {
        if (!cancelled) {
          setDeckSource(null)
          setDeckLoading(false)
          setDeckError("Slide deck URL is unavailable.")
        }
        return
      }
      const loaded = await loadLectureDeckForWebView({
        url: authSource.uri,
        headers: authSource.headers,
        cacheKey: `lecture-${lectureId}`,
      })
      if (cancelled) return
      if (loaded.ok) {
        setDeckSource(loaded.source)
        setDeckError("")
      } else {
        setDeckSource(null)
        setDeckError(loaded.message)
      }
      setDeckLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [deckUrl, session, lectureId])

  const webViewOrigins = useMemo(
    () => getAllowedWebViewOriginPrefixes({ lectureDeck: true }),
    [],
  )

  const workspaceCount = workspace.questions.length
  const workspaceLabel = workspace.button_label?.trim() || workspace.title?.trim() || "Workspace"
  const overlayOpen = toolsOpen

  function openSamplePractice() {
    router.push({
      pathname: "/lecture/[week]/sample-practice",
      params: { week: String(week), lectureId: String(lectureId) },
    } as never)
  }

  function openWorkspace() {
    router.push({
      pathname: "/lecture/[week]/workspace",
      params: { week: String(week), lectureId: String(lectureId) },
    } as never)
  }

  function openExternally() {
    if (!deckSource?.uri) return
    void Linking.openURL(deckSource.uri)
  }

  function downloadSlides() {
    openExternally()
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <LectureSlidePreviewToolbar
        title="Slide preview"
        onBack={() => router.back()}
        trailing={<LectureToolsToolbarButton onPress={() => setToolsOpen(true)} />}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading slides…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load" body={error} />
        </View>
      ) : deckLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading slide deck…</Text>
        </View>
      ) : deckError ? (
        <View style={styles.center}>
          <FacultyEmptyState
            icon="alert-circle-outline"
            title="Could not load slides"
            body={deckError}
          />
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
            onPress={() => setToolsOpen(true)}
          >
            <Text style={styles.primaryBtnText}>Open lecture tools</Text>
          </Pressable>
        </View>
      ) : deckSource && !overlayOpen ? (
        <View style={[styles.viewer, { backgroundColor: tokens.surface }]}>
          <WebView
            source={deckSource}
            style={styles.webview}
            originWhitelist={webViewOrigins}
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.loading, { backgroundColor: tokens.surface }]}>
                <ActivityIndicator size="large" color={tokens.accent} />
              </View>
            )}
          />
        </View>
      ) : deckSource && overlayOpen ? (
        <View style={[styles.viewer, { backgroundColor: tokens.surface }]} />
      ) : (
        <View style={styles.center}>
          <FacultyEmptyState
            icon="document-outline"
            title="No slide deck"
            body="Your instructor has not uploaded slides for this lecture yet. Check Lecture tools for sample practice or workspace."
          />
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
            onPress={() => setToolsOpen(true)}
          >
            <Text style={styles.primaryBtnText}>Open lecture tools</Text>
          </Pressable>
        </View>
      )}

      <StudentLectureToolsSheet
        visible={toolsOpen}
        onClose={() => setToolsOpen(false)}
        lectureTitle={lecture?.title || `Week ${week}`}
        samplePracticeLabel={samplePracticeLabel}
        samplePracticeCount={samplePracticeCount}
        workspaceLabel={workspaceLabel}
        workspaceCount={workspaceCount}
        canDownload={Boolean(lecture?.allow_download && deckSource?.uri)}
        canOpenExternally={Boolean(deckSource?.uri)}
        onOpenSamplePractice={openSamplePractice}
        onOpenWorkspace={openWorkspace}
        onDownloadSlides={downloadSlides}
        onOpenExternally={openExternally}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  viewer: { flex: 1, minHeight: 0 },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
})
