import { Component, useEffect, type ErrorInfo, type ReactNode } from "react"
import * as SplashScreen from "expo-splash-screen"
import { Stack } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { FullRootProviders } from "../src/components/root/FullRootProviders"
import { bootLog } from "../src/lib/boot-diagnostics"

bootLog("Root layout module evaluated")

const BOOT_BG = "#582c83"

type BootErrorState = { error: Error | null }

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

try {
  void SplashScreen.preventAutoHideAsync()
} catch {
  /* ignore */
}

export default function RootLayout() {
  useEffect(() => {
    bootLog("RootLayout mounted")
    globalThis.__CC_ROOT_LAYOUT_MOUNTED__ = true
    void SplashScreen.hideAsync().catch(() => {})
  }, [])

  return (
    <View style={styles.boot}>
      <BootErrorBoundary>
        <FullRootProviders>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
              contentStyle: { backgroundColor: BOOT_BG },
            }}
          />
        </FullRootProviders>
      </BootErrorBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: BOOT_BG,
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
