import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { portalMeta } from "../../constants/portals"
import { useSession } from "../../context/SessionProvider"
import { portalSessionMeta } from "../../lib/portal-shell-utils"
import type { AdminSession, GuestSession, SummerSession } from "../../lib/session"
import { DashboardWelcomeCard } from "./DashboardWelcomeCard"
import { MfaSecurityCard } from "../settings/MfaSecurityCard"
import { NATIVE, SYSTEM, nativeType } from "../../constants/faculty-native-theme"
import { CORA_NAME } from "../../lib/cora-constants"

function portalWelcomeProps(session: GuestSession | SummerSession | AdminSession) {
  if (session.portal === "guest") {
    return {
      portal: "guest" as const,
      roleLabel: "Career Member",
      roleIcon: "briefcase-outline" as const,
      badge: session.guestAccessPurpose === "recommendation_letter" ? "Recommendation" : "Career Member",
      subtitle: portalSessionMeta(session),
    }
  }
  if (session.portal === "summer") {
    return {
      portal: "summer" as const,
      roleLabel: "Camper",
      roleIcon: "sunny-outline" as const,
      badge: session.studentProgramRole?.replace(/_/g, " ") ?? "Summer program",
      subtitle: session.email ?? portalSessionMeta(session),
    }
  }
  return {
    portal: "admin" as const,
    roleLabel: "Admin",
    roleIcon: "shield-outline" as const,
    badge: session.platformRole ?? session.username,
    subtitle: portalSessionMeta(session),
  }
}

export function OtherPortalDashboard() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()

  if (!session || session.portal === "student" || session.portal === "faculty") return null

  const portalLabel = portalMeta(session.portal).label
  const welcome = portalWelcomeProps(session)
  const isAdmin = session.portal === "admin"

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <DashboardWelcomeCard
        portal={welcome.portal}
        name={session.name}
        roleLabel={welcome.roleLabel}
        roleIcon={welcome.roleIcon}
        badge={welcome.badge}
        subtitle={welcome.subtitle}
      />

      {isAdmin ? (
        <>
          <Pressable
            onPress={() => router.push("/admin/cora" as never)}
            style={({ pressed }) => [styles.panel, styles.coraPanel, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${CORA_NAME} Admin`}
          >
            <View style={[styles.panelIcon, { backgroundColor: SYSTEM.teal.soft }]}>
              <Ionicons name="sparkles-outline" size={22} color={SYSTEM.teal.color} />
            </View>
            <Text style={styles.panelTitle}>{CORA_NAME} Admin</Text>
            <Text style={styles.panelBody}>
              Agentic admin assistant with confirmation cards — review and confirm before any platform change.
            </Text>
            <View style={styles.ctaRow}>
              <Text style={styles.ctaLabel}>Open chat</Text>
              <Ionicons name="chevron-forward" size={16} color={SYSTEM.teal.color} />
            </View>
          </Pressable>

          <MfaSecurityCard
            userType="admin"
            userId={session.id}
            accountName={session.username}
            variant="sheet"
          />
        </>
      ) : null}

      <View style={styles.panel}>
        <View style={[styles.panelIcon, { backgroundColor: SYSTEM.indigo.soft }]}>
          <Ionicons name="phone-portrait-outline" size={22} color={SYSTEM.indigo.color} />
        </View>
        <Text style={styles.panelTitle}>{portalLabel} mobile tools coming soon</Text>
        <Text style={styles.panelBody}>
          Native {portalLabel.toLowerCase()} screens will roll out incrementally. Full workflows remain on the web app
          for now.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NATIVE.groupedBackground },
  content: { padding: NATIVE.pagePadding, gap: NATIVE.sectionGap },
  panel: {
    backgroundColor: NATIVE.secondaryGrouped,
    borderRadius: NATIVE.sectionRadius,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NATIVE.separator,
    ...NATIVE.raisedShadow,
  },
  panelIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  panelTitle: { ...nativeType.bodyEmphasis, fontSize: 16 },
  panelBody: { ...nativeType.secondary, lineHeight: 21 },
  coraPanel: {},
  pressed: { opacity: 0.85 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  ctaLabel: { ...nativeType.bodyEmphasis, color: SYSTEM.teal.color, fontSize: 15 },
})
