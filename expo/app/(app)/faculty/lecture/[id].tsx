import { useLocalSearchParams } from "expo-router"
import { FacultyLectureSlidePreviewScreen } from "../../../../src/components/faculty/FacultyLectureSlidePreviewScreen"

/** Native instructor slide preview — PDF deck with themed chrome (no web dashboard). */
export default function FacultyLectureViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const lectureId = typeof id === "string" ? Number(id) : NaN

  return <FacultyLectureSlidePreviewScreen lectureId={lectureId} />
}
