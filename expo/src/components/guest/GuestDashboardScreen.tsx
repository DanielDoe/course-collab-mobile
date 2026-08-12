import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { guestApi } from "../../lib/guest-api"
import {
  recommendationStatusLabel,
  recommendationStatusTone,
} from "../../lib/faculty-recommendation-utils"
import { guestNeedsAction, summarizeGuestRequests } from "../../lib/guest-recommendation-utils"
import type { RecommendationRequest } from "../../lib/course-info-api"
import { useSession } from "../../context/SessionProvider"
import type { GuestSession } from "../../lib/session"
import { DashboardWelcomeCard } from "../dashboard/DashboardWelcomeCard"
import { DashboardCard } from "../dashboard/DashboardCard"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { useDashboardContentStyle } from "../../lib/responsive-layout"
import { formatListDate, purposeLabel } from "../../lib/course-info-api"
import { GuestKpiGrid } from "./GuestKpiGrid"
import { useChromeScrollPadding } from "../../context/ChromeInsetContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

export function GuestDashboardScreen() {
  const insets = useSafeAreaInsets()
  const scrollPad = useChromeScrollPadding(32)
  const router = useRouter()
  const { session } = useSession()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const dashboardContentStyle = useDashboardContentStyle()

  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const [requests, setRequests] = useState<RecommendationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!guestSession) return
    setError("")
    try {
      const list = await guestApi.getRecommendations(guestSession)
      setRequests(list)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your letters.")
    }
  }, [guestSession])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh(["dashboard", "recommendations"], handleRefresh)

  const summary = useMemo(() => summarizeGuestRequests(requests), [requests])
  const featured = useMemo(() => {
    const sorted = [...requests].sort((a, b) => {
      const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
      const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
      return bTime - aTime
    })
    return sorted[0] ?? null
  }, [requests])

  if (!guestSession) return null

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <ScrollView
        contentContainerStyle={[styles.content, dashboardContentStyle, scrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={tokens.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <DashboardWelcomeCard
          portal="guest"
          name={guestSession.name}
          metaLine="Guest · Recommendation letters"
        />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading your letter workspace…</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: semanticSoft(tokens.danger, tokens.isDark, tokens.isDark ? 0.22 : 0.12) },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={18} color={tokens.danger} />
                <Text style={[type.destructive, styles.errorText]}>{error}</Text>
              </View>
            ) : null}

            <GuestKpiGrid total={summary.total} awaitingYou={summary.awaitingYou} completed={summary.completed} />

            <DashboardCard title="Quick actions" subtitle="Request, edit, and download recommendation letters">
              <View style={[styles.actionList, tokens.cardShadow, { backgroundColor: native.fill }]}>
                <QuickActionRow
                  icon="folder-open-outline"
                  label="My letters"
                  detail="View all requests"
                  onPress={() => router.push("/module/recommendations" as never)}
                />
                <QuickActionRow
                  icon="add-circle-outline"
                  label="New request"
                  detail="Ask an instructor for a letter"
                  onPress={() => router.push("/module/recommendations?tab=new" as never)}
                  last
                />
              </View>
            </DashboardCard>

            {featured ? (
              <DashboardCard title="Latest letter" subtitle="Continue where you left off">
                <Pressable
                  style={[
                    styles.featuredCard,
                    tokens.cardShadow,
                    { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                  ]}
                  onPress={() => router.push(`/recommendation/${featured.id}` as never)}
                >
                  <View style={styles.featuredHead}>
                    <View style={[styles.featuredIcon, { backgroundColor: tokens.accentSoft }]}>
                      <Ionicons name="document-text-outline" size={18} color={tokens.accent} />
                    </View>
                    <View style={styles.featuredBody}>
                      <Text style={[type.bodyEmphasis]}>{purposeLabel(featured.purpose)}</Text>
                      <Text style={[type.caption, { color: native.secondaryLabel }]}>
                        {featured.instructor_name ?? "Instructor"} · {featured.course_code ?? "Course"}
                      </Text>
                    </View>
                    <FacultyStatusPill
                      label={recommendationStatusLabel(featured.status)}
                      tone={recommendationStatusTone(featured.status)}
                    />
                  </View>
                  {featured.deadline ? (
                    <Text style={[type.caption, { color: native.secondaryLabel }]}>
                      Deadline {formatListDate(featured.deadline)}
                    </Text>
                  ) : null}
                  {guestNeedsAction(featured.status) ? (
                    <View style={[styles.actionHint, { backgroundColor: semanticSoft(tokens.warning, tokens.isDark, 0.14) }]}>
                      <Ionicons name="arrow-forward-circle-outline" size={16} color={tokens.warning} />
                      <Text style={[type.caption, { color: tokens.warning, fontWeight: "600" }]}>Tap to continue</Text>
                    </View>
                  ) : null}
                </Pressable>
              </DashboardCard>
            ) : (
              <DashboardCard title="Get started" subtitle="Collaborate with your instructor on a polished letter">
                <Text style={[type.secondary, styles.emptyBody]}>
                  You have not started a recommendation letter yet. Create a request and your instructor will guide you
                  through questionnaire, drafts, review, and PDF download.
                </Text>
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
                  onPress={() => router.push("/module/recommendations?tab=new" as never)}
                >
                  <Ionicons name="add-outline" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Start a letter request</Text>
                </Pressable>
              </DashboardCard>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

function QuickActionRow({
  icon,
  label,
  detail,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  detail: string
  onPress: () => void
  last?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <Pressable
      style={[
        styles.actionRow,
        { backgroundColor: native.secondaryGrouped },
        !last && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
      onPress={onPress}
    >
      <View style={[styles.actionIcon, { backgroundColor: tokens.accentSoft }]}>
        <Ionicons name={icon} size={18} color={tokens.accent} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[type.bodyEmphasis]}>{label}</Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  loadingBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  errorBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: NATIVE.sectionRadius },
  errorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  actionList: { borderRadius: 16, overflow: "hidden" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 58 },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: { flex: 1, gap: 2 },
  featuredCard: { borderRadius: 16, padding: 14, gap: 8, borderWidth: StyleSheet.hairlineWidth },
  featuredHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featuredIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBody: { flex: 1, gap: 2 },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  emptyBody: { lineHeight: 21, marginBottom: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 13,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
})
