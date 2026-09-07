import Constants from "expo-constants"
import { isExpoGo } from "./expo-go"

/** Expo Go does not ship react-native-pdf. Dev / store builds do. */
export function isNativePdfAvailable(): boolean {
  if (isExpoGo()) return false
  if (Constants.executionEnvironment === "storeClient") return false
  return true
}
