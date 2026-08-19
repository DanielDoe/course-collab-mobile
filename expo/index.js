/**
 * Custom entry — boot diagnostics, error capture, and a last-resort fatal UI if
 * expo-router fails to load (release mode has no red LogBox screen).
 */
const React = require("react")
const { AppRegistry, Pressable, ScrollView, Text, View, Linking } = require("react-native")

const {
  bootLog,
  recordStartupImportError,
  installEarlyStartupErrorCapture,
} = require("./src/lib/boot-diagnostics-core")

function readBootLogs() {
  return globalThis.__CC_BOOT_LOGS__ ?? []
}

function formatBootReport() {
  const lines = readBootLogs().map((entry) => {
    const time = new Date(entry.ts).toISOString().slice(11, 23)
    return `${time} ${entry.message}`
  })
  return ["CourseCollab Boot Report", "---", ...lines].join("\n")
}

function registerBootFatalApp(error) {
  const message =
    error instanceof Error
      ? [error.message, error.stack].filter(Boolean).join("\n")
      : String(error)

  bootLog("Registering last-resort boot fatal screen", "error")

  function BootFatalScreen() {
    const report = formatBootReport()
    return React.createElement(
      View,
      {
        style: {
          flex: 1,
          backgroundColor: "#582c83",
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 32,
        },
      },
      React.createElement(
        Text,
        { style: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" } },
        "CourseCollab",
      ),
      React.createElement(
        Text,
        { style: { color: "#FFFFFF", fontSize: 16, marginTop: 8, lineHeight: 22 } },
        "Startup failed before the app could load. This is the release-mode error screen (no red Expo box on TestFlight).",
      ),
      React.createElement(
        ScrollView,
        {
          style: {
            flex: 1,
            marginTop: 12,
            backgroundColor: "rgba(0,0,0,0.25)",
            borderRadius: 12,
          },
          contentContainerStyle: { padding: 12 },
        },
        React.createElement(
          Text,
          { style: { color: "#FEE2E2", fontSize: 11, fontFamily: "Menlo" } },
          message,
        ),
        React.createElement(
          Text,
          { style: { color: "#E9D5FF", fontSize: 11, fontFamily: "Menlo", marginTop: 12 } },
          report,
        ),
      ),
      React.createElement(
        Pressable,
        {
          style: {
            marginTop: 12,
            alignSelf: "center",
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 999,
          },
          onPress: () => {
            const subject = encodeURIComponent("CourseCollab Boot Failure")
            const body = encodeURIComponent(`${message}\n\n${report}`.slice(0, 8000))
            void Linking.openURL(`mailto:danieldoe33@icloud.com?subject=${subject}&body=${body}`)
          },
        },
        React.createElement(
          Text,
          { style: { color: "#582c83", fontWeight: "700", fontSize: 15 } },
          "Email this report",
        ),
      ),
    )
  }

  AppRegistry.registerComponent("main", () => BootFatalScreen)
}

bootLog("JS bundle started")
installEarlyStartupErrorCapture()

try {
  bootLog("Loading react-native-gesture-handler")
  require("react-native-gesture-handler")
  bootLog("react-native-gesture-handler loaded")
} catch (error) {
  recordStartupImportError(error)
}

try {
  bootLog("Loading expo-router entry")
  require("expo-router/entry")
  bootLog("expo-router entry loaded")
} catch (error) {
  recordStartupImportError(error)
  registerBootFatalApp(error)
}
