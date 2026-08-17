import type { ComponentType } from "react"
import { Text, View } from "react-native"
import { MessagesInboxScreen } from "../components/messages/MessagesInboxScreen"
import { GuestRecommendationsScreen } from "../components/guest/GuestRecommendationsScreen"
import { GuestCoraScreen } from "../components/guest/GuestCoraScreen"
import { GuestCoraCareerScreen } from "../components/guest/GuestCoraCareerScreen"
import { GuestCoraCreditsScreen } from "../components/guest/GuestCoraCreditsScreen"
import { GuestResumeMatchScreen } from "../components/guest/career/GuestResumeMatchScreen"
import { GuestQuickScanScreen } from "../components/guest/career/GuestQuickScanScreen"
import { GuestCoverLetterScreen } from "../components/guest/career/GuestCoverLetterScreen"
import { GuestResumeOptimizeScreen } from "../components/guest/career/GuestResumeOptimizeScreen"
import { GuestApplicationsScreen } from "../components/guest/career/GuestApplicationsScreen"
import { HelpCenterModuleScreen, SupportFormModuleScreen } from "./native-screens"
import { useThemedNative } from "../context/AppearanceProvider"
import { useNativeType } from "../lib/themed-module-theme"

type ModuleRenderer = ComponentType

function GuestUnknownModule() {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: native.groupedBackground }}>
      <Text style={[type.secondary, { textAlign: "center" }]}>This guest tool is not available in the mobile app yet.</Text>
    </View>
  )
}

export const GUEST_MODULE_RENDERERS: Record<string, ModuleRenderer> = {
  recommendations: GuestRecommendationsScreen,
  messages: MessagesInboxScreen,
  "cora-assistant": GuestCoraScreen,
  "cora-career": GuestCoraCareerScreen,
  "cora-credits": GuestCoraCreditsScreen,
  "resume-match": GuestResumeMatchScreen,
  "quick-scan": GuestQuickScanScreen,
  "cover-letter": GuestCoverLetterScreen,
  "resume-optimize": GuestResumeOptimizeScreen,
  applications: GuestApplicationsScreen,
  "help-center": HelpCenterModuleScreen,
  "submit-ticket": () => <SupportFormModuleScreen kind="support" />,
  "report-bug": () => <SupportFormModuleScreen kind="bug" />,
  "feature-requests": () => <SupportFormModuleScreen kind="feature" />,
}

export function getGuestModuleRenderer(id: string): ModuleRenderer {
  return GUEST_MODULE_RENDERERS[id] ?? GuestUnknownModule
}
