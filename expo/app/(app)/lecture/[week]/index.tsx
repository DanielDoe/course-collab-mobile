import { useLocalSearchParams } from "expo-router"
import { LectureInvalidRoute } from "../../../../src/components/lectures/LectureInvalidRoute"
import { StudentLectureViewerScreen } from "../../../../src/components/lectures/StudentLectureViewerScreen"

/** Student lecture viewer — production web shell with workspace & sample practice. */
export default function LectureViewerScreen() {
  const { week, lectureId } = useLocalSearchParams<{ week: string; lectureId: string }>()
  const weekNum = typeof week === "string" ? Number(week) : NaN
  const lectureNum = typeof lectureId === "string" ? Number(lectureId) : NaN

  if (!Number.isFinite(weekNum) || weekNum < 1 || !Number.isFinite(lectureNum) || lectureNum < 1) {
    return <LectureInvalidRoute />
  }

  return <StudentLectureViewerScreen lectureId={lectureNum} week={weekNum} />
}
