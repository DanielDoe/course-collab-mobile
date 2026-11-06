import { Platform } from "react-native"
import * as Haptics from "expo-haptics"

export type MotionHaptic = "selection" | "light" | "heavy" | "success" | "warning" | "error"

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
    case "heavy":
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      return
    case "success":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      return
    case "warning":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    case "error":
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  }
}
