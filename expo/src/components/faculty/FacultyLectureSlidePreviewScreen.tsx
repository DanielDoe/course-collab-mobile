import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"
import { useRouter } from "expo-router"
import { ApiError } from "../../lib/api"
import { fetchFacultyLectureViewerData } from "../../lib/faculty-lecture-viewer-api"
import { buildFacultyDeckRequest } from "../../lib/use-lecture-deck-source"
import {
  canOpenLectureDeckExternally,
  openLectureDeckExternally,
  shareLectureDeckPdf,
} from "../../lib/lecture-deck-actions"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useThemedNative } from "../../context/AppearanceProvider"
import type { InstructorLecture } from "../../lib/instructor-api"
import type { LectureSamplePracticeConfig, LectureWorkspaceConfig } from "../../lib/lecture-types"
import { FacultyLectureSamplePracticeModal } from "./FacultyLectureSamplePracticeModal"
import { FacultyLectureWorkspaceModal } from "./FacultyLectureWorkspaceModal"
import { FacultyEmptyState } from "./faculty-shared"
import { LectureDeckPdfViewer } from "../lectures/LectureDeckPdfViewer"
import { LectureSlidePreviewToolbar } from "../lectures/LectureSlidePreviewToolbar"
import { StudentLectureToolsSheet } from "../lectures/StudentLectureToolsSheet"
import { lectureViewerRootStyle, lectureViewerWebHostStyle } from "../lectures/lecture-viewer-layout"

type Props = {
  lectureId: number
}

/** Instructor lecture preview — native PDF deck with tools action sheet. */
export function FacultyLectureSlidePreviewScreen({ lectureId }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const { scope, ready } = useFacultyScope()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lecture, setLecture] = useState<InstructorLecture | null>(null)
  const [samplePractice, setSamplePractice] = useState<LectureSamplePracticeConfig | null>(null)
  const [workspace, setWorkspace] = useState<LectureWorkspaceConfig | null>(null)
  const [deckUrl, setDeckUrl] = useState<string | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [samplePracticeOpen, setSamplePracticeOpen] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const load = useCallback(async () => {
    if (!scope || !Number.isFinite(lectureId) || lectureId <= 0) return
    setError("")
    try {
      const data = await fetchFacultyLectureViewerData(scope, lectureId)
      setLecture(data.lecture)
      setSamplePractice(data.samplePractice)
      setWorkspace(data.workspace)
      setDeckUrl(data.deckUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load lecture.")
    }
  }, [scope, lectureId])

  useEffect(() => {
    if (!scope || !ready) {
      setLoading(false)
      if (!Number.isFinite(lectureId) || lectureId <= 0) setError("Invalid lecture.")
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [scope, ready, lectureId, load])

  const deckRequest = buildFacultyDeckRequest(deckUrl, scope ?? undefined)
  const title = lecture?.title?.trim() || "Lecture preview"
  const samplePracticeLabel = samplePractice?.button_label?.trim() || "Sample Practice"
  const workspaceLabel = workspace?.button_label?.trim() || workspace?.title?.trim() || "Workspace"
  const samplePracticeCount = samplePractice?.questions.length ?? 0
  const workspaceCount = workspace?.questions.length ?? 0
  const canDownload = Boolean(deckRequest?.uri)
  const canOpenExternally = canOpenLectureDeckExternally(deckUrl)

  async function handleDownload() {
    if (!deckRequest) return
    await shareLectureDeckPdf(deckRequest, title)
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
      ) : scope ? (
        <View style={lectureViewerWebHostStyle}>
          <LectureDeckPdfViewer
            deckUrl={deckRequest?.uri ?? null}
            headers={deckRequest?.headers}
            cacheKey={`faculty-lecture-${lectureId}`}
          />
        </View>
      ) : null}

      <StudentLectureToolsSheet
        visible={toolsOpen}
        onClose={() => setToolsOpen(false)}
        lectureTitle={title}
        samplePracticeLabel={samplePracticeLabel}
        samplePracticeCount={samplePracticeCount}
        showSamplePractice={samplePracticeCount > 0}
        workspaceLabel={workspaceLabel}
        workspaceCount={workspaceCount}
        showWorkspace={workspaceCount > 0}
        canDownload={canDownload}
        canOpenExternally={canOpenExternally}
        onOpenSamplePractice={() => setSamplePracticeOpen(true)}
        onOpenWorkspace={() => setWorkspaceOpen(true)}
        onDownloadSlides={() => void handleDownload()}
        onOpenExternally={() => void openLectureDeckExternally(deckUrl)}
      />

      <FacultyLectureSamplePracticeModal
        visible={samplePracticeOpen}
        lecture={lecture}
        onClose={() => setSamplePracticeOpen(false)}
      />
      <FacultyLectureWorkspaceModal
        visible={workspaceOpen}
        lecture={lecture}
        onClose={() => setWorkspaceOpen(false)}
      />
    </View>
  )
}
