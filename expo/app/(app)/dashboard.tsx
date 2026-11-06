import { useCallback } from "react"
import {
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
import { ApiError, type Announcement } from "../../src/lib/api"
import { EngagementStats } from "../../src/components/dashboard/EngagementStats"
import { GradeTrendChart } from "../../src/components/dashboard/GradeTrendChart"
import { DashboardWelcomeCard } from "../../src/components/dashboard/DashboardWelcomeCard"
import { KpiGrid } from "../../src/components/dashboard/KpiGrid"
import { FacultyDashboardScreen } from "../../src/components/faculty/FacultyDashboardScreen"
import { GuestDashboardScreen } from "../../src/components/guest/GuestDashboardScreen"
import { SummerDashboardScreen } from "../../src/components/summer/SummerDashboardScreen"
import { OtherPortalDashboard } from "../../src/components/dashboard/OtherPortalDashboard"
import { PerformanceComparisonChart } from "../../src/components/dashboard/PerformanceComparisonChart"
import { PerformanceInsightsCard } from "../../src/components/dashboard/PerformanceInsightsCard"
import { QuickActionsPanel } from "../../src/components/dashboard/QuickActionsPanel"
import { ConnectivityOverlay } from "../../src/components/ConnectivityOverlay"
import { useStudentShell } from "../../src/context/StudentShellContext"
import { useSession } from "../../src/context/SessionProvider"
import { useNetworkStatus } from "../../src/hooks/useNetworkStatus"
import { FacultyEmptyState, NativeCountBadge } from "../../src/components/faculty/faculty-shared"
import { ModuleSectionHeader } from "../../src/components/modules/ModuleScreen"
import { NATIVE } from "../../src/constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../src/context/AppearanceProvider"
import { useChromeTopInset, CHROME_CONTENT_TOP_GAP } from "../../src/context/ChromeInsetContext"
import { useNativeType, semanticSoft } from "../../src/lib/themed-module-theme"
import { useDashboardContentStyle } from "../../src/lib/responsive-layout"
import { dashboardAnnouncementAccent } from "../../src/lib/dashboard-theme"
import { useNotificationModuleRefresh } from "../../src/lib/notifications/notification-events"
import { useStudentDashboard } from "../../src/hooks/query/useStudentDashboard"
import { useStudentAnnouncements } from "../../src/hooks/query/useStudentAnnouncements"
import { QueryRefreshBanner } from "../../src/components/query/QueryRefreshBanner"
import { QuerySkeleton } from "../../src/components/query/QuerySkeleton"

export default function DashboardScreen() {
  const { session } = useSession()

  if (!session) return null
  if (session.portal === "faculty") return <FacultyDashboardScreen />
  if (session.portal === "summer") return <SummerDashboardScreen />
  if (session.portal === "guest") return <GuestDashboardScreen />
  if (session.portal !== "student") return <OtherPortalDashboard />

  return <StudentDashboard session={session} />
}

function StudentDashboard({ session }: { session: import("../../src/lib/session").StudentSession }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { offline } = useNetworkStatus()
  const { refreshStudentData } = useStudentShell()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const chromeTop = useChromeTopInset()
  const type = useNativeType()
  const dashboardContentStyle = useDashboardContentStyle()

  const dash = useStudentDashboard(session)
  const listQuery = useStudentAnnouncements(session)
  const stats = dash.stats
  const trend = dash.trend
  const comparison = dash.comparison
  const insights = dash.insights
  const announcements = listQuery.announcements
  const chartsLoading = dash.isInitialLoading
  const refreshing = (dash.isRefreshing || listQuery.isRefreshing) && !dash.isInitialLoading
  const error =
    dash.partialError ||
    (dash.error instanceof ApiError ? dash.error.message : dash.error ? "Could not load dashboard data." : "")

  const handleRefresh = useCallback(async () => {
    await Promise.all([dash.refetch(), listQuery.refetch(), refreshStudentData?.({ force: true })])
  }, [dash.refetch, listQuery.refetch, refreshStudentData])

  useNotificationModuleRefresh("dashboard", handleRefresh)

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: native.groupedBackground }]}
        contentContainerStyle={[
          styles.content,
          dashboardContentStyle,
          {
            paddingBottom: insets.bottom + 32,
            paddingTop: chromeTop > 0 ? chromeTop + CHROME_CONTENT_TOP_GAP + 8 : NATIVE.pagePadding,
          },
        ]}
        contentInsetAdjustmentBehavior={chromeTop > 0 ? "never" : "automatic"}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={native.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <DashboardWelcomeCard
          portal="student"
          name={session.name}
          roleLabel="Student"
          badge={session.courseCode ?? undefined}
        />

        <QueryRefreshBanner
          visible={dash.refreshFailed || listQuery.refreshFailed}
          onRetry={() => void handleRefresh()}
        />

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

        {!stats && !error ? <QuerySkeleton rows={6} /> : null}

        {stats ? (
          <>
            <KpiGrid stats={stats} />
            <QuickActionsPanel />
          </>
        ) : null}

        {stats || announcements.length > 0 || error ? (
          <AnnouncementsSection
            announcements={announcements}
            onViewAll={() => router.push("/announcements" as never)}
            onOpen={(id) =>
              router.push({
                pathname: "/announcements/[id]",
                params: { id: String(id) },
              } as never)
            }
          />
        ) : null}

        {stats ? (
          <>
            <GradeTrendChart data={trend} loading={chartsLoading} />
            <PerformanceComparisonChart data={comparison} loading={chartsLoading} />
            <PerformanceInsightsCard insights={insights} loading={chartsLoading} />
            <EngagementStats stats={stats} />
          </>
        ) : null}
      </ScrollView>

      {offline ? <ConnectivityOverlay mode="offline" onRetry={() => void handleRefresh()} /> : null}
    </View>
  )
}

function AnnouncementsSection({
  announcements,
  onViewAll,
  onOpen,
}: {
  announcements: Announcement[]
  onViewAll: () => void
  onOpen: (id: number | string) => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const recent = announcements.slice(0, 3)

  return (
    <View style={styles.section}>
      <ModuleSectionHeader
        title="Announcements"
        action={
          <View style={styles.sectionActions}>
            {announcements.length > 0 ? (
              <NativeCountBadge count={announcements.length} variant="compact" />
            ) : null}
            <Pressable onPress={onViewAll} hitSlop={8}>
              <Text style={[type.caption, styles.viewAll, { color: native.tint }]}>View all</Text>
            </Pressable>
          </View>
        }
      />

      {recent.length === 0 ? (
        <FacultyEmptyState
          icon="megaphone-outline"
          title="No announcements yet"
          body="Instructor posts will show up here."
        />
      ) : (
        <View style={styles.announcementList}>
          {recent.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => onOpen(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              android_ripple={{ color: native.fill }}
              style={[
                styles.announcementCard,
                tokens.cardShadow,
                { backgroundColor: native.secondaryGrouped },
              ]}
            >
              <View
                style={[styles.announcementAccent, { backgroundColor: dashboardAnnouncementAccent(index) }]}
              />
              <View style={styles.announcementCopy}>
                <Text style={[type.bodyEmphasis, styles.announcementTitle]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.content ? (
                  <Text style={[type.caption, styles.announcementBody]} numberOfLines={3}>
                    {stripHtml(item.content)}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  loadingBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  errorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  section: { gap: 8 },
  sectionActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  viewAll: { fontWeight: "600" },
  announcementList: { gap: 10 },
  announcementCard: {
    flexDirection: "row",
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
    paddingVertical: 14,
    paddingRight: 14,
  },
  announcementAccent: {
    width: 4,
    borderRadius: 4,
    alignSelf: "stretch",
    marginVertical: 2,
  },
  announcementCopy: { flex: 1, gap: 6, paddingLeft: 12 },
  announcementTitle: { fontSize: 15 },
  announcementBody: { lineHeight: 18 },
})
