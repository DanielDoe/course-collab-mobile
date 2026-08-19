import { useEffect, useMemo, useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { ApiError } from "../../lib/api"
import { fetchStudentLectureViewerData } from "../../lib/student-lecture-api"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { useThemedNative } from "../../context/AppearanceProvider"
import { buildStudentLectureViewerPath } from "../../constants/module-web-paths"
import { buildStudentLectureImmersiveLayoutInjectScript } from "../../lib/web-session-inject"
import { WebModuleScreen } from "../modules/WebModuleScreen"
import { LectureSlidePreviewToolbar } from "./LectureSlidePreviewToolbar"
import { lectureViewerRootStyle, lectureViewerWebHostStyle } from "./lecture-viewer-layout"

type Props = {
  lectureId: number
  week: number
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

/**
 * Student lecture viewer — production web shell (PDF canvas, workspace, sample practice)
 * with native back chrome. Matches /student/dashboard-v2/lectures/:week?lectureId=.
 */
export function StudentLectureViewerScreen({ lectureId, week }: Props) {
  const router = useRouter()
  const session = useStudentSession()
  const native = useThemedNative()
  const [title, setTitle] = useState(`Week ${week}`)

  const webPath = useMemo(
    () => buildStudentLectureViewerPath(lectureId, week),
    [lectureId, week],
  )
  const layoutInjectScript = useMemo(() => buildStudentLectureImmersiveLayoutInjectScript(), [])

  useEffect(() => {
    if (!session || !Number.isFinite(lectureId)) return
    let cancelled = false
    void fetchStudentLectureViewerData(session, lectureId)
      .then((data) => {
        if (!cancelled) {
          setTitle(data.lecture.title?.trim() || `Week ${week}`)
        }
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          setTitle(`Week ${week}`)
        }
      })
    return () => {
      cancelled = true
    }
  }, [session, lectureId, week])

  if (!session) {
    return null
  }

  return (
    <View style={[lectureViewerRootStyle, { backgroundColor: native.groupedBackground }]}>
      <LectureSlidePreviewToolbar
        backLabel="Lectures"
        title={title}
        onBack={() => router.back()}
      />
      <View style={lectureViewerWebHostStyle}>
        <WebModuleScreen
          webPath={webPath}
          immersive
          immersiveLecture
          insetTop={false}
          extraInjectScript={layoutInjectScript}
        />
      </View>
    </View>
  )
}
