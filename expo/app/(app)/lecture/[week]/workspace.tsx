import { StyleSheet, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useThemedNative } from "../../../../src/context/AppearanceProvider"
import { StudentLectureWorkspaceScreen } from "../../../../src/components/lectures/StudentLectureWorkspaceScreen"

export default function LectureWorkspaceRoute() {
  const native = useThemedNative()
  const { week, lectureId } = useLocalSearchParams<{ week: string; lectureId: string }>()
  const weekNum = typeof week === "string" ? Number(week) : NaN
  const lectureNum = typeof lectureId === "string" ? Number(lectureId) : NaN

  if (!Number.isFinite(weekNum) || !Number.isFinite(lectureNum)) {
    return <View style={[styles.root, { backgroundColor: native.groupedBackground }]} />
  }

  return <StudentLectureWorkspaceScreen lectureId={lectureNum} week={weekNum} />
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
