import { Platform } from "react-native"
import * as Haptics from "expo-haptics"

export type MotionHaptic = "selection" | "light" | "success" | "warning"

/**
 * Sparse haptics. Call only for meaningful state changes — sheet open,
 * successful save, destructive confirm, important toggle. Never per-tap cards.
 */
export function triggerMotionHaptic(kind: MotionHaptic): void {
  if (Platform.OS !== "ios") return
  switch (kind) {
    case "selection":
      void Haptics.selectionAsync()
      return
    case "light":
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      return
    case "success":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      return
    case "warning":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  }
}
