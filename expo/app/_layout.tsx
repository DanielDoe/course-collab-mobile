import "react-native-gesture-handler"
import "react-native-reanimated"
import * as SplashScreen from "expo-splash-screen"
import { Stack } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { StyleSheet } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { SessionProvider } from "../src/context/SessionProvider"
import { AppearanceProvider } from "../src/context/AppearanceProvider"
import { NotificationProvider } from "../src/context/NotificationProvider"
import { AppAlertProvider } from "../src/context/AppAlertProvider"
import { PresenceSelfProvider } from "../src/context/PresenceSelfProvider"
import { StripeAppProvider } from "../src/context/StripeAppProvider"
import { SystemErrorBoundary } from "../src/components/SystemErrorBoundary"
import { SystemErrorCapture } from "../src/components/SystemErrorCapture"
import { runProductionGuard } from "../src/config/production-guard"

void SplashScreen.preventAutoHideAsync().catch(() => {})

if (typeof __DEV__ === "undefined" || !__DEV__) {
  const productionGuard = runProductionGuard()
  if (!productionGuard.ok) {
    throw new Error(`Production configuration invalid:\n${productionGuard.errors.join("\n")}`)
  }
}

export default function RootLayout() {
  return (
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
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
