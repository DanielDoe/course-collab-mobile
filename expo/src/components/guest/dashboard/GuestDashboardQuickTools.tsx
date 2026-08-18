import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { GUEST_CORA_QUICK_PROMPTS } from "../../../constants/guest-cora-prompts"
import { guestCoraCommerceEnabled } from "../../../constants/guest-nav"
import { useGuestEntitlements } from "../../../context/GuestEntitlementsProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import type { GuestEntitlements } from "../../../lib/guest-types"

type Tool = {
  id: string
  label: string
  detail: string
  icon: keyof typeof Ionicons.glyphMap
  route: string
  show?: (entitlements: GuestEntitlements) => boolean
}

const TOOLS: Tool[] = [
  {
    id: "resume-match",
    label: "Résumé Match",
    detail: "Score vs a role",
    icon: "analytics-outline",
    route: "/module/resume-match",
  },
  {
    id: "quick-scan",
    label: "Quick Scan",
    detail: "Instant fit check",
    icon: "flash-outline",
    route: "/module/quick-scan",
  },
  {
    id: "cover-letter",
    label: "Cover Letter",
    detail: "Draft in seconds",
    icon: "document-text-outline",
    route: "/module/cover-letter",
  },
  {
    id: "resume-optimize",
    label: "Résumé Optimize",
    detail: "Fix keyword gaps",
    icon: "color-wand-outline",
    route: "/module/resume-optimize",
  },
  {
    id: "applications",
    label: "Applications",
    detail: "Track your pipeline",
    icon: "file-tray-stacked-outline",
    route: "/module/applications",
  },
  {
    id: "new-request",
    label: "New request",
    detail: "Start a letter",
    icon: "add-circle-outline",
    route: "/module/recommendations?tab=new",
  },
  {
    id: "letters",
    label: "All requests",
    detail: "Track progress",
    icon: "folder-open-outline",
    route: "/module/recommendations",
  },
  {
    id: "messages",
    label: "Messages",
    detail: "Faculty chat",
    icon: "mail-outline",
    route: "/module/messages",
  },
  {
    id: "cora-assistant",
    label: "Career Copilot",
    detail: "AI coaching chat",
    icon: "sparkles-outline",
    route: "/module/cora-assistant",
  },
  {
    id: "upgrade",
    label: "Get Cora Career",
    detail: "Lifetime unlock",
    icon: "ribbon-outline",
    route: "/guest/cora-career/checkout",
    show: (e) => e.plan === "guest_free" && guestCoraCommerceEnabled(e),
  },
]

export function GuestDashboardQuickTools() {
  const router = useRouter()
  const { entitlements } = useGuestEntitlements()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const visible = TOOLS.filter((tool) => !tool.show || tool.show(entitlements))

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {visible.map((tool) => (
        <Pressable
          key={tool.id}
          style={[styles.chip, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
          onPress={() => router.push(tool.route as never)}
        >
          <View style={[styles.chipIcon, { backgroundColor: tokens.accentSoft }]}>
            <Ionicons name={tool.icon} size={18} color={tokens.accent} />
          </View>
          <Text style={[type.caption, styles.chipLabel, { color: native.label }]} numberOfLines={1}>
            {tool.label}
          </Text>
          <Text style={[type.footnote, { color: native.secondaryLabel }]} numberOfLines={1}>
            {tool.detail}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

export function GuestDashboardCoraPrompts() {
  const router = useRouter()
  const { entitlements, hasCapability } = useGuestEntitlements()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  if (entitlements.nav.career === false) return null

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {GUEST_CORA_QUICK_PROMPTS.map((prompt) => {
        const locked = !hasCapability(prompt.capability) && !prompt.creditFree
        return (
          <Pressable
            key={prompt.id}
            style={[
              styles.promptChip,
              { backgroundColor: native.fill, borderColor: native.separator },
              locked && { opacity: 0.72 },
            ]}
            onPress={() =>
              router.push(
                (locked ? "/module/cora-career" : `/module/cora-assistant?prompt=${encodeURIComponent(prompt.id)}`) as never,
              )
            }
          >
            <Ionicons name={prompt.icon} size={15} color={locked ? native.tertiaryLabel : tokens.accent} />
            <Text style={[type.caption, { color: native.label, fontWeight: "600" }]} numberOfLines={1}>
              {prompt.label}
            </Text>
            {prompt.creditFree ? (
              <Text style={[type.footnote, { color: tokens.success, fontWeight: "600" }]}>Free</Text>
            ) : locked ? (
              <Ionicons name="lock-closed-outline" size={12} color={native.tertiaryLabel} />
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: 10, paddingVertical: 2 },
  chip: {
    width: 112,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  chipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: { fontWeight: "700" },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
