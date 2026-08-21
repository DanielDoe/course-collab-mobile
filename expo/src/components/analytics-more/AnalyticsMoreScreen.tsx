import { useMemo, useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  Pressable,
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
import { useCodebenchProgress } from "../../hooks/useCodebenchProgress"
import {
  type CodebenchAnalysis,
  type CodebenchBadgeDetail,
  type CodebenchLeaderboardEntry,
  type CodebenchLearningPlan,
  type CodebenchStreak,
  type DailyChallenge,
} from "../../lib/codebench-api"
import type { StudentSession } from "../../lib/session"
import { AppErrorScreen } from "../errors/AppErrorScreen"
import { CommSectionFooter } from "../faculty/faculty-communication-ui"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { ModuleListRow, ModuleSection } from "../modules/ModuleScreen"
import { PillSwipeTabs } from "../theme/PillSwipeTabs"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  ANALYTICS_CALENDAR_ACTIVE,
  ANALYTICS_LEVEL_ACCENT,
  ANALYTICS_LEVEL_INK,
  ANALYTICS_LIST_THUMBS,
  ANALYTICS_SUMMARY_KPI,
  ANALYTICS_XP_FILL,
  type AnalyticsSummaryKpiId,
} from "../../lib/analytics-more-theme"
import { codebenchKpiSurface } from "../../lib/codebench-badge-theme"
import {
  ANALYTICS_TABS,
  BADGE_CATALOG,
  CONCEPT_LABELS,
  normalizeAnalyticsTab,
  type AnalyticsTabId,
  type LegacyAnalyticsTabId,
  xpLevel,
} from "./analytics-config"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
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

  const {
    loading,
    refreshing,
    analysisLoading,
    streak,
    badges,
    badgeDetails,
    leaderboard,
    dailyChallenge,
    submissionCount,
    totalXp,
    analysis,
    learningPlan,
    hasCodeSample,
    error,
    onRefresh,
  } = useCodebenchProgress(session, { enabled: !isLocked })

  const [activeTab, setActiveTab] = useState<AnalyticsTabId>(() => normalizeAnalyticsTab(initialTab))

  const badgeCount = useMemo(() => Object.values(badges).filter(Boolean).length, [badges])

  const myRank = useMemo(() => {
    if (!session) return null
    const id = Number(session.databaseId)
    return leaderboard.find((e) => e.student_id === id)?.rank ?? null
  }, [leaderboard, session])

  const pageScrollStyle = useMemo(
    () => ({
      paddingBottom: scrollPad.paddingBottom,
      gap: 12 as const,
      flexGrow: 1,
    }),
    [scrollPad.paddingBottom],
  )

  const xp = xpLevel(totalXp)
  const proficiency = analysis?.proficiencyScore ?? 0
  const levelLabel = analysis?.level ?? "Beginner"

  const openIde = (tool?: string) => {
    router.push({
      pathname: "/codebench/ide",
      params: tool ? { tool } : {},
    } as never)
  }

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
        subtitle="Deep coding insights, badges, streaks, and leaderboard — exclusive to Trailblazer members."
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

  const summarySection = !loading ? (
    <ProgressSummarySection
      xp={xp}
      totalXp={totalXp}
      streakDays={streak.streakDays ?? 0}
      badgeCount={badgeCount}
      submissionCount={submissionCount}
      myRank={myRank}
      levelLabel={levelLabel}
      proficiency={proficiency}
      analysisLoading={analysisLoading}
    />
  ) : null

  const pageFooter = (
    <CommSectionFooter>
      Analytics are based on your CodeBench submissions and daily activity.
    </CommSectionFooter>
  )

  function renderLoadingPage() {
    if (!(loading && !refreshing)) return null
    return (
      <View style={styles.pageCenter}>
        <ActivityIndicator color={native.tint} size="large" />
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading your analytics…</Text>
      </View>
    )
  }

  function renderPageScroll(content: ReactNode) {
    if (loading && !refreshing) return renderLoadingPage()

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
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        {summarySection}
        {content}
        {pageFooter}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View style={{ paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding }} />
      {error && !loading ? (
        <AppErrorScreen
          error={new Error(error)}
          feature="CodeBench analytics"
          onRetry={() => void onRefresh()}
          style={styles.errorPage}
        />
      ) : (
        <PillSwipeTabs
          options={navTabs}
          value={activeTab}
          onChange={setActiveTab}
          pagePaddingHorizontal={NATIVE.pagePadding}
          pages={[
            renderPageScroll(
              <ProfilePanel
                analysis={analysis}
                analysisLoading={analysisLoading}
                hasCodeSample={hasCodeSample}
                onOpenIde={() => openIde()}
              />,
            ),
            renderPageScroll(
              <AnalyticsPanel
                analysis={analysis}
                learningPlan={learningPlan}
                loading={analysisLoading}
                hasCodeSample={hasCodeSample}
                onOpenIde={() => openIde("evaluate")}
              />,
            ),
            renderPageScroll(
              <>
                <ChallengePanel challenge={dailyChallenge} onOpenIde={() => openIde("practice")} />
                <BadgesPanel badges={badges} badgeDetails={badgeDetails} />
                <LeaderboardPanel leaderboard={leaderboard} session={session} myRank={myRank} />
                <StreakPanel streak={streak} onOpenIde={() => openIde()} />
              </>,
            ),
          ]}
        />
      )}
    </View>
  )
}

function ProgressSummarySection({
  xp,
  totalXp,
  streakDays,
  badgeCount,
  submissionCount,
  myRank,
  levelLabel,
  proficiency,
  analysisLoading,
}: {
  xp: ReturnType<typeof xpLevel>
  totalXp: number
  streakDays: number
  badgeCount: number
  submissionCount: number
  myRank: number | null
  levelLabel: string
  proficiency: number
  analysisLoading: boolean
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <ModuleSection title="Overview">
      <View style={styles.summaryHeader}>
        <View style={styles.summaryLevelRow}>
          <View style={[styles.levelPill, { backgroundColor: ANALYTICS_LEVEL_ACCENT, borderColor: ANALYTICS_LEVEL_ACCENT }]}>
            <Ionicons name="sparkles-outline" size={14} color={ANALYTICS_LEVEL_INK} />
            <Text style={[type.caption, { color: ANALYTICS_LEVEL_INK, fontWeight: "700" }]}>{levelLabel}</Text>
          </View>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Level {xp.level}</Text>
        </View>
        <Text style={[type.footnote, { color: native.secondaryLabel }]}>
          {totalXp.toLocaleString()} XP · {100 - xp.inLevel} XP to next level
        </Text>
        <View style={[styles.xpTrack, { backgroundColor: native.fill }]}>
          <View
            style={[
              styles.xpFill,
              {
                width: `${xp.progress}%`,
                backgroundColor: ANALYTICS_XP_FILL,
              },
            ]}
          />
        </View>
        {!analysisLoading ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
            {Math.round(proficiency)}% coding proficiency
          </Text>
        ) : (
          <ActivityIndicator color={native.tint} size="small" style={styles.summarySpinner} />
        )}
      </View>

      <View style={styles.summaryRow}>
        <SummaryStat id="streak" label="Streak" value={`${streakDays}d`} />
        <SummaryStat id="badges" label="Badges" value={String(badgeCount)} />
        <SummaryStat id="subs" label="Submissions" value={String(submissionCount)} />
        <SummaryStat id="rank" label="Rank" value={myRank ? `#${myRank}` : "—"} />
      </View>
    </ModuleSection>
  )
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

function ProfilePanel({
  analysis,
  analysisLoading,
  hasCodeSample,
  onOpenIde,
}: {
  analysis: CodebenchAnalysis | null
  analysisLoading: boolean
  hasCodeSample: boolean
  onOpenIde: () => void
}) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  if (!hasCodeSample) {
    return (
    <ModuleSection title="Coding profile">
        <View style={styles.panelPad}>
          <FacultyEmptyState
            icon="code-slash-outline"
            title="No code to analyze yet"
            body="Write and submit C++ in CodeBench to unlock AI-powered profile insights."
          />
        </View>
        <ModuleListRow
          title="Open CodeBench IDE"
          subtitle="Compile, debug, and submit your first program"
          icon="play-outline"
          solidThumb={ANALYTICS_LIST_THUMBS.ide}
          last
          onPress={onOpenIde}
        />
      </ModuleSection>
    )
  }

  return (
    <>
      <ModuleSection title="Learning insights">
        {analysisLoading ? (
          <View style={styles.panelLoading}>
            <ActivityIndicator color={tokens.accent} />
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>Analyzing your latest submission…</Text>
          </View>
        ) : (
          <>
            <InsightRow label="Focus area" value={analysis?.mainWeakness ?? "—"} tone="weak" />
            <InsightRow label="Most improved" value={analysis?.mostImproved ?? "—"} tone="good" last={false} />
            <InsightRow label="Practice next" value={analysis?.recommendedPractice ?? "—"} tone="neutral" last />
          </>
        )}
      </ModuleSection>

      {analysis?.recommendations?.length ? (
        <ModuleSection title="Recommendations">
          {analysis.recommendations.slice(0, 4).map((item, index, arr) => (
            <ModuleListRow
              key={item}
              title={item}
              icon="checkmark-circle-outline"
              solidThumb={ANALYTICS_LIST_THUMBS.recommendation}
              last={index === arr.length - 1}
            />
          ))}
        </ModuleSection>
      ) : null}

      <ModuleSection title="Workspace">
        <ModuleListRow
          title="Continue in IDE"
          subtitle="Review and improve your latest submission"
          icon="code-slash-outline"
          solidThumb={ANALYTICS_LIST_THUMBS.ide}
          last
          onPress={onOpenIde}
        />
      </ModuleSection>
    </>
  )
}

function AnalyticsPanel({
  analysis,
  learningPlan,
  loading,
  hasCodeSample,
  onOpenIde,
}: {
  analysis: CodebenchAnalysis | null
  learningPlan: CodebenchLearningPlan | null
  loading: boolean
  hasCodeSample: boolean
  onOpenIde: () => void
}) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={tokens.accent} />
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>Analyzing your coding patterns…</Text>
      </View>
    )
  }

  if (!hasCodeSample || !analysis) {
    return (
      <ModuleSection title="Concept analytics">
        <View style={styles.panelPad}>
          <FacultyEmptyState
            icon="bar-chart-outline"
            title="Analytics unlock with code"
            body="Submit code in the IDE to unlock AI-powered concept analytics."
          />
        </View>
        <ModuleListRow
          title="Submit and evaluate code"
          icon="checkmark-done-outline"
          solidThumb={ANALYTICS_LIST_THUMBS.evaluate}
          last
          onPress={onOpenIde}
        />
      </ModuleSection>
    )
  }

  const concepts = analysis.concepts ?? {}
  const conceptEntries = Object.entries(concepts)

  return (
    <>
      {conceptEntries.length ? (
        <ModuleSection title="Concept mastery">
          {conceptEntries.map(([key, score], index) => (
            <ConceptBar
              key={key}
              label={CONCEPT_LABELS[key] ?? key}
              score={Number(score)}
              last={index === conceptEntries.length - 1}
            />
          ))}
        </ModuleSection>
      ) : null}

      <ModuleSection title="Strengths & weaknesses">
        <TagGroup title="Strengths" items={(analysis.strengths ?? []).slice(0, 4)} tone="success" bordered />
        <TagGroup title="Weaknesses" items={(analysis.weaknesses ?? []).slice(0, 4)} tone="accent" />
      </ModuleSection>

      {learningPlan ? (
        <ModuleSection
          title="Weekly learning plan"
          footer={
            learningPlan.study_time_minutes
              ? `${learningPlan.study_time_minutes} minutes per week suggested`
              : undefined
          }
        >
          {learningPlan.weekly_plan ? (
            <View style={styles.panelPad}>
              <Text style={[type.body, styles.planBody]}>{learningPlan.weekly_plan}</Text>
            </View>
          ) : null}
          {(learningPlan.tasks ?? []).map((task, index, arr) => (
            <ModuleListRow
              key={`${task}-${index}`}
              title={task}
              meta={`Task ${index + 1}`}
              icon="list-outline"
              solidThumb={ANALYTICS_LIST_THUMBS.task}
              last={index === arr.length - 1}
            />
          ))}
        </ModuleSection>
      ) : null}
    </>
  )
}

function BadgesPanel({
  badges,
  badgeDetails,
}: {
  badges: Record<string, boolean>
  badgeDetails: Record<string, CodebenchBadgeDetail>
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const unlocked = BADGE_CATALOG.filter((b) => badges[b.id]).length
  const total = BADGE_CATALOG.length
  const pct = total ? (unlocked / total) * 100 : 0

  return (
    <>
      <ModuleSection
        title="Badge collection"
        footer={unlocked === total ? "You earned every badge — impressive!" : `${total - unlocked} badges left to unlock.`}
      >
        <View style={styles.badgeSummary}>
          <View style={styles.badgeSummaryCopy}>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>Earned</Text>
            <View style={styles.badgeCountRow}>
              <Text style={[styles.badgeCountValue, { color: native.label }]}>{String(unlocked)}</Text>
              <Text style={[type.body, styles.badgeCountTotal, { color: SN.secondaryLabel }]}>
                / {total}
              </Text>
            </View>
          </View>
          <SolidListThumbTile
            thumb={ANALYTICS_LIST_THUMBS.badgeSummary}
            icon="ribbon"
            size="compact"
            style={styles.badgeSummaryIconTile}
          />
        </View>
        <View
          style={[
            styles.badgeProgressTrack,
            {
              backgroundColor: native.fill,
              borderColor: native.separator,
            },
          ]}
        >
          <View
            style={[
              styles.badgeProgressFill,
              {
                width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`,
                backgroundColor: pct > 0 ? ANALYTICS_SUMMARY_KPI.badges.accent : "transparent",
              },
            ]}
          />
        </View>
      </ModuleSection>

      <ModuleSection title="All badges">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
          {BADGE_CATALOG.map((badge) => {
            const earned = badges[badge.id]
            const detail = badgeDetails[badge.id]
            return (
              <View key={badge.id} style={[styles.badgeItem, !earned && styles.badgeLocked]}>
                <View
                  style={[
                    styles.badgeEmojiWrap,
                    {
                      backgroundColor: earned ? semanticSoft(tokens.warning, tokens.isDark) : SN.accentSoft,
                      borderColor: earned ? semanticSoft(tokens.warning, tokens.isDark, 0.35) : SN.accentBorder,
                    },
                  ]}
                >
                  <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>{badge.icon}</Text>
                </View>
                <Text
                  style={[type.footnote, styles.badgeName, { color: earned ? native.label : SN.secondaryLabel }]}
                  numberOfLines={2}
                >
                  {badge.name}
                </Text>
                <Text style={[type.footnote, { color: earned ? tokens.accent : SN.secondaryLabel }]}>
                  {earned
                    ? detail?.earnedAt
                      ? new Date(detail.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      : "Earned"
                    : "Locked"}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      </ModuleSection>
    </>
  )
}

function ChallengePanel({
  challenge,
  onOpenIde,
}: {
  challenge: DailyChallenge | null
  onOpenIde: () => void
}) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  if (!challenge) {
    return (
      <ModuleSection title="Daily challenge">
        <View style={styles.panelPad}>
          <FacultyEmptyState
            icon="today-outline"
            title="No challenge today"
            body="Check back later or open the IDE to practice on your own."
          />
        </View>
        <ModuleListRow
          title="Open IDE"
          icon="code-slash-outline"
          solidThumb={ANALYTICS_LIST_THUMBS.ide}
          last
          onPress={onOpenIde}
        />
      </ModuleSection>
    )
  }

  return (
    <ModuleSection title="Daily challenge">
      <View style={styles.panelPad}>
        <View style={styles.panelHeader}>
          <Text style={[type.bodyEmphasis, styles.panelTitle]}>{challenge.title}</Text>
          {challenge.completed ? (
            <View style={[styles.statusPill, { backgroundColor: semanticSoft(tokens.success, tokens.isDark) }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color={tokens.success} />
              <Text style={[styles.statusPillText, { color: tokens.success }]}>Done</Text>
            </View>
          ) : null}
        </View>
        <Text style={[type.caption, styles.panelBody]} numberOfLines={5}>
          {challenge.description}
        </Text>
        <Text style={[type.footnote, styles.panelMeta, { color: SN.secondaryLabel }]}>
          {challenge.difficulty} · +{challenge.xpReward} XP
        </Text>
      </View>
      {!challenge.completed ? (
        <ModuleListRow
          title="Solve in IDE"
          subtitle="Opens practice mode with today's challenge"
          icon="play-outline"
          solidThumb={ANALYTICS_LIST_THUMBS.practice}
          last
          onPress={onOpenIde}
        />
      ) : null}
    </ModuleSection>
  )
}

function LeaderboardPanel({
  leaderboard,
  session,
  myRank,
}: {
  leaderboard: CodebenchLeaderboardEntry[]
  session: StudentSession
  myRank: number | null
}) {
  const SN = useThemedStudentNative()
  const type = useNativeType()

  if (leaderboard.length === 0) {
    return (
      <ModuleSection title="Leaderboard">
        <View style={styles.panelPad}>
          <FacultyEmptyState
            icon="podium-outline"
            title="No rankings yet"
            body="Submit code in CodeBench to appear on the class leaderboard."
          />
        </View>
      </ModuleSection>
    )
  }

  const rows = leaderboard.slice(0, 12)

  return (
    <ModuleSection
      title="Class rankings"
      footer={myRank ? `You are ranked #${myRank} this week.` : "Submit code to appear on the leaderboard."}
    >
      {rows.map((entry, index) => {
        const isYou = session.databaseId === String(entry.student_id)
        const rank = entry.rank ?? index + 1
        return (
          <ModuleListRow
            key={String(entry.student_id ?? index)}
            title={isYou ? "You" : entry.student_name ?? "Student"}
            subtitle={`${entry.total_activities ?? 0} activities`}
            meta={`${entry.xp ?? 0} XP`}
            solidThumb={isYou ? ANALYTICS_LIST_THUMBS.recommendation : undefined}
            thumbIndex={isYou ? undefined : index}
            icon={rank === 1 ? "trophy-outline" : rank === 2 ? "medal-outline" : rank === 3 ? "ribbon-outline" : "person-outline"}
            iconBg={isYou ? undefined : SN.fill}
            iconColor={isYou ? undefined : SN.secondaryLabel}
            badge={
              <View style={[styles.rankChip, { backgroundColor: isYou ? SN.accentSoftStrong : SN.fill }]}>
                <Text style={[type.footnote, { color: isYou ? SN.accentDark : SN.secondaryLabel, fontWeight: "700" }]}>
                  #{rank}
                </Text>
              </View>
            }
            last={index === rows.length - 1}
          />
        )
      })}
    </ModuleSection>
  )
}

function StreakPanel({ streak, onOpenIde }: { streak: CodebenchStreak; onOpenIde: () => void }) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const days = streak.streakDays ?? 0
  const calendar = streak.calendarData ?? {}
  const stats = streak.activityStats ?? { totalSubmissions: 0, activeDays: 0 }

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
      <ModuleSection title="Current streak">
        <View style={styles.streakHero}>
          <SolidListThumbTile
            thumb={ANALYTICS_LIST_THUMBS.streakHero}
            icon="flame"
            size="compact"
            style={styles.streakIconTile}
          />
          <Text style={[type.bodyEmphasis, styles.streakValue, { color: native.label }]}>{days}</Text>
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>day{days === 1 ? "" : "s"} in a row</Text>
          <Text style={[type.footnote, styles.streakSub, { color: SN.tertiaryLabel }]}>
            Code daily to keep your streak alive.
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <SummaryStat id="submissions" label="Submissions" value={String(stats.totalSubmissions)} />
          <SummaryStat id="activeDays" label="Active days" value={String(stats.activeDays)} />
        </View>
      </ModuleSection>

      <ModuleSection title="Activity calendar" footer="Each square is one day over the last five weeks.">
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
            <Text style={[type.footnote, { color: SN.secondaryLabel }]}>Inactive</Text>
            <View style={[styles.calLegendSwatch, { backgroundColor: ANALYTICS_CALENDAR_ACTIVE }]} />
            <Text style={[type.footnote, { color: SN.secondaryLabel }]}>Active</Text>
          </View>
        </View>
      </ModuleSection>

      {days === 0 ? (
        <ModuleSection>
          <ModuleListRow
            title="Start your streak in IDE"
            subtitle="Submit any program today to begin"
            icon="play-outline"
            solidThumb={ANALYTICS_LIST_THUMBS.ide}
            last
            onPress={onOpenIde}
          />
        </ModuleSection>
      ) : null}
    </>
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
  const toneColor =
    tone === "weak" ? tokens.danger : tone === "good" ? tokens.warning : tokens.accent
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
  const SN = useThemedStudentNative()
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

function TagGroup({
  title,
  items,
  tone,
  bordered,
}: {
  title: string
  items: string[]
  tone: "success" | "accent"
  bordered?: boolean
}) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const color = tone === "success" ? tokens.success : tokens.accent

  if (!items.length) {
    return (
      <View style={[styles.tagGroup, bordered && { borderBottomColor: SN.separator }]}>
        <Text style={[type.caption, { color: SN.secondaryLabel, fontWeight: "600" }]}>{title}</Text>
        <Text style={[type.footnote, { color: SN.tertiaryLabel }]}>Not enough data yet.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.tagGroup, bordered && { borderBottomColor: SN.separator }]}>
      <Text style={[type.caption, { color: SN.secondaryLabel, fontWeight: "600" }]}>{title}</Text>
      <View style={styles.tagRow}>
        {items.map((item) => (
          <View key={item} style={[styles.tagChip, { backgroundColor: semanticSoft(color, tokens.isDark) }]}>
            <Text style={[type.footnote, { color, fontWeight: "600" }]} numberOfLines={2}>
              {item}
            </Text>
          </View>
        ))}
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
  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 24 },
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
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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
  summarySpinner: { alignSelf: "flex-start" },
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
  panelLoading: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  panelTitle: { flex: 1 },
  panelBody: { lineHeight: 18 },
  panelMeta: { marginTop: 6 },
  planBody: { lineHeight: 21 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  badgeSummaryCopy: { gap: 4 },
  badgeCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  badgeCountValue: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
  badgeCountTotal: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  badgeSummaryIconTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  badgeProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  badgeScroll: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  badgeItem: {
    width: 88,
    alignItems: "center",
    gap: 6,
  },
  badgeLocked: { opacity: 0.72 },
  badgeEmojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeEmoji: { fontSize: 26 },
  badgeEmojiLocked: { opacity: 0.55 },
  badgeName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
  rankChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streakHero: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  streakIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 44,
  },
  streakSub: {
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 12,
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
  tagGroup: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: "100%",
  },
})
