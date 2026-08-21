import { useEffect, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { SessionProvider } from "../../context/SessionProvider"
import { AppearanceProvider } from "../../context/AppearanceProvider"
import { NotificationProvider } from "../../context/NotificationProvider"
import { AppAlertProvider } from "../../context/AppAlertProvider"
import { PresenceSelfProvider } from "../../context/PresenceSelfProvider"
import { StripeAppProvider } from "../../context/StripeAppProvider"
import { SystemErrorBoundary } from "../SystemErrorBoundary"
import { SystemErrorCapture } from "../SystemErrorCapture"
import { BootDiagnosticsShell } from "../BootDiagnosticsShell"
import { installEarlyStartupErrorCapture } from "../../lib/startup-error-capture"
import { bootLog } from "../../lib/boot-diagnostics"

const BOOT_BG = "#582c83"

export function FullRootProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    installEarlyStartupErrorCapture()
    bootLog("FullRootProviders mounted")
  }, [])

  return (
    <BootDiagnosticsShell>
      <GestureHandlerRootView style={styles.fill}>
        <View style={styles.fill}>
          <SafeAreaProvider>
            <SessionProvider>
              <SystemErrorCapture />
              <AppearanceProvider>
                <StripeAppProvider>
                  <AppAlertProvider>
                    <PresenceSelfProvider>
                      <NotificationProvider>
                        <SystemErrorBoundary>{children}</SystemErrorBoundary>
                      </NotificationProvider>
                    </PresenceSelfProvider>
                  </AppAlertProvider>
                </StripeAppProvider>
              </AppearanceProvider>
            </SessionProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </BootDiagnosticsShell>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: BOOT_BG,
  },
})
