import { useLocalSearchParams } from "expo-router"
import { LectureInvalidRoute } from "../../../../src/components/lectures/LectureInvalidRoute"
import { StudentLectureSamplePracticeScreen } from "../../../../src/components/lectures/StudentLectureSamplePracticeScreen"

export default function LectureSamplePracticeRoute() {
  const { week, lectureId } = useLocalSearchParams<{ week: string; lectureId: string }>()
  const weekNum = typeof week === "string" ? Number(week) : NaN
  const lectureNum = typeof lectureId === "string" ? Number(lectureId) : NaN

  if (!Number.isFinite(weekNum) || weekNum < 1 || !Number.isFinite(lectureNum) || lectureNum < 1) {
    return <LectureInvalidRoute />
  }

  return <StudentLectureSamplePracticeScreen lectureId={lectureNum} week={weekNum} />
}
