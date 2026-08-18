import { StyleSheet, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { FacultyEmptyState } from "../faculty/faculty-shared"

/** Deep-link / bad param empty state for lecture viewer, workspace, and sample practice. */
export function LectureInvalidRoute() {
  const native = useThemedNative()
  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <FacultyEmptyState
        icon="alert-circle-outline"
        title="Lecture not found"
        body="This week or lecture link is invalid. Open Lectures from the Learning Center and pick a posted deck."
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
})
