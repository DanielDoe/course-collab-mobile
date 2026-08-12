import { Platform, UIManager } from "react-native"
import {
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect"

let expoUiHostChecked = false
let expoUiHostAvailable = false

function isBlurViewAvailable(): boolean {
  if (Platform.OS === "web") return false
  try {
    return UIManager.getViewManagerConfig?.("ExpoBlurView") != null
  } catch {
    return false
  }
}

/** True when the Expo UI SwiftUI host view is linked in the native binary. */
export function isExpoUiHostAvailable(): boolean {
  if (Platform.OS !== "ios") return false
  if (expoUiHostChecked) return expoUiHostAvailable

  expoUiHostChecked = true
  try {
    const candidates = ["ExpoUI_HostView", "ExpoUIHostView", "HostView"]
    expoUiHostAvailable = candidates.some(
      (name) => UIManager.getViewManagerConfig?.(name) != null,
    )
  } catch {
    expoUiHostAvailable = false
  }

  return expoUiHostAvailable
}

/** iOS 26+ system Liquid Glass is available (expo-glass-effect probe). */
export function canUseSystemLiquidGlass(): boolean {
  if (Platform.OS !== "ios") return false
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable()
  } catch {
    return false
  }
}

export type LiquidGlassBackend = "expo-ui" | "glass-effect" | "blur" | "solid"

/** Alias matching community toolkit naming (`isLiquidGlassSupported`). */
export function isLiquidGlassSupported(): boolean {
  return canUseSystemLiquidGlass()
}

export function useLiquidGlassBackend(options?: {
  reduceTransparency?: boolean
}): LiquidGlassBackend {
  return resolveLiquidGlassBackend(options)
}

export function resolveLiquidGlassBackend(options?: {
  reduceTransparency?: boolean
}): LiquidGlassBackend {
  if (options?.reduceTransparency) return "solid"

  if (Platform.OS === "ios") {
    if (canUseSystemLiquidGlass() && isExpoUiHostAvailable()) return "expo-ui"
    if (canUseSystemLiquidGlass()) return "glass-effect"
    return isBlurViewAvailable() ? "blur" : "solid"
  }

  if (Platform.OS === "android" && isBlurViewAvailable()) return "blur"
  return "solid"
}
