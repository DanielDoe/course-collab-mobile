import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ApiError } from "../../lib/api"
import { fetchStudentLectureViewerData } from "../../lib/student-lecture-api"
import { studentApi } from "../../lib/student-api"
import { emitModuleRefresh } from "../../lib/notifications/notification-events"
import { buildStudentAuthenticatedDeckSource } from "../../lib/lecture-deck-url"
import {
  canOpenLectureDeckExternally,
  openLectureDeckExternally,
  shareLectureDeckPdf,
} from "../../lib/lecture-deck-actions"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { AppAlert } from "../../lib/app-alert"
import { LectureDeckPdfViewer } from "./LectureDeckPdfViewer"
import { LectureSlidePreviewToolbar } from "./LectureSlidePreviewToolbar"
import { StudentLectureCoraOverlay } from "./StudentLectureCoraOverlay"
import { StudentLectureToolsSheet } from "./StudentLectureToolsSheet"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { lectureViewerRootStyle, lectureViewerWebHostStyle } from "./lecture-viewer-layout"
import type { LectureSamplePracticeConfig, LectureWorkspaceConfig } from "../../lib/lecture-types"
import type { StudentLectureDetail } from "../../lib/student-api"
import { useLectureSlideProgressSync } from "../../hooks/useLectureSlideProgressSync"
import { lectureDisplayTitle } from "./lecture-list-utils"

type Props = {
  lectureId: number
  week: number
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function resolveWorkspaceDisplayLabel(
  workspace: LectureWorkspaceConfig | null,
  samplePracticeLabel: string,
): string {
  const label = workspace?.button_label?.trim() || workspace?.title?.trim() || "Workspace"
  if (label.toLowerCase() === samplePracticeLabel.toLowerCase()) return "Workspace"
  if (/sample\s*practice/i.test(label)) return "Workspace"
  return label
}

/**
 * Student lecture viewer — native PDF deck with tools action sheet.
 */
export function StudentLectureViewerScreen({ lectureId, week }: Props) {
  const router = useRouter()
  const session = useStudentSession()
  const native = useThemedNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lecture, setLecture] = useState<StudentLectureDetail | null>(null)
  const [samplePractice, setSamplePractice] = useState<LectureSamplePracticeConfig | null>(null)
  const [workspace, setWorkspace] = useState<LectureWorkspaceConfig | null>(null)
  const [deckUrl, setDeckUrl] = useState<string | null>(null)
  const [deckHeaders, setDeckHeaders] = useState<Record<string, string> | undefined>()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [savingCompletion, setSavingCompletion] = useState(false)

  const slideProgress = useLectureSlideProgressSync(session, lectureId)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await fetchStudentLectureViewerData(session, lectureId)
      setLecture(data.lecture)
      setSamplePractice(data.samplePractice)
      setWorkspace(data.workspace)
      setDeckUrl(data.deckUrl)
      const auth = await buildStudentAuthenticatedDeckSource(data.deckUrl, session)
      setDeckHeaders(auth?.headers)
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

  const title = lecture ? lectureDisplayTitle(lecture, session?.courseCode) : `Week ${week}`
  const samplePracticeLabel = samplePractice?.button_label?.trim() || "Sample Practice"
  const workspaceLabel = resolveWorkspaceDisplayLabel(workspace, samplePracticeLabel)
  const samplePracticeCount = samplePractice?.questions.length ?? 0
  const workspaceCount = workspace?.questions.length ?? 0
  const showSamplePractice = samplePracticeCount > 0
  const showWorkspace = workspaceCount > 0
  const canDownload = Boolean(deckUrl && lecture?.allow_download !== false)
  const canOpenExternally = canOpenLectureDeckExternally(deckUrl)

  const completed = lecture?.status === "completed"

  const deckRequestUri = useMemo(() => deckUrl, [deckUrl])

  async function handleToggleCompleted() {
    if (!session || !lecture || savingCompletion) return
    const next = !completed
    setSavingCompletion(true)
    setLecture({ ...lecture, status: next ? "completed" : "in_progress" })
    try {
      const res = await studentApi.setLectureCompleted(session, lectureId, next)
      setLecture((prev) => (prev ? { ...prev, status: res.status ?? prev.status } : prev))
      // Keeps the lectures list and its completion filter in sync.
      emitModuleRefresh("lectures")
    } catch (err) {
      setLecture((prev) => (prev ? { ...prev, status: lecture.status } : prev))
      AppAlert.alert("Lecture", err instanceof ApiError ? err.message : "Could not update progress.")
    } finally {
      setSavingCompletion(false)
    }
  }

  async function handleDownload() {
    if (!deckUrl || !session || downloading) return
    // The tools sheet closes before this runs, so the viewer owns the progress cue.
    setDownloading(true)
    try {
      const auth = await buildStudentAuthenticatedDeckSource(deckUrl, session)
      if (!auth) {
        AppAlert.alert("Slides", "Could not prepare this deck for download.")
        return
      }
      await shareLectureDeckPdf(auth, title)
    } catch (err) {
      AppAlert.alert("Slides", err instanceof ApiError ? err.message : "Could not download the slides.")
    } finally {
      setDownloading(false)
    }
  }

  if (!session) {
    return (
      <View style={[lectureViewerRootStyle, { backgroundColor: native.groupedBackground, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={native.label} />
      </View>
    )
  }

  return (
    <View style={[lectureViewerRootStyle, { backgroundColor: native.groupedBackground }]}>
      <LectureSlidePreviewToolbar
        backLabel="Lectures"
        title={title}
        onBack={() => router.back()}
        onMenuPress={() => setToolsOpen(true)}
      />

      {loading ? (
        <View style={[lectureViewerWebHostStyle, { alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator size="large" color={native.label} />
        </View>
      ) : error ? (
        <View style={[lectureViewerWebHostStyle, { padding: 24, justifyContent: "center" }]}>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load" body={error} />
        </View>
      ) : (
        <View style={lectureViewerWebHostStyle}>
          <LectureDeckPdfViewer
            deckUrl={deckRequestUri}
            headers={deckHeaders}
            cacheKey={`student-lecture-${lectureId}`}
            initialPage={slideProgress.progressHydrated ? slideProgress.initialPage : 1}
            onDocumentLoaded={slideProgress.onDocumentLoaded}
            onPageChange={slideProgress.onPageChange}
          />
          <StudentLectureCoraOverlay
            session={session}
            lectureId={lectureId}
            week={week}
            title={title}
          />
        </View>
      )}

      <StudentLectureToolsSheet
        visible={toolsOpen}
        onClose={() => setToolsOpen(false)}
        lectureTitle={title}
        samplePracticeLabel={samplePracticeLabel}
        samplePracticeCount={samplePracticeCount}
        showSamplePractice={showSamplePractice}
        workspaceLabel={workspaceLabel}
        workspaceCount={workspaceCount}
        showWorkspace={showWorkspace}
        canDownload={canDownload}
        canOpenExternally={canOpenExternally}
        completed={completed}
        onToggleCompleted={() => void handleToggleCompleted()}
        onOpenSamplePractice={() =>
          router.push({
            pathname: "/lecture/[week]/sample-practice",
            params: { week: String(week), lectureId: String(lectureId) },
          } as never)
        }
        onOpenWorkspace={() =>
          router.push({
            pathname: "/lecture/[week]/workspace",
            params: { week: String(week), lectureId: String(lectureId) },
          } as never)
        }
        onDownloadSlides={() => void handleDownload()}
        onOpenExternally={() => void openLectureDeckExternally(deckUrl)}
      />

      {downloading ? (
        <View style={styles.downloadOverlay} pointerEvents="auto">
          <View style={[styles.downloadCard, { backgroundColor: native.secondaryGrouped }]}>
            <ActivityIndicator color={native.label} />
            <Text style={[type.secondary, { color: native.label }]}>Preparing slides…</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  downloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  downloadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
})
