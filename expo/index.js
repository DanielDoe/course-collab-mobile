/**
 * Custom entry — boot diagnostics + error capture before expo-router loads app modules.
 */
const {
  bootLog,
  recordStartupImportError,
  installEarlyStartupErrorCapture,
} = require("./src/lib/boot-diagnostics-core")

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
  throw error
}
