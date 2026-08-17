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
import { ApiError } from "../../lib/api"
import { guestApi } from "../../lib/guest-api"
import { useGuestEntitlements } from "../../context/GuestEntitlementsProvider"
import { guestCoraCommerceEnabled } from "../../constants/guest-nav"
import { recommendationStatusLabel } from "../../lib/faculty-recommendation-utils"
import {
  countGuestLettersByFilter,
  summarizeGuestRequests,
} from "../../lib/guest-recommendation-utils"
import {
  buildGuestDashboardInsights,
  buildGuestDeadlineItems,
  buildGuestPipelineSegments,
} from "../../lib/guest-dashboard-utils"
import type { RecommendationRequest } from "../../lib/course-info-api"
import { useSession } from "../../context/SessionProvider"
import type { GuestSession } from "../../lib/session"
import type { GuestHomeResponse } from "../../lib/guest-types"
import { DashboardWelcomeCard } from "../dashboard/DashboardWelcomeCard"
import { DashboardCard } from "../dashboard/DashboardCard"
import { GuestKpiGrid } from "./GuestKpiGrid"
import { GuestDashboardPipelineChart } from "./dashboard/GuestDashboardPipelineChart"
import { GuestDashboardCreditsPanel } from "./dashboard/GuestDashboardCreditsPanel"
import { GuestDashboardInsightsPanel } from "./dashboard/GuestDashboardInsightsPanel"
import { GuestDashboardQuickTools } from "./dashboard/GuestDashboardQuickTools"
import { GuestDashboardDeadlinesPanel } from "./dashboard/GuestDashboardDeadlinesPanel"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { useDashboardContentStyle } from "../../lib/responsive-layout"
import { formatListDate, purposeLabel } from "../../lib/course-info-api"
import { useChromeScrollPadding } from "../../context/ChromeInsetContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

const GUEST_HOME_TAGLINE = "Keep recommendations and application materials organized in one place"

export function GuestDashboardScreen() {
  const scrollPad = useChromeScrollPadding(32)
  const router = useRouter()
  const { session } = useSession()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const dashboardContentStyle = useDashboardContentStyle()

  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const { entitlements, workspaceEnabled } = useGuestEntitlements()
  const [home, setHome] = useState<GuestHomeResponse | null>(null)
  const [requests, setRequests] = useState<RecommendationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!guestSession) return
    setError("")
    try {
      const [homePayload, list] = await Promise.all([
        guestApi.getHome(guestSession),
        guestApi.getRecommendations(guestSession),
      ])
      setHome(homePayload)
      setRequests(list)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your workspace.")
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
  const filterCounts = useMemo(() => countGuestLettersByFilter(requests), [requests])

  const chartColors = useMemo(
    () => ({
      needsYou: tokens.warning,
      inProgress: tokens.accent,
      completed: tokens.success,
      rejected: native.tertiaryLabel,
    }),
    [tokens, native.tertiaryLabel],
  )

  const pipelineSegments = useMemo(
    () => buildGuestPipelineSegments(requests, chartColors),
    [requests, chartColors],
  )
  const deadlineItems = useMemo(() => buildGuestDeadlineItems(requests), [requests])

  const upcomingDeadline = useMemo(() => {
    if (home?.upcomingDeadline) return home.upcomingDeadline
    return deadlineItems[0]?.deadline ?? null
  }, [home?.upcomingDeadline, deadlineItems])

  const insights = useMemo(
    () => buildGuestDashboardInsights(requests, entitlements, upcomingDeadline),
    [requests, entitlements, upcomingDeadline],
  )

  const recentRequests = useMemo(() => {
    const sorted = [...requests].sort((a, b) => {
      const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
      const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
      return bTime - aTime
    })
    return sorted.slice(0, 5)
  }, [requests])

  const metaLine = useMemo(() => {
    const parts = [home?.subtitle?.trim() || GUEST_HOME_TAGLINE]
    const uni = home?.universityShortName?.trim()
    if (uni) parts.push(uni)
    return parts.join(" · ")
  }, [home?.subtitle, home?.universityShortName])

  if (!guestSession) return null

  if (!workspaceEnabled) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground, padding: 24, justifyContent: "center" }]}>
        <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "center" }]}>
          Career Member workspace is temporarily unavailable.
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <ScrollView
        contentContainerStyle={[styles.content, dashboardContentStyle, scrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={tokens.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <DashboardWelcomeCard portal="guest" name={home?.greeting ?? guestSession.name} metaLine={metaLine} />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading your workspace…</Text>
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

            <DashboardCard title="Overview" subtitle="Your letter workspace at a glance">
              <GuestKpiGrid
                total={summary.total}
                awaitingYou={summary.awaitingYou}
                inProgress={filterCounts.in_progress}
                completed={summary.completed}
              />
            </DashboardCard>

            {insights.length ? (
              <DashboardCard title="Updates" subtitle="What needs attention">
                <GuestDashboardInsightsPanel insights={insights.slice(0, 2)} />
              </DashboardCard>
            ) : null}

            <DashboardCard title="Quick tools" subtitle="Letters, messages, and Cora">
              <GuestDashboardQuickTools />
            </DashboardCard>

            {guestCoraCommerceEnabled(entitlements) ? (
              <GuestDashboardCreditsPanel entitlements={entitlements} />
            ) : null}

            {summary.total > 0 ? (
              <DashboardCard title="Letter pipeline" subtitle="Where your requests stand">
                <GuestDashboardPipelineChart segments={pipelineSegments} total={summary.total} />
              </DashboardCard>
            ) : null}

            {deadlineItems.length > 0 ? (
              <DashboardCard title="Upcoming deadlines" subtitle="Sorted by urgency">
                <GuestDashboardDeadlinesPanel items={deadlineItems} />
              </DashboardCard>
            ) : null}

            <DashboardCard title="Recent requests" subtitle="Latest activity across your letters">
              {recentRequests.length ? (
                <View style={[styles.listGroup, tokens.cardShadow, { backgroundColor: native.fill }]}>
                  {recentRequests.map((item, index) => (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.recentRow,
                        { backgroundColor: native.secondaryGrouped },
                        index < recentRequests.length - 1 && {
                          borderBottomColor: native.separator,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                      onPress={() => router.push(`/recommendation/${item.id}` as never)}
                    >
                      <View style={[styles.recentIcon, { backgroundColor: tokens.accentSoft }]}>
                        <Ionicons name="document-text-outline" size={16} color={tokens.accent} />
                      </View>
                      <View style={styles.recentCopy}>
                        <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                          {purposeLabel(item.purpose)}
                        </Text>
                        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                          {recommendationStatusLabel(item.status)}
                          {item.instructor_name ? ` · ${item.instructor_name}` : ""}
                        </Text>
                      </View>
                      {item.deadline ? (
                        <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                          {formatListDate(item.deadline)}
                        </Text>
                      ) : null}
                      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: native.fill, borderColor: native.separator }]}>
                  <Text style={[type.secondary, { lineHeight: 21 }]}>
                    No recommendation requests yet. Start a new request to collaborate with your instructor.
                  </Text>
                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
                    onPress={() => router.push("/module/recommendations?tab=new" as never)}
                  >
                    <Ionicons name="add-outline" size={18} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>New request</Text>
                  </Pressable>
                </View>
              )}
            </DashboardCard>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 16 },
  loadingBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  errorBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: NATIVE.sectionRadius },
  errorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  listGroup: { borderRadius: 16, overflow: "hidden" },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 58,
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  recentCopy: { flex: 1, gap: 2 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
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
