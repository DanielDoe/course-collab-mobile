import { Stack } from "expo-router"

/** Detail flow pushed from Schedule Adjustment list — back chevron + edge swipe. */
export default function ScheduleAdjustmentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        animation: "slide_from_right",
      }}
    />
  )
}
