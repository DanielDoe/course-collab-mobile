import { Linking } from "react-native"
import { AppAlert } from "./app-alert"
import { getLegalUrls } from "../config/legal"
import { sanitizeExternalUrl } from "./trusted-origins"

export async function openLegalUrl(url: string, label: string): Promise<boolean> {
  const safeUrl = sanitizeExternalUrl(url)
  if (!safeUrl) {
    AppAlert.alert(`${label} unavailable`, "This link is not a trusted CourseCollab address.")
    return false
  }
  try {
    const canOpen = await Linking.canOpenURL(safeUrl)
    if (!canOpen) {
      AppAlert.alert(`${label} unavailable`, "This link cannot be opened on your device.")
      return false
    }
    await Linking.openURL(safeUrl)
    return true
  } catch {
    AppAlert.alert(`${label} unavailable`, "Could not open the link. Try again later or contact support.")
    return false
  }
}

export function openPrivacyPolicy(): Promise<boolean> {
  const urls = getLegalUrls()
  return openLegalUrl(urls.privacyPolicy, "Privacy Policy")
}

export function openTermsOfService(): Promise<boolean> {
  const urls = getLegalUrls()
  return openLegalUrl(urls.termsOfService, "Terms of Service")
}

export function openSupportSite(): Promise<boolean> {
  const urls = getLegalUrls()
  return openLegalUrl(urls.support, "Support")
}
