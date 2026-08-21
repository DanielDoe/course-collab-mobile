/**
 * App entry — safe for Release/TestFlight.
 * Avoids expo-router/entry's empty <View /> production fallback path.
 */
require("@expo/metro-runtime")

const React = require("react")
const { AppRegistry } = require("react-native")
const { registerRootComponent } = require("expo")

const {
  bootLog,
  recordStartupImportError,
  installEarlyStartupErrorCapture,
} = require("./src/lib/boot-diagnostics-core")

bootLog("JS bundle started")

try {
  const SplashScreen = require("expo-splash-screen")
  void SplashScreen.preventAutoHideAsync()
  bootLog("preventAutoHideAsync ok")
} catch (error) {
  bootLog(`preventAutoHideAsync failed: ${error}`, "warn")
}

try {
  require("react-native-gesture-handler")
  bootLog("react-native-gesture-handler loaded")
} catch (error) {
  recordStartupImportError(error)
}

installEarlyStartupErrorCapture()

try {
  bootLog("Loading expo-router App")
  const { App } = require("expo-router/build/qualified-entry")
  bootLog("expo-router App loaded")
  registerRootComponent(App)
  bootLog("Root registered")
} catch (error) {
  recordStartupImportError(error)
  const { Text, View, Pressable, Linking } = require("react-native")
  const message =
    error instanceof Error
      ? [error.message, error.stack].filter(Boolean).join("\n")
      : String(error)
  AppRegistry.registerComponent("main", () =>
    function BootFatalRoot() {
      return React.createElement(
        View,
        {
          style: {
            flex: 1,
            backgroundColor: "#582c83",
            paddingTop: 64,
            paddingHorizontal: 20,
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
          { style: { color: "#E9D5FF", fontSize: 14, lineHeight: 20 } },
          "Startup failed.",
        ),
        React.createElement(
          Text,
          { selectable: true, style: { color: "#DDD6FE", fontSize: 11, flex: 1 } },
          message,
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
              const body = encodeURIComponent(message.slice(0, 8000))
              void Linking.openURL(
                `mailto:danieldoe33@icloud.com?subject=${subject}&body=${body}`,
              )
            },
          },
          React.createElement(
            Text,
            { style: { color: "#582c83", fontWeight: "700" } },
            "Email this report",
          ),
        ),
      )
    },
  )
}
