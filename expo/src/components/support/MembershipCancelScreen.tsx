import { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import type { MembershipTier } from "../../types/dashboard"
import { getThemedMembershipPlan } from "../../lib/membership-plan-theme"

type Props = {
  plan?: MembershipTier
}

export function MembershipCancelScreen({ plan: tier }: Props) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const plan = useMemo(() => (tier ? getThemedMembershipPlan(tier, tokens) : null), [tier, tokens])

  const message = plan
    ? `Your ${plan.name} upgrade was not completed. No charges were made.`
    : "Checkout was cancelled before payment completed. No charges were made."

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Payment cancelled" fallbackHref="/membership" />
      <ModuleScreen disableTopInsetAdjustment>
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: native.separator }]}>
          <View style={[styles.iconTile, { backgroundColor: "rgba(255, 149, 0, 0.14)" }]}>
            <Ionicons name="alert-circle-outline" size={34} color="#C93400" />
          </View>
          <Text style={[styles.title, { color: tokens.text }]}>Payment not completed</Text>
          <Text style={[styles.body, { color: native.secondaryLabel }]}>{message}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.replace({
                pathname: "/membership/checkout",
                params: tier ? { plan: tier } : {},
              } as never)
            }
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: tokens.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Try checkout again</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/membership" as never)}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: tokens.accentBorder, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="arrow-back-outline" size={18} color={tokens.accentDark} />
            <Text style={[styles.secondaryBtnText, { color: tokens.accentDark }]}>Back to plans</Text>
          </Pressable>
        </View>

        <Text style={[styles.note, { color: native.secondaryLabel }]}>
          You remain on your current plan until checkout completes successfully.
        </Text>
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 8 },
  primaryBtn: {
    width: "100%",
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    width: "100%",
    minHeight: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "600" },
  note: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 16, paddingHorizontal: 12 },
})
