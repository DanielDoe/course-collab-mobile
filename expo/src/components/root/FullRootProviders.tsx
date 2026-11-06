import { useEffect, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { QueryProvider } from "../../context/QueryProvider"
import { AppearanceProvider } from "../../context/AppearanceProvider"
import { NotificationProvider } from "../../context/NotificationProvider"
import { AppAlertProvider } from "../../context/AppAlertProvider"
import { AppToastProvider } from "../../context/AppToastProvider"
import { PresenceSelfProvider } from "../../context/PresenceSelfProvider"
import { StripeAppProvider } from "../../context/StripeAppProvider"
import { SystemErrorBoundary } from "../SystemErrorBoundary"
import { SystemErrorCapture } from "../SystemErrorCapture"
import { BootDiagnosticsShell } from "../BootDiagnosticsShell"
import { installEarlyStartupErrorCapture } from "../../lib/startup-error-capture"
import { bootLog } from "../../lib/boot-diagnostics"

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
            <QueryProvider>
              <SystemErrorCapture />
              <AppearanceProvider>
                <StripeAppProvider>
                  <AppAlertProvider>
                    <AppToastProvider>
                      <PresenceSelfProvider>
                        <NotificationProvider>
                          <SystemErrorBoundary>{children}</SystemErrorBoundary>
                        </NotificationProvider>
                      </PresenceSelfProvider>
                    </AppToastProvider>
                  </AppAlertProvider>
                </StripeAppProvider>
              </AppearanceProvider>
            </QueryProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </BootDiagnosticsShell>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
})
