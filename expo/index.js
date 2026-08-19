/**
 * Custom entry — install release startup capture before expo-router loads app modules.
 * Keep gesture-handler first; defer reanimated until screens that import it load.
 */
const { installEarlyStartupErrorCapture, recordStartupImportError } = require("./src/lib/startup-error-capture")

installEarlyStartupErrorCapture()

try {
  require("react-native-gesture-handler")
} catch (error) {
  recordStartupImportError(error)
}

require("expo-router/entry")
