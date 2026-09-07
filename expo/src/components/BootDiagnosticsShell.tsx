import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Constants from "expo-constants"
import {
  buildBootReportText,
  emailBootReport,
  formatBootLogLine,
  getBootLogs,
  isBootComplete,
  sendBootReportToServer,
  subscribeBootLogs,
} from "../lib/boot-diagnostics"
import { hideAppSplashFireAndForget } from "../lib/app-splash"
import { startupBootDiagnosticId } from "../lib/startup-boot-id"

type Props = {
  children: ReactNode
}

const WATCHDOG_MS = 12_000
const AUTO_HIDE_AFTER_READY_MS = 1_500

export function BootDiagnosticsShell({ children }: Props) {
  // Only surface the panel if boot stalls — normal Release boots should not cover the app.
  const [visible, setVisible] = useState(false)
  const [logs, setLogs] = useState(getBootLogs)
  const [sending, setSending] = useState<"email" | "server" | null>(null)
  const [watchdog, setWatchdog] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const diagnosticId = useMemo(
    () => startupBootDiagnosticId(logs.map((entry) => entry.message).join("|") || "boot"),
    [logs],
  )

  const refreshLogs = useCallback(() => setLogs(getBootLogs()), [])

  useEffect(() => {
    refreshLogs()
    return subscribeBootLogs(refreshLogs)
  }, [refreshLogs])

  const onPanelLayout = useCallback(() => {
    hideAppSplashFireAndForget()
  }, [])

  useEffect(() => {
    if (dismissed || (typeof __DEV__ !== "undefined" && __DEV__)) return
    const timer = setTimeout(() => {
      if (!isBootComplete()) {
        setWatchdog(true)
        setVisible(true)
        hideAppSplashFireAndForget()
      }
    }, WATCHDOG_MS)
    return () => clearTimeout(timer)
  }, [dismissed])

  useEffect(() => {
    if (!isBootComplete() || dismissed) return
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_AFTER_READY_MS)
    return () => clearTimeout(timer)
  }, [logs, dismissed])

  const handleEmail = useCallback(async () => {
    setSending("email")
    try {
      const ok = await emailBootReport()
      if (!ok) {
        refreshLogs()
      }
    } finally {
      setSending(null)
    }
  }, [refreshLogs])

  const handleServer = useCallback(async () => {
    setSending("server")
    try {
      await sendBootReportToServer()
      refreshLogs()
    } finally {
      setSending(null)
    }
  }, [refreshLogs])

  const version = Constants.expoConfig?.version ?? "1.0.0"
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? "?"

  return (
    <View style={styles.host}>
      {children}
      {visible && !dismissed ? (
        <View style={styles.overlay} onLayout={onPanelLayout}>
          <View style={styles.panel}>
            <Text style={styles.brand}>CourseCollab — Boot Diagnostics</Text>
            <Text style={styles.subtitle}>
              TestFlight startup trace (build {version} / {buildNumber})
            </Text>
            <Text style={styles.diagnostic}>ID: {diagnosticId}</Text>
            {watchdog ? (
              <Text style={styles.watchdog}>
                Startup is taking longer than expected. Send the report below so we can fix it.
              </Text>
            ) : (
              <Text style={styles.watchdogMuted}>Loading app… this panel hides when boot completes.</Text>
            )}
            <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent}>
              {logs.length === 0 ? (
                <Text style={styles.logLine}>Waiting for first boot log…</Text>
              ) : (
                logs.map((entry, index) => (
                  <Text
                    key={`${entry.ts}-${index}`}
                    style={[
                      styles.logLine,
                      entry.level === "error" && styles.logError,
                      entry.level === "warn" && styles.logWarn,
                    ]}
                  >
                    {formatBootLogLine(entry)}
                  </Text>
                ))
              )}
            </ScrollView>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => void handleEmail()}
                disabled={sending !== null}
              >
                {sending === "email" ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Email report</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => void handleServer()}
                disabled={sending !== null}
              >
                {sending === "server" ? (
                  <ActivityIndicator color="#582c83" />
                ) : (
                  <Text style={styles.btnSecondaryText}>Send to server</Text>
                )}
              </Pressable>
              {isBootComplete() ? (
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setDismissed(true)}>
                  <Text style={styles.btnGhostText}>Continue</Text>
                </Pressable>
              ) : null}
            </View>
            <Text selectable style={styles.reportPreview} numberOfLines={4}>
              {buildBootReportText().slice(0, 280)}…
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#582c83",
  },
  panel: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: "#E9D5FF",
    fontSize: 13,
  },
  diagnostic: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Menlo",
    opacity: 0.9,
  },
  watchdog: {
    color: "#FEE2E2",
    fontSize: 14,
    lineHeight: 20,
  },
  watchdogMuted: {
    color: "#DDD6FE",
    fontSize: 13,
  },
  logScroll: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    marginTop: 4,
  },
  logContent: {
    padding: 12,
    gap: 4,
  },
  logLine: {
    color: "#F8FAFC",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Menlo",
  },
  logWarn: {
    color: "#FDE68A",
  },
  logError: {
    color: "#FCA5A5",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 120,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#FFFFFF",
  },
  btnPrimaryText: {
    color: "#582c83",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: "#E9D5FF",
  },
  btnSecondaryText: {
    color: "#582c83",
    fontWeight: "600",
    fontSize: 14,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E9D5FF",
  },
  btnGhostText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  reportPreview: {
    color: "#DDD6FE",
    fontSize: 10,
    fontFamily: "Menlo",
    opacity: 0.8,
  },
})
