import type { ComponentType } from "react"
import { Text, View } from "react-native"
import { MessagesInboxScreen } from "../components/messages/MessagesInboxScreen"
import { GuestRecommendationsScreen } from "../components/guest/GuestRecommendationsScreen"
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
}

export function getGuestModuleRenderer(id: string): ModuleRenderer {
  return GUEST_MODULE_RENDERERS[id] ?? GuestUnknownModule
}
