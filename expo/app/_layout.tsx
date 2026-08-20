import { Component, useEffect, type ErrorInfo, type ReactNode } from "react"
import * as SplashScreen from "expo-splash-screen"
import { Stack } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { StyleSheet, Text, View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { SessionProvider } from "../src/context/SessionProvider"
import { AppearanceProvider } from "../src/context/AppearanceProvider"
import { NotificationProvider } from "../src/context/NotificationProvider"
import { AppAlertProvider } from "../src/context/AppAlertProvider"
import { PresenceSelfProvider } from "../src/context/PresenceSelfProvider"
import { StripeAppProvider } from "../src/context/StripeAppProvider"
import { SystemErrorBoundary } from "../src/components/SystemErrorBoundary"
import { SystemErrorCapture } from "../src/components/SystemErrorCapture"
import { installEarlyStartupErrorCapture } from "../src/lib/startup-error-capture"
import { bootLog } from "../src/lib/boot-diagnostics"

bootLog("Root layout module evaluated")

const BOOT_BG = "#582c83"

type BootErrorState = { error: Error | null }

/** Catches render crashes above SystemErrorBoundary (hooks outside Stack, etc.). */
class BootErrorBoundary extends Component<{ children: ReactNode }, BootErrorState> {
  state: BootErrorState = { error: null }

  static getDerivedStateFromError(error: Error): BootErrorState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    bootLog(`BootErrorBoundary: ${error.message}`, "error")
    bootLog(info.componentStack ?? "", "error")
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.boot}>
          <Text style={styles.brand}>CourseCollab</Text>
          <Text style={styles.title}>Startup render failed</Text>
          <Text selectable style={styles.detail}>
            {this.state.error.message}
          </Text>
        </View>
      )
    }
    return this.props.children
  }
}

function hideSplash() {
  try {
    SplashScreen.hide()
  } catch {
    /* older API */
  }
  void SplashScreen.hideAsync().catch(() => {})
}

export default function RootLayout() {
  useEffect(() => {
    globalThis.__CC_ROOT_LAYOUT_MOUNTED__ = true
    bootLog("RootLayout mounted")
    installEarlyStartupErrorCapture()
    hideSplash()
    const t1 = setTimeout(hideSplash, 400)
    const t2 = setTimeout(hideSplash, 2000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <View style={styles.boot}>
      <Text style={styles.bootMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        CourseCollab
      </Text>
      <BootErrorBoundary>
        <GestureHandlerRootView style={styles.fill}>
          <SafeAreaProvider>
            <SessionProvider>
              <SystemErrorCapture />
              <AppearanceProvider>
                <StripeAppProvider>
                  <AppAlertProvider>
                    <PresenceSelfProvider>
                      <NotificationProvider>
                        <SystemErrorBoundary>
                          <Stack
                            screenOptions={{
                              headerShown: false,
                              animation: "none",
                              contentStyle: { backgroundColor: BOOT_BG },
                            }}
                          >
                            <Stack.Screen name="index" />
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
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
      </BootErrorBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: BOOT_BG,
  },
  fill: {
    flex: 1,
    backgroundColor: BOOT_BG,
  },
  bootMark: {
    position: "absolute",
    top: 72,
    alignSelf: "center",
    zIndex: 0,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  brand: {
    marginTop: 72,
    marginHorizontal: 24,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    marginTop: 12,
    marginHorizontal: 24,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  detail: {
    marginTop: 16,
    marginHorizontal: 24,
    color: "#E9D5FF",
    fontSize: 13,
    lineHeight: 18,
  },
})
