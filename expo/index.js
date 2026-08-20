/**
 * Minimal entry — load expo-router on the classic (non–New Architecture) path.
 * Fatal fallback uses plain View/Text only (no ScrollView — crashes iOS 26 + Fabric).
 */
const React = require("react")
const { AppRegistry, Pressable, Text, View, Linking } = require("react-native")

const {
  bootLog,
  recordStartupImportError,
  installEarlyStartupErrorCapture,
} = require("./src/lib/boot-diagnostics-core")

const BOOT_BG = "#582c83"

function formatBootReport() {
  const logs = globalThis.__CC_BOOT_LOGS__ ?? []
  const lines = logs.map((entry) => {
    const time = new Date(entry.ts).toISOString().slice(11, 23)
    return `${time} ${entry.message}`
  })
  return ["CourseCollab Boot Report", "---", ...lines].join("\n")
}

function formatError(error) {
  return error instanceof Error
    ? [error.message, error.stack].filter(Boolean).join("\n")
    : String(error)
}

function BootFatalScreen({ message }) {
  const report = formatBootReport()
  const combined = `${message}\n\n${report}`.slice(0, 4000)
  return React.createElement(
    View,
    {
      style: {
        flex: 1,
        backgroundColor: BOOT_BG,
        paddingTop: 56,
        paddingHorizontal: 20,
        paddingBottom: 32,
        gap: 12,
      },
    },
    React.createElement(
      Text,
      { style: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" } },
      "CourseCollab",
    ),
    React.createElement(
      Text,
      { style: { color: "#FFFFFF", fontSize: 15, lineHeight: 21 } },
      "Startup failed. Tap below to email this report.",
    ),
    React.createElement(
      Text,
      {
        style: { flex: 1, color: "#E9D5FF", fontSize: 10, lineHeight: 14 },
        selectable: true,
      },
      combined,
    ),
    React.createElement(
      Pressable,
      {
        style: {
          alignSelf: "center",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 999,
        },
        onPress: () => {
          const subject = encodeURIComponent("CourseCollab Boot Failure")
          const body = encodeURIComponent(combined.slice(0, 8000))
          void Linking.openURL(`mailto:danieldoe33@icloud.com?subject=${subject}&body=${body}`)
        },
      },
      React.createElement(
        Text,
        { style: { color: BOOT_BG, fontWeight: "700", fontSize: 15 } },
        "Email this report",
      ),
    ),
  )
}

function registerBootFatal(error) {
  const message = formatError(error)
  recordStartupImportError(error)
  bootLog(`Registering boot fatal screen: ${message}`, "error")
  AppRegistry.registerComponent("main", () =>
    function BootFatalRoot() {
      return React.createElement(BootFatalScreen, { message })
    },
  )
}

bootLog("JS bundle started")

try {
  require("react-native-gesture-handler")
  bootLog("react-native-gesture-handler loaded")
} catch (error) {
  recordStartupImportError(error)
}

installEarlyStartupErrorCapture((message) => {
  registerBootFatal(new Error(message))
})

try {
  bootLog("Loading expo-router entry")
  require("expo-router/entry")
  bootLog("expo-router entry loaded")
} catch (error) {
  registerBootFatal(error)
}
