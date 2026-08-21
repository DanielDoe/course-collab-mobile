import { bootLog } from "./boot-diagnostics"

type RNErrorUtils = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void
}

let capturedMessage: string | null = null
let installed = false

function formatStartupError(error: unknown): string {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join("\n")
  }
  return String(error)
}

function readImportStartupError(): string | null {
  return (globalThis as { __COURSECOLLAB_STARTUP_IMPORT_ERROR__?: string })
    .__COURSECOLLAB_STARTUP_IMPORT_ERROR__ ?? null
}

function getErrorUtils(): RNErrorUtils | null {
  try {
    const rn = require("react-native") as { ErrorUtils?: RNErrorUtils }
    return rn.ErrorUtils ?? (globalThis as { ErrorUtils?: RNErrorUtils }).ErrorUtils ?? null
  } catch {
    return (globalThis as { ErrorUtils?: RNErrorUtils }).ErrorUtils ?? null
  }
}

/** Capture fatal JS errors before React mounts (release builds only). */
export function installEarlyStartupErrorCapture(onError?: (message: string) => void): void {
  if (installed || (typeof __DEV__ !== "undefined" && __DEV__)) return

  const ErrorUtils = getErrorUtils()
  if (!ErrorUtils?.getGlobalHandler || !ErrorUtils?.setGlobalHandler) {
    bootLog("ErrorUtils not available — skipping early handler", "warn")
    return
  }

  installed = true

  const previous = ErrorUtils.getGlobalHandler()
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const message = formatStartupError(error)
    if (!capturedMessage) {
      capturedMessage = message
      bootLog(`Global handler (${isFatal ? "fatal" : "error"}): ${message}`, "error")
      onError?.(message)
    }
    previous?.(error, isFatal)
  })
}

export function peekStartupError(): string | null {
  return capturedMessage ?? readImportStartupError()
}

export function recordStartupImportError(error: unknown): void {
  const message = formatStartupError(error)
  if (!capturedMessage) capturedMessage = message
  ;(globalThis as { __COURSECOLLAB_STARTUP_IMPORT_ERROR__?: string }).__COURSECOLLAB_STARTUP_IMPORT_ERROR__ =
    message
  bootLog(`Import error: ${message}`, "error")
}
