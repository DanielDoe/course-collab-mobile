import { Share } from "react-native"

/** Copy text without a top-level native module import (avoids startup crash before rebuild). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const Clipboard = require("expo-clipboard") as typeof import("expo-clipboard")
    await Clipboard.setStringAsync(text)
    return true
  } catch {
    try {
      await Share.share({ message: text })
      return true
    } catch {
      return false
    }
  }
}
