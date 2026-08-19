import Constants from "expo-constants"
import { Linking, Platform } from "react-native"
import { startupBootDiagnosticId } from "./startup-boot-id"

export type BootLogLevel = "info" | "warn" | "error"

export type BootLogEntry = {
  ts: number
  level: BootLogLevel
  message: string
}

const MAX_LOGS = 200
const BOOT_REPORT_EMAIL = "danieldoe33@icloud.com"

type BootDiagnosticsGlobal = {
  __CC_BOOT_LOGS__?: BootLogEntry[]
  __CC_BOOT_LISTENERS__?: Set<() => void>
  __CC_BOOT_COMPLETE__?: boolean
  __CC_BOOT_ERROR__?: string | null
}

function store(): BootDiagnosticsGlobal {
  return globalThis as BootDiagnosticsGlobal
}

function emitChange(): void {
  store().__CC_BOOT_LISTENERS__?.forEach((listener) => {
    try {
      listener()
    } catch {
      /* ignore */
    }
  })
}

/** Append a boot checkpoint — safe to call before React mounts (index.js). */
export function bootLog(message: string, level: BootLogLevel = "info"): void {
  const entry: BootLogEntry = { ts: Date.now(), level, message }
  const logs = store().__CC_BOOT_LOGS__ ?? []
  logs.push(entry)
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS)
  store().__CC_BOOT_LOGS__ = logs

  if (level === "error") store().__CC_BOOT_ERROR__ = message

  const prefix = level === "error" ? "[BOOT_ERROR]" : level === "warn" ? "[BOOT_WARN]" : "[BOOT]"
  console.log(`${prefix} ${message}`)
  emitChange()
}

export function subscribeBootLogs(listener: () => void): () => void {
  const listeners = store().__CC_BOOT_LISTENERS__ ?? new Set()
  listeners.add(listener)
  store().__CC_BOOT_LISTENERS__ = listeners
  return () => listeners.delete(listener)
}

export function getBootLogs(): BootLogEntry[] {
  return [...(store().__CC_BOOT_LOGS__ ?? [])]
}

export function peekBootError(): string | null {
  return store().__CC_BOOT_ERROR__ ?? null
}

export function markBootComplete(note = "application ready"): void {
  store().__CC_BOOT_COMPLETE__ = true
  bootLog(note)
  emitChange()
}

export function isBootComplete(): boolean {
  return store().__CC_BOOT_COMPLETE__ === true
}

export function shouldShowBootDiagnostics(): boolean {
  if (typeof __DEV__ !== "undefined" && __DEV__) return false
  return !isBootComplete()
}

export function formatBootLogLine(entry: BootLogEntry): string {
  const time = new Date(entry.ts).toISOString().slice(11, 23)
  const tag = entry.level === "error" ? "ERR" : entry.level === "warn" ? "WRN" : "INF"
  return `${time} ${tag} ${entry.message}`
}

export function buildBootReportText(): string {
  const logs = getBootLogs()
  const error = peekBootError()
  const version = Constants.expoConfig?.version ?? "?"
  const build =
    Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber ?? "?"
      : String(Constants.expoConfig?.android?.versionCode ?? "?")

  const header = [
    "CourseCollab Boot Report",
    `Diagnostic: ${startupBootDiagnosticId(logs.map((l) => l.message).join("|") || "empty")}`,
    `Platform: ${Platform.OS} ${String(Platform.Version)}`,
    `App: ${version} (${build})`,
    `Environment: production`,
    error ? `Last error: ${error}` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n")

  const body = logs.map(formatBootLogLine).join("\n")
  return `${header}\n${body || "(no boot logs recorded)"}`
}

export async function emailBootReport(): Promise<boolean> {
  const report = buildBootReportText()
  const subject = encodeURIComponent("CourseCollab TestFlight Boot Report")
  const body = encodeURIComponent(report.slice(0, 8000))
  const url = `mailto:${BOOT_REPORT_EMAIL}?subject=${subject}&body=${body}`
  try {
    const can = await Linking.canOpenURL(url)
    if (!can) return false
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

export async function sendBootReportToServer(): Promise<boolean> {
  try {
    const { reportMobileClientError } = await import("./system-log-client")
    const report = buildBootReportText()
    reportMobileClientError({
      severity: "critical",
      category: "frontend",
      title: "TestFlight boot diagnostics",
      description: report.slice(0, 8000),
      errorMessage: peekBootError() ?? "Boot did not complete",
      moduleName: "boot",
      featureName: "startup",
      metadata: {
        bootLogCount: getBootLogs().length,
        bootComplete: isBootComplete(),
        platform: Platform.OS,
        osVersion: String(Platform.Version),
      },
    })
    const { flushMobileLogsNow } = await import("./system-log-client")
    await flushMobileLogsNow()
    bootLog("Boot report queued for server upload", "info")
    return true
  } catch (error) {
    bootLog(`Server report failed: ${error instanceof Error ? error.message : String(error)}`, "error")
    return false
  }
}
