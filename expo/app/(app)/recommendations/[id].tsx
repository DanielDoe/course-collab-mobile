import { Pressable, StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { StudentRecommendationDetailScreen } from "../../../src/components/course-info/StudentRecommendationDetailScreen"
import { useCourseInfoTheme } from "../../../src/components/course-info/course-info-shared"
import { useNativeType } from "../../../src/lib/themed-module-theme"

function InvalidRecommendation() {
  const router = useRouter()
  const theme = useCourseInfoTheme()
  const type = useNativeType()
  return (
    <View style={styles.center}>
      <Text style={type.secondary}>Request not found.</Text>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={{ color: theme.primary }}>Go back</Text>
      </Pressable>
    </View>
  )
}

export default function StudentRecommendationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const requestId = Number(id)
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return <InvalidRecommendation />
  }
  return <StudentRecommendationDetailScreen requestId={requestId} />
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  backBtn: { marginTop: 12 },
})
