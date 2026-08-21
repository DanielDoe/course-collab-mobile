import { Linking, Platform, Share } from "react-native"
import { AppAlert } from "./app-alert"
import { resolveLectureDeckUrl } from "./lecture-deck-url"
import type { LectureDeckWebViewSource } from "./lecture-deck-loader"

export function lectureDeckFilename(title: string): string {
  const safe = title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48)
  return `${safe || "lecture-slides"}-${Date.now()}.pdf`
}

export function canOpenLectureDeckExternally(deckUrl: string | null | undefined): boolean {
  const resolved = resolveLectureDeckUrl(deckUrl)
  if (!resolved) return false
  return resolved.startsWith("http://") || resolved.startsWith("https://")
}

export async function openLectureDeckExternally(deckUrl: string | null | undefined): Promise<void> {
  const resolved = resolveLectureDeckUrl(deckUrl)
  if (!resolved) {
    AppAlert.alert("Unavailable", "This lecture does not have a slide deck attached.")
    return
  }
  try {
    await Linking.openURL(resolved)
  } catch {
    AppAlert.alert("Could not open", "Try downloading the deck instead.")
  }
}

/** Save the authenticated PDF deck via the system share sheet. */
export async function shareLectureDeckPdf(
  source: LectureDeckWebViewSource,
  title: string,
): Promise<void> {
  try {
    const { documentDirectory, downloadAsync } = await import("expo-file-system/legacy")
    if (!documentDirectory) {
      throw new Error("No document directory")
    }
    const target = `${documentDirectory}${lectureDeckFilename(title)}`
    const result = await downloadAsync(source.uri, target, {
      headers: source.headers,
    })

    if (Platform.OS === "ios" || Platform.OS === "android") {
      await Share.share({
        url: result.uri,
        title: title.trim() || "Lecture slides",
        message: Platform.OS === "android" ? `${title.trim() || "Lecture slides"} PDF` : undefined,
      })
    }
  } catch {
    AppAlert.alert("Download failed", "Could not save the slide deck. Check your connection and try again.")
  }
}
