import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"
import { Stack } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { InteractionManager, StyleSheet, View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { SessionProvider } from "../src/context/SessionProvider"
import { AppearanceProvider } from "../src/context/AppearanceProvider"
import { NotificationProvider } from "../src/context/NotificationProvider"
import { AppAlertProvider } from "../src/context/AppAlertProvider"
import { PresenceSelfProvider } from "../src/context/PresenceSelfProvider"
import { StripeAppProvider } from "../src/context/StripeAppProvider"
import { SystemErrorBoundary } from "../src/components/SystemErrorBoundary"
import { SystemErrorCapture } from "../src/components/SystemErrorCapture"
import { ProductionStartupGate } from "../src/components/ProductionStartupGate"
import { installEarlyStartupErrorCapture } from "../src/lib/startup-error-capture"
import { bootLog } from "../src/lib/boot-diagnostics"

bootLog("Root layout module evaluated")

/** iOS 26 + New Arch: defer native TurboModule void calls until after first frame. */
function useNativeBootReady() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const failsafe = setTimeout(() => {
      if (!cancelled) setReady(true)
    }, 1500)

    const interaction = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setReady(true)
      })
    })

    return () => {
      cancelled = true
      clearTimeout(failsafe)
      interaction.cancel()
    }
  }, [])

  return ready
}

export default function RootLayout() {
  const nativeBootReady = useNativeBootReady()

  useEffect(() => {
    if (!nativeBootReady) return
    globalThis.__CC_ROOT_LAYOUT_MOUNTED__ = true
    bootLog("RootLayout mounted")
    installEarlyStartupErrorCapture()
    void SplashScreen.preventAutoHideAsync().catch(() => {
      bootLog("SplashScreen.preventAutoHideAsync failed", "warn")
    })
  }, [nativeBootReady])

  if (!nativeBootReady) {
    return <View style={styles.bootPlaceholder} />
  }

  return (
    <ProductionStartupGate>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <SessionProvider>
            <SystemErrorCapture />
            <AppearanceProvider>
              <StripeAppProvider>
                <AppAlertProvider>
                  <PresenceSelfProvider>
                    <NotificationProvider>
                      <SystemErrorBoundary>
                        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                          <Stack.Screen name="index" options={{ animation: "fade" }} />
                          <Stack.Screen name="(auth)" options={{ animation: "slide_from_right" }} />
                          <Stack.Screen
                            name="(app)"
                            options={{
                              animation: "fade",
                              gestureEnabled: false,
                            }}
                          />
                          <Stack.Screen name="dev-student-login" />
                          <Stack.Screen name="dev-faculty-login" />
                          <Stack.Screen name="dev-cora-cleanup" />
                          <Stack.Screen name="dev-onboarding-preview" />
                        </Stack>
                      </SystemErrorBoundary>
                    </NotificationProvider>
                  </PresenceSelfProvider>
                </AppAlertProvider>
              </StripeAppProvider>
            </AppearanceProvider>
          </SessionProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ProductionStartupGate>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bootPlaceholder: { flex: 1, backgroundColor: "#F8FAFC" },
})
