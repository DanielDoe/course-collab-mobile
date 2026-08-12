import { useCallback, useEffect, useState } from "react"
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
import { summerCampApi, type SummerDashboard } from "../../lib/summer-camp-api"
import { useSession } from "../../context/SessionProvider"
import type { SummerSession } from "../../lib/session"
import { DashboardWelcomeCard } from "../dashboard/DashboardWelcomeCard"
import { FacultyEmptyState, NativeCountBadge } from "../faculty/faculty-shared"
import { ModuleSection, ModuleSectionHeader, ModuleListRow } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { useDashboardContentStyle } from "../../lib/responsive-layout"
import { SummerCampKpiGrid } from "./SummerCampKpiGrid"
import { summerTrainingDetailRoute } from "./summer-training-routes"
import {
  getSummerTrainingPrimaryLabel,
  openSummerTrainingResume,
} from "./summer-training-navigation"
import { SummerFeaturedTrainingCard } from "./SummerFeaturedTrainingCard"
import { SummerQuickActionsPanel } from "./SummerQuickActionsPanel"
import { formatSummerRole } from "./summer-utils"
import { useChromeScrollPadding } from "../../context/ChromeInsetContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

export function SummerDashboardScreen() {
  const insets = useSafeAreaInsets()
  const scrollPad = useChromeScrollPadding(32)
  const router = useRouter()
  const { session } = useSession()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const dashboardContentStyle = useDashboardContentStyle()

  const [data, setData] = useState<SummerDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const summerSession = session?.portal === "summer" ? (session as SummerSession) : null

  const load = useCallback(async () => {
    if (!summerSession) return
    setError("")
    try {
      const next = await summerCampApi.getDashboard(summerSession.id)
      setData(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load dashboard.")
    }
  }, [summerSession])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh(["dashboard", "summer-camp"], handleRefresh)

  if (!summerSession) return null

  const featuredTraining = data?.enrollments?.[0] ?? null
  const featuredProgress = featuredTraining
    ? data?.progress.find((entry) => entry.training_id === featuredTraining.training_id)
    : null
  const featuredModules = featuredProgress?.modules

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: native.groupedBackground }]}
        contentContainerStyle={[styles.content, dashboardContentStyle, scrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={native.tint} />
        }
        showsVerticalScrollIndicator={false}
      >
        <DashboardWelcomeCard
          portal="summer"
          name={summerSession.name}
          roleLabel="Camper"
          roleIcon="sunny-outline"
          badge={formatSummerRole(summerSession.studentProgramRole)}
          subtitle={summerSession.email}
        />

        {loading || !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={native.tint} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading your camp dashboard…</Text>
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

            <SummerCampKpiGrid data={data} />

            {featuredTraining ? (
              <View style={styles.section}>
                <ModuleSectionHeader
                  title="Continue training"
                  action={
                    data.enrollments.length > 1 ? (
                      <Pressable onPress={() => router.push("/module/my-trainings" as never)} hitSlop={8}>
                        <Text style={[type.caption, styles.viewAll, { color: native.tint }]}>View all</Text>
                      </Pressable>
                    ) : null
                  }
                />
                <SummerFeaturedTrainingCard
                  enrollment={featuredTraining}
                  resumeLabel={getSummerTrainingPrimaryLabel(featuredModules)}
                  onResume={() => {
                    void openSummerTrainingResume({
                      router,
                      studentId: summerSession.id,
                      trainingId: featuredTraining.training_id,
                      modules: featuredModules,
                    })
                  }}
                  onPress={() => router.push(summerTrainingDetailRoute(featuredTraining.training_id) as never)}
                />
              </View>
            ) : (
              <FacultyEmptyState
                icon="school-outline"
                title="No trainings enrolled"
                body="Browse camp tracks to start your summer learning path."
              />
            )}

            <SummerQuickActionsPanel />

            <CheckpointsSection
              checkpoints={data.upcoming_checkpoints}
              onViewAll={() => router.push("/module/checkpoints" as never)}
            />

            <AnnouncementsSection announcements={data.announcements} />
          </>
        )}
      </ScrollView>
    </View>
  )
}

function CheckpointsSection({
  checkpoints,
  onViewAll,
}: {
  checkpoints: SummerDashboard["upcoming_checkpoints"]
  onViewAll: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const recent = checkpoints.slice(0, 3)

  return (
    <View style={styles.section}>
      <ModuleSectionHeader
        title="Pending checkpoints"
        action={
          recent.length > 0 ? (
            <View style={styles.sectionActions}>
              <NativeCountBadge count={checkpoints.length} variant="compact" />
              <Pressable onPress={onViewAll} hitSlop={8}>
                <Text style={[type.caption, styles.viewAll, { color: native.tint }]}>View all</Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      {recent.length === 0 ? (
        <FacultyEmptyState
          icon="checkmark-circle-outline"
          title="All caught up"
          body="No pending checkpoint submissions."
        />
      ) : (
        <ModuleSection>
          {recent.map((item, index) => (
            <ModuleListRow
              key={item.block_id}
              icon="cloud-upload-outline"
              iconBg={semanticSoft(tokens.warning, tokens.isDark)}
              iconColor={tokens.warning}
              title={item.content.title}
              subtitle={item.module_title}
              onPress={onViewAll}
              last={index === recent.length - 1}
            />
          ))}
        </ModuleSection>
      )}
    </View>
  )
}

function AnnouncementsSection({ announcements }: { announcements: SummerDashboard["announcements"] }) {
  const native = useThemedNative()
  const type = useNativeType()
  const recent = announcements.slice(0, 3)

  return (
    <View style={styles.section}>
      <ModuleSectionHeader
        title="Announcements"
        action={
          recent.length > 0 ? (
            <NativeCountBadge count={announcements.length} variant="compact" />
          ) : null
        }
      />

      {recent.length === 0 ? (
        <FacultyEmptyState
          icon="megaphone-outline"
          title="No announcements yet"
          body="Camp updates will appear here."
        />
      ) : (
        <ModuleSection>
          {recent.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.announcementRow,
                { borderBottomColor: native.separator },
                index === recent.length - 1 && styles.announcementRowLast,
              ]}
            >
              <Text style={[type.bodyEmphasis, styles.announcementTitle]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.body || item.content ? (
                <Text style={[type.caption, styles.announcementBody]} numberOfLines={3}>
                  {stripHtml(item.body ?? item.content ?? "")}
                </Text>
              ) : null}
            </View>
          ))}
        </ModuleSection>
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
  announcementRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  announcementRowLast: { borderBottomWidth: 0 },
  announcementTitle: { fontSize: 15 },
  announcementBody: { lineHeight: 18 },
})
