import { StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { ScheduleAdjustmentDetailScreen } from "../../../src/components/course-info/ScheduleAdjustmentDetailScreen"
import { useThemedNative } from "../../../src/context/AppearanceProvider"
import { useNativeType } from "../../../src/lib/themed-module-theme"

function InvalidScheduleAdjustment() {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <View style={styles.center}>
        <Text style={type.secondary}>Request not found.</Text>
      </View>
    </View>
  )
}

export default function ScheduleAdjustmentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const requestId = Number(id)
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return <InvalidScheduleAdjustment />
  }
  return <ScheduleAdjustmentDetailScreen requestId={requestId} />
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
})
