import { useMemo, useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useModuleContentTopPadding, useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MODERN, NATIVE } from "../../constants/faculty-native-theme"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { semanticSoft, useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { StudentThemedLocked } from "../student/student-themed-hero"
import { hasNavAccess } from "../../constants/student-nav"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { useStudentAnalytics } from "../../hooks/useStudentAnalytics"
import {
  formatActivityWhen,
  type StudentActivityEvent,
  type StudentActivityKind,
  type StudentAnalyticsSnapshot,
} from "../../lib/student-analytics"
import { assessmentReportRouteParams } from "../../lib/assessment-report-href"
import { pushStudentAppHref } from "../../lib/student-app-href"
import type { StudentSession } from "../../lib/session"
import type { PerformanceInsight } from "../../types/dashboard"
import { AppErrorScreen } from "../errors/AppErrorScreen"
import { CommSectionFooter } from "../faculty/faculty-communication-ui"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { ModuleListRow, ModuleSection } from "../modules/ModuleScreen"
import { PillSwipeTabs } from "../theme/PillSwipeTabs"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  ANALYTICS_CALENDAR_ACTIVE,
  ANALYTICS_LIST_THUMBS,
  ANALYTICS_SUMMARY_KPI,
  ANALYTICS_XP_FILL,
  type AnalyticsSummaryKpiId,
} from "../../lib/analytics-more-theme"
import { codebenchKpiSurface } from "../../lib/codebench-badge-theme"
import {
  ANALYTICS_TABS,
  normalizeAnalyticsTab,
  type AnalyticsTabId,
  type LegacyAnalyticsTabId,
} from "./analytics-config"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function openAnalyticsHref(router: ReturnType<typeof useRouter>, href: string) {
  const match = href.match(/^\/results\/(\d+)/)
  if (match) {
    const query = href.includes("?") ? new URLSearchParams(href.slice(href.indexOf("?") + 1)) : null
    router.push(
      assessmentReportRouteParams(
        Number(match[1]),
        query?.get("type") ?? undefined,
        query?.get("from") ?? undefined,
      ) as never,
    )
    return
  }
  pushStudentAppHref(router, href)
}

const ACTIVITY_META: Record<
  StudentActivityKind,
  { label: string; icon: keyof typeof Ionicons.glyphMap; thumb: keyof typeof ANALYTICS_LIST_THUMBS }
> = {
  quiz: { label: "Quiz", icon: "help-circle-outline", thumb: "quiz" },
  homework: { label: "Homework", icon: "document-text-outline", thumb: "homework" },
  exam: { label: "Exam", icon: "school-outline", thumb: "exam" },
  practice: { label: "Practice", icon: "fitness-outline", thumb: "practice" },
  codebench: { label: "CodeBench", icon: "code-slash-outline", thumb: "ide" },
}

type Props = { initialTab?: LegacyAnalyticsTabId }

export function AnalyticsMoreScreen({ initialTab = "overview" }: Props) {
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const lockedTopPad = useModuleContentTopPadding(24)
  const scrollPad = useModuleScrollContentPadding()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const isLocked = membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")
  const { data, isInitialLoading, refreshing, error, refetch } = useStudentAnalytics(session, !isLocked)
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>(() => normalizeAnalyticsTab(initialTab))

  const pageScrollStyle = useMemo(
    () => ({
      paddingBottom: scrollPad.paddingBottom,
      gap: 12 as const,
      flexGrow: 1,
    }),
    [scrollPad.paddingBottom],
  )

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  if (isLocked) {
    return (
      <StudentThemedLocked
        icon="bar-chart"
        subtitle="Course analytics, practice insights, and your activity log — exclusive to Trailblazer members."
        paddingTop={lockedTopPad}
        paddingBottom={insets.bottom + 24}
        onUpgrade={() => router.push("/membership" as never)}
      />
    )
  }

  const navTabs = ANALYTICS_TABS.map((tab) => ({
    id: tab.id,
    label: tab.shortLabel,
    icon: tab.icon,
  }))

  const pageFooter = (
    <CommSectionFooter>
      These figures come from your gradebook, submitted assessments, Practice Hub, and CodeBench — not a single code sample.
    </CommSectionFooter>
  )

  function renderPageScroll(content: ReactNode) {
    if (isInitialLoading) {
      return (
        <View style={styles.pageCenter}>
          <ActivityIndicator color={native.tint} size="large" />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading your course analytics…</Text>
        </View>
      )
    }

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageScrollStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        directionalLockEnabled
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refetch()} tintColor={tokens.accent} />
        }
      >
        {content}
        {pageFooter}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View style={{ paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding }} />
      {error && !data ? (
        <AppErrorScreen
          error={error instanceof Error ? error : new Error("Could not load analytics.")}
          feature="Student analytics"
          onRetry={() => void refetch()}
          style={styles.errorPage}
        />
      ) : (
        <PillSwipeTabs
          options={navTabs}
          value={activeTab}
          onChange={setActiveTab}
          pagePaddingHorizontal={NATIVE.pagePadding}
          pages={[
            renderPageScroll(<OverviewPanel data={data} onOpenHref={(href) => openAnalyticsHref(router, href)} />),
            renderPageScroll(<InsightsPanel data={data} onOpenHref={(href) => openAnalyticsHref(router, href)} />),
            renderPageScroll(<ActivityPanel data={data} onOpenHref={(href) => openAnalyticsHref(router, href)} />),
          ]}
        />
      )}
    </View>
  )
}

function OverviewPanel({
  data,
  onOpenHref,
}: {
  data: StudentAnalyticsSnapshot | null
  onOpenHref: (href: string) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const stats = data?.stats
  const gradeLabel = stats?.letterGrade && stats.letterGrade !== "—" ? stats.letterGrade : "In progress"
  const overall = stats?.overallGrade ?? 0

  return (
    <>
      <ModuleSection title="Course standing">
        <View style={styles.summaryHeader}>
          <View style={styles.summaryLevelRow}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>{gradeLabel}</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel, fontWeight: "700" }]}>
              {overall > 0 ? `${overall.toFixed(1)}% overall` : "No posted grade yet"}
            </Text>
          </View>
          <View style={[styles.xpTrack, { backgroundColor: native.fill }]}>
            <View
              style={[
                styles.xpFill,
                { width: `${Math.min(100, Math.max(0, overall))}%`, backgroundColor: ANALYTICS_XP_FILL },
              ]}
            />
          </View>
          {stats?.riskReason ? (
            <Text style={[type.footnote, { color: SN.secondaryLabel }]}>{stats.riskReason}</Text>
          ) : null}
          {stats?.partialError ? (
            <Text style={[type.footnote, { color: tokens.warning }]}>{stats.partialError}</Text>
          ) : null}
        </View>
        <View style={styles.summaryRow}>
          <SummaryStat id="quiz" label="Quizzes" value={formatPct(stats?.quizAverage)} />
          <SummaryStat id="homework" label="Homework" value={formatPct(stats?.homeworkAverage)} />
          <SummaryStat id="attendance" label="Attendance" value={formatPct(stats?.attendancePct)} />
          <SummaryStat id="practice" label="Practice" value={String(data?.practiceSessions ?? 0)} />
        </View>
      </ModuleSection>

      {data?.comparison?.length ? (
        <ModuleSection title="You vs class">
          {data.comparison.map((row, index) => (
            <ModuleListRow
              key={row.label}
              title={row.label}
              subtitle={row.classAvg != null ? `Class average ${formatPct(row.classAvg)}` : "Class average not posted"}
              meta={`You ${formatPct(row.you)}`}
              icon="people-outline"
              solidThumb={ANALYTICS_LIST_THUMBS.recommendation}
              last={index === data.comparison.length - 1}
            />
          ))}
        </ModuleSection>
      ) : null}

      <ModuleSection title="What needs attention">
        {(data?.insights ?? []).map((item, index, arr) => (
          <InsightActionRow
            key={item.id}
            item={item}
            last={index === arr.length - 1}
            onOpenHref={onOpenHref}
          />
        ))}
      </ModuleSection>

      <ModuleSection title="Shortcuts">
        <ModuleListRow
          title="Open gradebook"
          subtitle="Category scores and posted letter grade"
          icon="bar-chart-outline"
          solidThumb={ANALYTICS_LIST_THUMBS.grades}
          onPress={() => onOpenHref("/module/grades")}
        />
        <ModuleListRow
          title="Assessment history"
          subtitle="Attempt scores and reports"
          icon="time-outline"
          solidThumb={ANALYTICS_LIST_THUMBS.quiz}
          last
          onPress={() => onOpenHref("/module/quiz-history")}
        />
      </ModuleSection>
    </>
  )
}

function InsightsPanel({
  data,
  onOpenHref,
}: {
  data: StudentAnalyticsSnapshot | null
  onOpenHref: (href: string) => void
}) {
  const type = useNativeType()
  const topics = data?.topics ?? []
  const trend = (data?.trend ?? []).filter((row) => row.quiz > 0 || row.homework > 0).slice(-8)

  return (
    <>
      <ModuleSection title="Learning signals">
        <InsightRow label="Focus area" value={data?.focusTopic ?? "Not enough practice yet"} tone="weak" />
        <InsightRow label="Strongest topic" value={data?.strongestTopic ?? "Keep practicing to unlock this"} tone="good" />
        <InsightRow
          label="Practice next"
          value={data?.practiceNext ?? "Open Practice Hub to start a topic"}
          tone="neutral"
          last
        />
      </ModuleSection>

      {topics.length ? (
        <ModuleSection title="Practice mastery" footer="Accuracy from your Practice Hub attempts, not CodeBench AI.">
          {topics.map((row, index) => (
            <ConceptBar
              key={row.topic}
              label={row.topic}
              score={row.accuracy}
              last={index === topics.length - 1}
            />
          ))}
        </ModuleSection>
      ) : (
        <ModuleSection title="Practice mastery">
          <View style={styles.panelPad}>
            <FacultyEmptyState
              icon="bar-chart-outline"
              title="No practice data yet"
              body="Complete a Practice Hub topic to see real concept mastery here."
            />
          </View>
          <ModuleListRow
            title="Open Practice Hub"
            icon="fitness-outline"
            solidThumb={ANALYTICS_LIST_THUMBS.practice}
            last
            onPress={() => onOpenHref("/module/practice")}
          />
        </ModuleSection>
      )}

      {trend.length ? (
        <ModuleSection title="Recent grade trend" footer="Weekly quiz and homework averages from submitted work.">
          {trend.map((row, index) => (
            <ModuleListRow
              key={`${row.label}-${index}`}
              title={row.label}
              subtitle={`Homework ${formatPct(row.homework)}`}
              meta={`Quiz ${formatPct(row.quiz)}`}
              icon="trending-up-outline"
              solidThumb={ANALYTICS_LIST_THUMBS.evaluate}
              last={index === trend.length - 1}
            />
          ))}
        </ModuleSection>
      ) : null}

      {(data?.stats.missingAssignments ?? 0) > 0 || (data?.stats.upcomingDeadlines ?? 0) > 0 ? (
        <ModuleSection title="Deadlines">
          <Text style={[type.footnote, styles.panelPadNote]}>
            {data?.stats.missingAssignments
              ? `${data.stats.missingAssignments} missing assignment${data.stats.missingAssignments === 1 ? "" : "s"}. `
              : ""}
            {data?.stats.upcomingDeadlines
              ? `${data.stats.upcomingDeadlines} upcoming deadline${data.stats.upcomingDeadlines === 1 ? "" : "s"}.`
              : ""}
          </Text>
        </ModuleSection>
      ) : null}
    </>
  )
}

function ActivityPanel({
  data,
  onOpenHref,
}: {
  data: StudentAnalyticsSnapshot | null
  onOpenHref: (href: string) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const activity = data?.activity ?? []
  const calendar = data?.codebenchCalendar ?? {}
  const calendarDays = useMemo(() => {
    const result: { key: string; active: boolean; label: string }[] = []
    const today = new Date()
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().split("T")[0]
      result.push({
        key,
        active: !!calendar[key],
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })
    }
    return result
  }, [calendar])

  return (
    <>
      <ModuleSection title="Recent activity" footer="Quizzes, homework, practice sessions, and CodeBench submissions.">
        {activity.length === 0 ? (
          <View style={styles.panelPad}>
            <FacultyEmptyState
              icon="time-outline"
              title="No activity logged yet"
              body="Submit a quiz, homework, practice session, or CodeBench program and it will show up here."
            />
          </View>
        ) : (
          activity.map((event, index) => (
            <ActivityRow
              key={event.id}
              event={event}
              last={index === activity.length - 1}
              onOpenHref={onOpenHref}
            />
          ))
        )}
      </ModuleSection>

      <ModuleSection title="Streaks">
        <View style={styles.summaryRow}>
          <SummaryStat id="attendance" label="Class streak" value={`${data?.stats.attendanceStreak ?? 0}d`} />
          <SummaryStat id="streak" label="Code streak" value={`${data?.codebenchStreakDays ?? 0}d`} />
          <SummaryStat id="subs" label="Code submits" value={String(data?.codebenchSubmissions ?? 0)} />
          <SummaryStat id="rank" label="Code XP" value={String(data?.codebenchXp ?? 0)} />
        </View>
      </ModuleSection>

      <ModuleSection title="CodeBench days" footer="Each square is one day over the last five weeks.">
        <View style={styles.calWrap}>
          <View style={styles.calGrid}>
            {calendarDays.map((day) => (
              <View
                key={day.key}
                style={[
                  styles.calCell,
                  {
                    backgroundColor: day.active ? ANALYTICS_CALENDAR_ACTIVE : native.fill,
                    borderColor: day.active ? ANALYTICS_CALENDAR_ACTIVE : native.separator,
                  },
                ]}
                accessibilityLabel={`${day.label}, ${day.active ? "active" : "inactive"}`}
              />
            ))}
          </View>
          <View style={styles.calLegend}>
            <View style={[styles.calLegendSwatch, { backgroundColor: native.fill, borderColor: native.separator }]} />
            <Text style={[type.footnote, { color: SN.secondaryLabel }]}>No code</Text>
            <View style={[styles.calLegendSwatch, { backgroundColor: ANALYTICS_CALENDAR_ACTIVE }]} />
            <Text style={[type.footnote, { color: SN.secondaryLabel }]}>Coded</Text>
          </View>
        </View>
      </ModuleSection>
    </>
  )
}

function ActivityRow({
  event,
  last,
  onOpenHref,
}: {
  event: StudentActivityEvent
  last: boolean
  onOpenHref: (href: string) => void
}) {
  const meta = ACTIVITY_META[event.kind]
  return (
    <ModuleListRow
      title={event.title}
      subtitle={`${meta.label} · ${formatActivityWhen(event.at)}`}
      meta={event.detail}
      icon={meta.icon}
      solidThumb={ANALYTICS_LIST_THUMBS[meta.thumb]}
      last={last}
      onPress={event.href ? () => onOpenHref(event.href!) : undefined}
    />
  )
}

function InsightActionRow({
  item,
  last,
  onOpenHref,
}: {
  item: PerformanceInsight
  last: boolean
  onOpenHref: (href: string) => void
}) {
  return (
    <ModuleListRow
      title={item.message}
      subtitle={item.actionLabel}
      icon={item.type === "warning" ? "warning-outline" : item.type === "tip" ? "bulb-outline" : "information-circle-outline"}
      solidThumb={ANALYTICS_LIST_THUMBS.recommendation}
      last={last}
      onPress={item.actionRoute ? () => onOpenHref(item.actionRoute!) : undefined}
    />
  )
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—"
  return `${Math.round(value * 10) / 10}%`
}

function SummaryStat({
  id,
  label,
  value,
}: {
  id: AnalyticsSummaryKpiId
  label: string
  value: string
}) {
  const type = useNativeType()
  const cardLayout = useKpiGridCardStyle()
  const kpi = ANALYTICS_SUMMARY_KPI[id]
  const surface = codebenchKpiSurface(kpi.accent)

  return (
    <View
      style={[styles.summaryStat, cardLayout, { backgroundColor: surface.background, borderColor: surface.border }]}
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${value}`}
    >
      <View style={styles.summaryCopy}>
        <Text style={[type.caption, styles.summaryLabel, { color: surface.label }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[type.bodyEmphasis, styles.summaryValue, { color: surface.value }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <SolidListThumbTile thumb={surface.iconThumb} icon={kpi.icon} size="compact" style={styles.summaryIconTile} />
    </View>
  )
}

function InsightRow({
  label,
  value,
  tone,
  last,
}: {
  label: string
  value: string
  tone: "weak" | "good" | "neutral"
  last?: boolean
}) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const toneColor = tone === "weak" ? tokens.danger : tone === "good" ? tokens.warning : tokens.accent
  const toneBg = semanticSoft(toneColor, tokens.isDark)

  return (
    <View style={[styles.insightRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SN.separator }]}>
      <Text style={[type.caption, { color: SN.secondaryLabel }]}>{label}</Text>
      <View style={[styles.insightValueWrap, { backgroundColor: toneBg }]}>
        <Text style={[type.caption, { color: toneColor, fontWeight: "600" }]} numberOfLines={3}>
          {value}
        </Text>
      </View>
    </View>
  )
}

function ConceptBar({ label, score, last }: { label: string; score: number; last?: boolean }) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const pct = Math.min(100, Math.max(0, score))

  return (
    <View style={[styles.conceptRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator }]}>
      <View style={styles.conceptHead}>
        <Text style={[type.callout, { fontWeight: "600", color: native.label }]}>{label}</Text>
        <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={[styles.conceptTrack, { backgroundColor: native.fill }]}>
        <View
          style={[
            styles.conceptFill,
            {
              width: `${pct}%`,
              backgroundColor: pct >= 70 ? tokens.success : pct >= 40 ? tokens.warning : tokens.danger,
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageScroll: { flex: 1 },
  pageCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorPage: { flex: 1, paddingHorizontal: NATIVE.pagePadding },
  summaryHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  summaryLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  xpTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 999,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 10,
  },
  summaryStat: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
    minHeight: 88,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: "hidden",
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  summaryIconTile: {
    width: MODERN.metricIconSize,
    height: MODERN.metricIconSize,
    borderRadius: MODERN.metricIconRadius,
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  panelPad: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  panelPadNote: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    lineHeight: 18,
  },
  calWrap: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  calCell: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  calLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  calLegendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  insightRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  insightValueWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: "100%",
  },
  conceptRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  conceptHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conceptTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  conceptFill: {
    height: "100%",
    borderRadius: 999,
  },
})
