import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../../notetaker/NotetakerScreenHeader"
import { ModuleScreen, ModuleSection } from "../../modules/ModuleScreen"
import { useSession } from "../../../context/SessionProvider"
import { useGuestEntitlements } from "../../../context/GuestEntitlementsProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import type { GuestSession } from "../../../lib/session"
import { guestApi } from "../../../lib/guest-api"

function useGuestSession(): GuestSession | null {
  const { session } = useSession()
  return session?.portal === "guest" ? session : null
}

export function GuestCoraCareerSuccessScreen() {
  const guestSession = useGuestSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { entitlements, refresh } = useGuestEntitlements()
  const [syncing, setSyncing] = useState(true)

  const verify = useCallback(async () => {
    if (!guestSession) return
    setSyncing(true)
    try {
      await refresh()
      await guestApi.getEntitlements(guestSession)
    } finally {
      setSyncing(false)
    }
  }, [guestSession, refresh])

  useEffect(() => {
    void verify()
  }, [verify])

  const unlocked = entitlements.plan === "cora_career"

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Cora Career unlocked" fallbackHref="/dashboard" />
      <ModuleScreen disableTopInsetAdjustment>
        <View style={[styles.hero, { backgroundColor: tokens.accentSoftStrong, borderColor: tokens.accentBorder }]}>
          <View style={[styles.heroBadge, { backgroundColor: tokens.accent }]}>
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle" size={36} color="#fff" />
            )}
          </View>
          <Text style={[styles.heroTitle, { color: native.label }]}>
            {unlocked ? "Cora Career is active" : "Purchase received"}
          </Text>
          <Text style={[styles.heroCopy, { color: native.secondaryLabel }]}>
            {syncing
              ? "Refreshing your lifetime access and credits…"
              : unlocked
                ? "Résumé review, interview prep, and your Cora credits are ready."
                : "Your upgrade is processing. Pull to refresh if tools aren’t visible yet."}
          </Text>
        </View>

        <ModuleSection title="Next steps">
          <Pressable
            style={[styles.actionRow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
            onPress={() => router.replace("/module/cora-assistant" as never)}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={tokens.accent} />
            <Text style={[styles.actionLabel, { color: native.label }]}>Open Cora Career Assistant</Text>
            <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
          </Pressable>
          <Pressable
            style={[styles.actionRow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
            onPress={() => router.replace("/module/cora-credits" as never)}
          >
            <Ionicons name="wallet-outline" size={20} color={tokens.accent} />
            <Text style={[styles.actionLabel, { color: native.label }]}>View Cora Credits</Text>
            <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
          </Pressable>
        </ModuleSection>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
          onPress={() => router.replace("/dashboard" as never)}
        >
          <Text style={styles.primaryBtnText}>Back to dashboard</Text>
        </Pressable>
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  heroCopy: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  actionLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
  primaryBtn: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
})
