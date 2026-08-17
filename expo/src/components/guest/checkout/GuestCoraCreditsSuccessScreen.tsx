import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../../modules/ModuleScreen"
import { useGuestEntitlements } from "../../../context/GuestEntitlementsProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"

type Props = {
  packId?: string
}

export function GuestCoraCreditsSuccessScreen({ packId }: Props) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { entitlements, refresh } = useGuestEntitlements()
  const [syncing, setSyncing] = useState(true)

  const verify = useCallback(async () => {
    setSyncing(true)
    try {
      await refresh()
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  useEffect(() => {
    void verify()
  }, [verify])

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Credits added" fallbackHref="/module/cora-credits" />
      <ModuleScreen disableTopInsetAdjustment>
        <View style={[styles.hero, { backgroundColor: tokens.accentSoftStrong, borderColor: tokens.accentBorder }]}>
          <View style={[styles.heroBadge, { backgroundColor: tokens.accent }]}>
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="flash" size={32} color="#fff" />
            )}
          </View>
          <Text style={[styles.heroTitle, { color: native.label }]}>Cora Credits ready</Text>
          <Text style={[styles.heroCopy, { color: native.secondaryLabel }]}>
            {syncing
              ? "Updating your balance…"
              : `${entitlements.coraCredits.available.toLocaleString()} credits available${packId ? " after your purchase." : "."}`}
          </Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
          onPress={() => router.replace("/module/cora-credits" as never)}
        >
          <Text style={styles.primaryBtnText}>View credit balance</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, { borderColor: native.separator }]}
          onPress={() => router.replace("/dashboard" as never)}
        >
          <Text style={[styles.secondaryBtnText, { color: tokens.accentDark }]}>Back to dashboard</Text>
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
    marginBottom: 16,
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
  primaryBtn: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
})
