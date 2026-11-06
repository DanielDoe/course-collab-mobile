import { AppState, Platform, type AppStateStatus } from "react-native"

type ExpoUpdatesModule = typeof import("expo-updates")

/**
 * Lazy-load expo-updates so Debug binaries that predate the native module
 * (or Metro-only reloads) do not crash the root layout on import.
 */
function loadUpdates(): ExpoUpdatesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-updates") as ExpoUpdatesModule
  } catch {
    return null
  }
}

/**
 * Fetch and apply EAS Update OTA bundles in release builds.
 * Dev / Expo Go / binaries without ExpoUpdates skip — Metro owns the JS there.
 */
export async function checkAndApplyEasUpdate(reason: "launch" | "foreground"): Promise<void> {
  if (__DEV__) return
  if (Platform.OS === "web") return

  const Updates = loadUpdates()
  if (!Updates?.isEnabled) return

  try {
    const result = await Updates.checkForUpdateAsync()
    if (!result.isAvailable) return

    const fetched = await Updates.fetchUpdateAsync()
    if (!fetched.isNew) return

    // Apply immediately so JS fixes (message HTML, etc.) land without a store review.
    await Updates.reloadAsync()
  } catch (error) {
    console.warn(`[eas-update] ${reason} check failed:`, error)
  }
}

/** One-shot launch check + re-check when returning from background. */
export function startEasUpdateListener(): () => void {
  if (__DEV__ || Platform.OS === "web") return () => undefined
  if (!loadUpdates()?.isEnabled) return () => undefined

  void checkAndApplyEasUpdate("launch")

  let lastState: AppStateStatus = AppState.currentState
  const sub = AppState.addEventListener("change", (next) => {
    if (lastState.match(/inactive|background/) && next === "active") {
      void checkAndApplyEasUpdate("foreground")
    }
    lastState = next
  })

  return () => sub.remove()
}
