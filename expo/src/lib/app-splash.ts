import * as SplashScreen from "expo-splash-screen"

let preventPromise: Promise<boolean> | null = null
let hidden = false

/** Call once at app root before any hide attempt. */
export function initAppSplash(): Promise<boolean> {
  if (!preventPromise) {
    preventPromise = SplashScreen.preventAutoHideAsync()
      .then(() => true)
      .catch(() => false)
  }
  return preventPromise
}

/** Hide the native splash once — safe to call from multiple routes. */
export async function hideAppSplash(): Promise<void> {
  if (hidden) return

  try {
    await initAppSplash()
  } catch {
    /* preventAutoHide may fail on some builds — still try to hide. */
  }

  try {
    await SplashScreen.hideAsync()
    hidden = true
  } catch {
    /* Native splash may already be gone on this view controller. */
  }
}

export function hideAppSplashFireAndForget(): void {
  void hideAppSplash()
}

/** Last-resort hide if React mounted but onLayout never fired. */
export function scheduleSplashHideFallback(delayMs = 800): () => void {
  const timer = setTimeout(() => {
    hideAppSplashFireAndForget()
  }, delayMs)
  return () => clearTimeout(timer)
}
