import { Alert, Linking, Platform, Share } from "react-native"

/** Prefer webcal on iOS so Calendar opens the subscription prompt instead of a share sheet. */
export function resolveCalendarSubscribeUrl(httpsUrl: string, webcalUrl: string): string {
  const https = httpsUrl.trim()
  const webcal = webcalUrl.trim()

  if (Platform.OS === "ios") {
    const candidate = webcal || https
    if (candidate.startsWith("webcal://") || candidate.startsWith("webcals://")) {
      return candidate
    }
    if (candidate.startsWith("https://")) {
      return `webcal://${candidate.slice("https://".length)}`
    }
    if (candidate.startsWith("http://")) {
      return `webcal://${candidate.slice("http://".length)}`
    }
    return candidate
  }

  return https || webcal.replace(/^webcals?:\/\//, "https://")
}

async function tryOpenUrl(url: string): Promise<boolean> {
  if (!url) return false
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

async function shareCalendarUrl(url: string, httpsUrl: string): Promise<boolean> {
  try {
    const result = await Share.share(
      Platform.OS === "ios"
        ? { url, title: "Subscribe to class calendar" }
        : { message: httpsUrl, title: "Subscribe to class calendar" },
    )
    return result.action !== Share.dismissedAction
  } catch {
    return false
  }
}

export async function openCalendarSubscribeUrl(httpsUrl: string, webcalUrl: string): Promise<void> {
  const https = httpsUrl.trim()
  const webcal = resolveCalendarSubscribeUrl(httpsUrl, webcalUrl)

  if (Platform.OS === "ios") {
    if (await tryOpenUrl(webcal)) return
    if (await shareCalendarUrl(webcal, https)) return

    Alert.alert(
      "Open in Calendar",
      "Choose Calendar from the share sheet, or add a subscription manually in the Calendar app with your class feed link.",
    )
    return
  }

  const androidUrl = https || webcal.replace(/^webcals?:\/\//, "https://")
  if (await tryOpenUrl(androidUrl)) return
  if (await shareCalendarUrl(androidUrl, https)) return

  Alert.alert("Could not open calendar link", "Try again or subscribe from CourseCollab on the web.")
}
