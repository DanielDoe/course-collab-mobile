import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useModuleContentTopPadding, useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { hasNavAccess } from "../../constants/student-nav"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { StudentThemedLocked } from "../student/student-themed-hero"
import {
  CommSectionFooter,
  CommSectionHeader,
} from "../faculty/faculty-communication-ui"
import { CoraBrand } from "../cora/CoraBrand"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { AppErrorScreen } from "../errors/AppErrorScreen"
import { ApiError } from "../../lib/api"
import { codebenchFailureMessage } from "../../lib/codebench-progress"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import {
  codebenchApi,
  type CodebenchLeaderboardEntry,
  type DailyChallenge,
} from "../../lib/codebench-api"
import { stashPendingDailyChallenge } from "../../lib/codebench-daily-challenge-pending"
import type { StudentSession } from "../../lib/session"
import {
  adaptThumbPaletteForAppearance,
  listThumbPalette,
  listThumbPaletteOptions,
  thumbDotAlpha,
  thumbIconCircleBackground,
} from "../theme/list-thumb-palette"
import { CODEBENCH_BADGE_THEMES, CODEBENCH_KPI_ACCENTS, codebenchKpiSurface, type CodebenchBadgeId } from "../../lib/codebench-badge-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

import { PODIUM_MEDAL } from "../../lib/leaderboard-podium-theme"

const CODE_GOLD = PODIUM_MEDAL.first

const BADGE_CATALOG: Array<{
  id: CodebenchBadgeId
  name: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "loops_master", name: "Mastered Loops", icon: "sync-outline" },
  { id: "bug_hunter", name: "Bug Hunter", icon: "bug-outline" },
  { id: "clean_code", name: "Clean Code", icon: "sparkles-outline" },
  { id: "streak_3", name: "3-Day Streak", icon: "flame-outline" },
  { id: "streak_7", name: "7-Day Streak", icon: "flame" },
  { id: "stl_expert", name: "STL Expert", icon: "library-outline" },
]

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function HubSection({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer?: string
}) {
  return (
    <View style={styles.section}>
      <CommSectionHeader title={title} />
      {children}
      {footer ? <CommSectionFooter>{footer}</CommSectionFooter> : null}
    </View>
  )
}

function ThumbDotGrid({ color, alpha }: { color: string; alpha?: number }) {
  const dotAlpha = alpha ?? 0.24
  return (
    <View style={styles.dotGrid} pointerEvents="none">
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={[styles.dotGridCell, { backgroundColor: hexToRgba(color, dotAlpha) }]} />
      ))}
    </View>
  )
}

function CodebenchHeroCard({ onPress }: { onPress: () => void }) {
  const type = useNativeType()
  const tokens = useAppThemeTokens()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.heroWrap, pressed && { opacity: NATIVE.pressedOpacity }]}
      accessibilityRole="button"
      accessibilityLabel="Open CodeBench IDE"
    >
      <LinearGradient
        colors={tokens.isDark ? ["#1e1b4b", "#312e81", "#1e293b"] : ["#312e81", "#4c1d95", "#0f766e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, tokens.cardShadow]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIconWell}>
            <Ionicons name="code-slash" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.heroCoraPill}>
            <CoraBrand size="xs" variant="solid" color={CODE_GOLD} />
            <Text style={styles.heroCoraText}>built in</Text>
          </View>
        </View>
        <Text style={[type.sheetTitle, styles.heroTitle]}>CodeBench IDE</Text>
        <Text style={styles.heroSubtitle} numberOfLines={2}>
          Write, run, and learn with Cora — explain, debug, and practice in one workspace.
        </Text>
        <View style={styles.heroCta}>
          <Text style={styles.heroCtaText}>Open editor</Text>
          <Ionicons name="arrow-forward" size={16} color="#1e1b4b" />
        </View>
      </LinearGradient>
    </Pressable>
  )
}

type KpiMetric = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  accent: string
}

function KpiMiniCard({ metric }: { metric: KpiMetric }) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const surface = codebenchKpiSurface(metric.accent)

  return (
    <View
      style={[
        styles.kpiMiniCard,
        tokens.cardShadow,
        { backgroundColor: surface.background, borderColor: surface.border },
      ]}
    >
      <SolidListThumbTile
        thumb={surface.iconThumb}
        icon={metric.icon}
        size="compact"
        style={styles.kpiMiniIcon}
      />
      <Text style={[type.bodyEmphasis, styles.kpiMiniValue, { color: surface.value }]} numberOfLines={1}>
        {metric.value}
      </Text>
      <Text style={[type.caption, styles.kpiMiniLabel, { color: surface.label }]} numberOfLines={1}>
        {metric.label}
      </Text>
    </View>
  )
}

function KpiGrid({
  streakDays,
  badgeCount,
  totalXp,
}: {
  streakDays: number
  badgeCount: number
  totalXp: number
}) {
  const metrics: KpiMetric[] = [
    {
      icon: "flame-outline",
      label: "Streak",
      value: `${streakDays}d`,
      accent: CODEBENCH_KPI_ACCENTS.streak,
    },
    {
      icon: "ribbon-outline",
      label: "Badges",
      value: String(badgeCount),
      accent: CODEBENCH_KPI_ACCENTS.badges,
    },
    {
      icon: "flash-outline",
      label: "XP",
      value: String(totalXp),
      accent: CODEBENCH_KPI_ACCENTS.xp,
    },
  ]

  return (
    <View style={styles.kpiRow}>
      {metrics.map((metric) => (
        <KpiMiniCard key={metric.label} metric={metric} />
      ))}
    </View>
  )
}

function ChallengeCard({
  challenge,
  onPress,
}: {
  challenge: DailyChallenge
  onPress: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const palette = adaptThumbPaletteForAppearance(SYSTEM.orange, tokens.isDark, native.secondaryGrouped)
  const dotAlpha = thumbDotAlpha(tokens.isDark)
  const iconCircleBg = thumbIconCircleBackground(tokens.isDark, tokens.elevatedSurface, palette.soft)

  return (
    <Pressable
      onPress={onPress}
      disabled={challenge.completed}
      style={({ pressed }) => [
        styles.listCard,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed && !challenge.completed ? NATIVE.pressedOpacity : 1,
        },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: palette.soft, borderColor: palette.border }]}>
        <ThumbDotGrid color={palette.color} alpha={dotAlpha} />
        <View style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
          <Ionicons name={challenge.completed ? "checkmark-circle-outline" : "trophy-outline"} size={16} color={palette.color} />
        </View>
      </View>
      <View style={styles.cardCopy}>
        <Text style={[type.bodyEmphasis, styles.cardTitle, { color: native.label }]} numberOfLines={2}>
          {challenge.title}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
          {challenge.description}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.metaPill, { backgroundColor: hexToRgba(palette.color, 0.12) }]}>
            <Text style={[type.footnote, { color: palette.color, fontWeight: "600" }]}>{challenge.difficulty}</Text>
          </View>
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>+{challenge.xpReward} XP</Text>
          {challenge.completed ? (
            <Text style={[type.footnote, { color: tokens.success, fontWeight: "600" }]}>Completed</Text>
          ) : null}
        </View>
      </View>
      {!challenge.completed ? (
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      ) : null}
    </Pressable>
  )
}

function BadgeChip({
  id,
  name,
  icon,
  unlocked,
}: {
  id: CodebenchBadgeId
  name: string
  icon: keyof typeof Ionicons.glyphMap
  unlocked: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const theme = CODEBENCH_BADGE_THEMES[id]
  const iconColor = unlocked ? theme.icon : hexToRgba(theme.icon, 0.88)

  return (
    <View
      style={[
        styles.badgeChip,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: unlocked ? hexToRgba(theme.fill, 0.55) : hexToRgba(theme.fill, 0.32),
        },
      ]}
      accessibilityLabel={`${name}, ${unlocked ? "earned" : "locked"}`}
    >
      <View style={[styles.badgeChipThumb, { backgroundColor: theme.fill, borderColor: theme.fill }]}>
        {!unlocked ? (
          <View pointerEvents="none" style={[styles.badgeChipLockVeil, { backgroundColor: "rgba(0,0,0,0.28)" }]} />
        ) : null}
        <Ionicons name={icon} size={24} color={iconColor} />
        {!unlocked ? (
          <View style={[styles.badgeLockBadge, { backgroundColor: native.secondaryGrouped, borderColor: theme.fill }]}>
            <Ionicons name="lock-closed" size={9} color={theme.fill} />
          </View>
        ) : (
          <View style={[styles.badgeEarnedBadge, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
            <Ionicons name="checkmark" size={9} color={theme.fill} />
          </View>
        )}
      </View>

      <Text
        style={[
          type.caption,
          styles.badgeChipName,
          { color: unlocked ? native.label : native.secondaryLabel },
        ]}
        numberOfLines={2}
      >
        {name}
      </Text>

      <View
        style={[
          styles.badgeStatusPill,
          {
            backgroundColor: unlocked ? hexToRgba(theme.fill, 0.18) : hexToRgba(theme.fill, tokens.isDark ? 0.14 : 0.1),
          },
        ]}
      >
        <Text
          style={[
            type.footnote,
            styles.badgeStatusText,
            { color: unlocked ? theme.label : hexToRgba(theme.label, tokens.isDark ? 0.82 : 0.72) },
          ]}
        >
          {unlocked ? "Earned" : "Locked"}
        </Text>
      </View>
    </View>
  )
}

function LeaderboardRow({
  entry,
  index,
  isYou,
}: {
  entry: CodebenchLeaderboardEntry
  index: number
  isYou: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const thumbOpts = listThumbPaletteOptions(native.secondaryGrouped, tokens.accent)
  const palette = listThumbPalette(index, tokens.isDark, thumbOpts)
  const rank = entry.rank ?? index + 1
  const dotAlpha = thumbDotAlpha(tokens.isDark)
  const iconCircleBg = thumbIconCircleBackground(tokens.isDark, tokens.elevatedSurface, palette.soft)

  return (
    <View
      style={[
        styles.listCard,
        tokens.cardShadow,
        {
          backgroundColor: isYou ? tokens.accentSoft : native.secondaryGrouped,
          borderColor: isYou ? tokens.accentBorder : tokens.border,
        },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: palette.soft, borderColor: palette.border }]}>
        <ThumbDotGrid color={palette.color} alpha={dotAlpha} />
        <View style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
          <Text style={[styles.rankGlyph, { color: palette.color }]}>{rank}</Text>
        </View>
      </View>
      <View style={styles.cardCopy}>
        <Text style={[type.bodyEmphasis, styles.cardTitle, { color: native.label }]} numberOfLines={1}>
          {isYou ? "You" : entry.student_name ?? "Student"}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
          {entry.total_activities ?? 0} activities
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="ellipse" size={7} color={palette.color} />
          <Text style={[type.footnote, { color: palette.color, fontWeight: "600" }]}>{entry.xp ?? 0} XP</Text>
        </View>
      </View>
      {index === 0 ? <Ionicons name="trophy" size={16} color={CODE_GOLD} /> : null}
    </View>
  )
}

function ActionRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listCard,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: SN.accentSoft }]}>
        <Ionicons name={icon} size={18} color={SN.accent} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={[type.bodyEmphasis, styles.cardTitle, { color: native.label }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    </Pressable>
  )
}

export function CodebenchScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const lockedTopPad = useModuleContentTopPadding(24)
  const scrollPad = useModuleScrollContentPadding()
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [statsNotice, setStatsNotice] = useState("")
  const [streakDays, setStreakDays] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)
  const [badges, setBadges] = useState<Record<string, boolean>>({})
  const [leaderboard, setLeaderboard] = useState<CodebenchLeaderboardEntry[]>([])
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [totalXp, setTotalXp] = useState(0)

  const isLocked = membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")

  const loadProgress = useCallback(async () => {
    if (!session) return
    if (isLocked) {
      setLoading(false)
      return
    }
    const failed: string[] = []
    try {
      const [streakRes, badgesRes, lbRes, subsRes] = await Promise.all([
        codebenchApi.getStreak(session).catch(() => {
          failed.push("streak")
          return { streakDays: 0 }
        }),
        codebenchApi.getBadges(session).catch(() => {
          failed.push("badges")
          return { badges: {}, badgeDetails: {} }
        }),
        codebenchApi.getLeaderboard(session).catch(() => {
          failed.push("leaderboard")
          return { leaderboard: [] }
        }),
        codebenchApi.getSubmissions(session).catch(() => {
          failed.push("submissions")
          return {
            codeSubmissions: [],
            practiceSubmissions: [],
            dailyChallengeSubmissions: [],
          }
        }),
      ])

      setStreakDays(streakRes.streakDays ?? 0)
      setBadges(badgesRes.badges ?? {})
      setBadgeCount(Object.values(badgesRes.badges ?? {}).filter(Boolean).length)
      setLeaderboard(lbRes.leaderboard ?? [])

      const subs = subsRes.codeSubmissions ?? []
      setSubmissionCount(subs.length)
      const xpSum = subs.reduce((sum, s) => sum + Number(s.points_awarded ?? 0), 0)
      setTotalXp(Math.round(xpSum))
      // A missing stat should not hide the editor and challenges behind an error
      // screen, so surface it as a banner and keep the hub usable.
      setStatsNotice(codebenchFailureMessage(failed))
      setError("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your CodeBench progress.")
    }

    void codebenchApi
      .getDailyChallenge(session)
      .then((challengeRes) => {
        if (challengeRes && "title" in challengeRes) setDailyChallenge(challengeRes)
      })
      .catch(() => setDailyChallenge(null))
  }, [session, isLocked])

  useEffect(() => {
    if (!session) return
    if (isLocked) {
      setLoading(false)
      return
    }
    setLoading(true)
    void loadProgress().finally(() => setLoading(false))
  }, [session, isLocked, loadProgress])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadProgress()
    setRefreshing(false)
  }, [loadProgress])

  const openDailyChallenge = () => {
    if (!dailyChallenge) return
    stashPendingDailyChallenge(dailyChallenge)
    openIde("practice")
  }

  const openIde = (tool?: string) => {
    if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) {
      AppAlert.alert("Trailblazer required", "CodeBench requires Trailblazer membership.", [
        { text: "Cancel", style: "cancel" },
        { text: "View plans", onPress: () => router.push("/membership" as never) },
      ])
      return
    }
    router.push({
      pathname: "/codebench/ide",
      params: tool ? { tool } : {},
    } as never)
  }

  const myRank = useMemo(() => {
    if (!session) return null
    const id = Number(session.databaseId)
    return leaderboard.find((e) => e.student_id === id)?.rank ?? null
  }, [leaderboard, session])

  const scrollContentStyle = useMemo(
    () => ({
      paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding,
      paddingBottom: scrollPad.paddingBottom,
      paddingHorizontal: NATIVE.pagePadding,
      gap: NATIVE.sectionGap,
      flexGrow: 1,
    }),
    [scrollPad.paddingBottom, scrollPad.paddingTop],
  )

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  if (isLocked) {
    return (
      <StudentThemedLocked
        icon="code-slash"
        subtitle="Write C++, C, or Python and review it with Cora — available on Trailblazer."
        paddingTop={lockedTopPad}
        onUpgrade={() => router.push("/membership" as never)}
      />
    )
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: native.groupedBackground }]}
      contentContainerStyle={scrollContentStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
      }
    >
      <CodebenchHeroCard onPress={() => openIde()} />

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={SN.accent} />
          <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading your progress…</Text>
        </View>
      ) : error ? (
        <AppErrorScreen
          error={new Error(error)}
          feature="CodeBench"
          onRetry={() => void onRefresh()}
          style={styles.errorPanel}
        />
      ) : (
        <>
          <QueryRefreshBanner
            visible={Boolean(statsNotice)}
            message={statsNotice}
            onRetry={() => void onRefresh()}
          />
          <KpiGrid streakDays={streakDays} badgeCount={badgeCount} totalXp={totalXp} />

          {dailyChallenge ? (
            <HubSection title="Daily Challenge">
              <ChallengeCard
                challenge={dailyChallenge}
                onPress={openDailyChallenge}
              />
            </HubSection>
          ) : null}

          <HubSection
            title="Badges"
            footer={`${badgeCount} of ${BADGE_CATALOG.length} badges earned`}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeScroll}
            >
              {BADGE_CATALOG.map((badge) => (
                <BadgeChip
                  key={badge.id}
                  id={badge.id}
                  name={badge.name}
                  icon={badge.icon}
                  unlocked={Boolean(badges[badge.id])}
                />
              ))}
            </ScrollView>
          </HubSection>

          <HubSection
            title="Leaderboard"
            footer={
              myRank
                ? `You are ranked #${myRank} this week.`
                : "Submit code to appear on the leaderboard."
            }
          >
            {leaderboard.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
                <Ionicons name="podium-outline" size={22} color={native.tertiaryLabel} />
                <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
                  No rankings yet — open the IDE and submit your first program.
                </Text>
              </View>
            ) : (
              <View style={styles.cardStack}>
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <LeaderboardRow
                    key={String(entry.student_id ?? index)}
                    entry={entry}
                    index={index}
                    isYou={session.databaseId === String(entry.student_id)}
                  />
                ))}
              </View>
            )}
          </HubSection>

          <HubSection title="Recent Activity">
            <ActionRow
              title="Submit and evaluate code"
              subtitle={
                submissionCount > 0
                  ? `${submissionCount} recent submission${submissionCount === 1 ? "" : "s"} on record`
                  : "Run your code in the IDE and submit for review"
              }
              icon="checkmark-done-outline"
              onPress={() => openIde("evaluate")}
            />
          </HubSection>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { gap: 8 },
  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 24 },
  errorPanel: { flexGrow: 0, paddingVertical: 8 },
  heroWrap: { borderRadius: 20 },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    gap: 8,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroCoraPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroCoraText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 20,
  },
  heroCta: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  heroCtaText: {
    color: "#1e1b4b",
    fontSize: 15,
    fontWeight: "700",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiMiniCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  kpiMiniIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  kpiMiniValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  kpiMiniLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 72,
  },
  cardStack: { gap: 8 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  dotGrid: {
    position: "absolute",
    left: 5,
    bottom: 5,
    width: 10,
    height: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  dotGridCell: {
    width: 3,
    height: 3,
    borderRadius: 999,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rankGlyph: {
    fontSize: 13,
    fontWeight: "800",
  },
  badgeScroll: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: 4,
  },
  badgeChip: {
    width: 112,
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  badgeChipThumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeChipLockVeil: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  badgeLockBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEarnedBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeChipName: {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
    minHeight: 32,
  },
  badgeStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeStatusText: {
    fontWeight: "700",
    fontSize: 11,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
})
