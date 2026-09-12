import { Stack } from "expo-router"
import { useThemedNative } from "../../../src/context/AppearanceProvider"

export default function AssessmentLayout() {
  const native = useThemedNative()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { flex: 1, backgroundColor: native.groupedBackground },
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="take/[id]" />
      <Stack.Screen name="report/[attemptId]" />
    </Stack>
  )
}
