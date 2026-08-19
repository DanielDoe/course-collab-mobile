import { useLocalSearchParams } from "expo-router"
import { FacultyLectureSlidePreviewScreen } from "../../../../src/components/faculty/FacultyLectureSlidePreviewScreen"

/** Instructor lecture preview — production web viewer (slides, workspace, sample practice). */
export default function FacultyLectureViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const lectureId = typeof id === "string" ? Number(id) : NaN

  return <FacultyLectureSlidePreviewScreen lectureId={lectureId} />
}
