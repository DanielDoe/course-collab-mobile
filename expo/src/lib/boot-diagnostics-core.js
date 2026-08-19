/** Plain JS boot log buffer — safe before React Native fully initializes. */
const MAX_LOGS = 200

function store() {
  return globalThis
}

function emitChange() {
  store().__CC_BOOT_LISTENERS__?.forEach((listener) => {
    try {
      listener()
    } catch {
      /* ignore */
    }
  })
}

function bootLog(message, level = "info") {
  const entry = { ts: Date.now(), level, message: String(message) }
  const logs = store().__CC_BOOT_LOGS__ ?? []
  logs.push(entry)
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS)
  store().__CC_BOOT_LOGS__ = logs
  if (level === "error") store().__CC_BOOT_ERROR__ = String(message)
  const prefix = level === "error" ? "[BOOT_ERROR]" : level === "warn" ? "[BOOT_WARN]" : "[BOOT]"
  console.log(`${prefix} ${message}`)
  emitChange()
}

function recordStartupImportError(error) {
  const message =
    error instanceof Error
      ? [error.message, error.stack].filter(Boolean).join("\n")
      : String(error)
  store().__COURSECOLLAB_STARTUP_IMPORT_ERROR__ = message
  bootLog(`Import error: ${message}`, "error")
}

function installEarlyStartupErrorCapture(onError) {
  if (store().__CC_BOOT_CAPTURE_INSTALLED__) return
  store().__CC_BOOT_CAPTURE_INSTALLED__ = true

  try {
    const { ErrorUtils } = require("react-native")
    const previous = ErrorUtils.getGlobalHandler()
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      const message =
        error instanceof Error
          ? [error.message, error.stack].filter(Boolean).join("\n")
          : String(error)
      bootLog(`Global handler (${isFatal ? "fatal" : "error"}): ${message}`, "error")
      onError?.(message)
      previous?.(error, isFatal)
    })
    bootLog("Early ErrorUtils handler installed")
  } catch (error) {
    bootLog(`Failed to install ErrorUtils handler: ${String(error)}`, "warn")
  }
}

module.exports = {
  bootLog,
  recordStartupImportError,
  installEarlyStartupErrorCapture,
}
