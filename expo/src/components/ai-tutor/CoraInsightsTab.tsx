import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { DashboardCard } from "../dashboard/DashboardCard"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { codebenchKpiSurface } from "../../lib/codebench-badge-theme"
import { CORA_INSIGHTS_HERO_THUMB, CORA_INSIGHTS_KPI, type CoraInsightsKpiId } from "../../lib/cora-insights-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import type { AiTutorStats, CoraProgressDetailed, TopicMasteryItem } from "../../lib/ai-tutor-api"
import {
  masteryStatusLabel,
  normalizeMasteryPercent,
  type CoraConceptMastery,
} from "../../lib/cora-insights-types"
import { CoraNavCardList, CoraNavListCard, type CoraNavCardItem } from "./CoraNavListCard"
import {
  InteractionMixChart,
  TopicMasteryBars,
  WeeklyActivityChart,
} from "./cora-insights-charts"

function mergeTopicMastery(
  progress: CoraProgressDetailed | null,
  fallback: TopicMasteryItem[],
): CoraConceptMastery[] {
  if (progress?.conceptMastery?.length) return progress.conceptMastery
  return fallback.map((item) => ({
    topic: item.topic,
    mastery: normalizeMasteryPercent(item.mastery),
    questionsAsked: item.questionsAsked,
    accuracy: item.accuracy,
  }))
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

function KpiTile({
  id,
  label,
  value,
}: {
  id: CoraInsightsKpiId
  label: string
  value: string
}) {
  const type = useNativeType()
  const kpi = CORA_INSIGHTS_KPI[id]
  const surface = codebenchKpiSurface(kpi.accent)
  const cardLayout = useKpiGridCardStyle("48%")

  return (
    <View
      style={[
        styles.kpiTile,
        cardLayout,
        { backgroundColor: surface.background, borderColor: surface.border },
      ]}
    >
      <SolidListThumbTile thumb={surface.iconThumb} icon={kpi.icon} size="compact" style={styles.kpiIconTile} />
      <Text style={[type.footnote, { color: surface.label }]}>{label}</Text>
      <Text style={[type.bodyEmphasis, styles.kpiValue, { color: surface.value }]}>{value}</Text>
    </View>
  )
}

export function CoraInsightsTab({
  stats,
  topicMastery,
  progress,
  loading,
  onClose,
  onOpenChat,
  onOpenSolve,
  onOpenStudyPlan,
}: {
  stats: AiTutorStats | null
  topicMastery: TopicMasteryItem[]
  progress: CoraProgressDetailed | null
  loading: boolean
  onClose?: () => void
  onOpenChat?: () => void
  onOpenSolve?: () => void
  onOpenStudyPlan?: () => void
}) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  const behavior = progress?.behaviorInsights ?? {}
  const trends = progress?.interactionTrends ?? {}
  const topics = mergeTopicMastery(progress, topicMastery)
  const hasInsights =
    topics.length > 0 ||
    (stats?.totalQuestions ?? 0) > 0 ||
    (trends.totalInteractions ?? 0) > 0

  const goToModule = (route: string) => {
    onClose?.()
    router.push(route as never)
  }

  const quickLinks: CoraNavCardItem[] = [
    {
      id: "grades",
      title: "Grades",
      subtitle: "Course scores and progress",
      meta: "Open",
      icon: "school-outline",
    },
    {
      id: "study-plan",
      title: "Study plan",
      subtitle: "Turn insights into scheduled sessions",
      meta: "Plan",
      icon: "calendar-outline",
    },
  ]

  return (
    <ModuleScreen loading={loading} contentStyle={{ paddingTop: NATIVE.pagePadding, paddingBottom: 24 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View
          style={[
            styles.hero,
            {
              backgroundColor: hexToRgba(tokens.accent, 0.08),
              borderColor: hexToRgba(tokens.accent, 0.18),
            },
          ]}
        >
          <SolidListThumbTile
            thumb={CORA_INSIGHTS_HERO_THUMB}
            icon="analytics-outline"
            size="compact"
            style={styles.heroIconTile}
          />
          <Text style={[type.bodyEmphasis, styles.heroTitle]}>Cora tracks as you learn</Text>
          <Text style={[type.callout, { color: SN.secondaryLabel, lineHeight: 22 }]}>
            Use Solve for problems and Chat for concepts — Cora builds your mastery map, weekly activity, and
            learning signals automatically.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenSolve}
              style={({ pressed }) => [
                styles.heroBtn,
                { backgroundColor: tokens.accent, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="extension-puzzle-outline" size={18} color="#fff" />
              <Text style={[type.bodyEmphasis, { color: "#fff" }]}>Open Solve</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenChat}
              style={({ pressed }) => [
                styles.heroBtnOutline,
                {
                  borderColor: hexToRgba(tokens.accent, 0.35),
                  backgroundColor: pressed ? hexToRgba(tokens.accent, 0.06) : native.secondaryGrouped,
                },
              ]}
            >
              <Ionicons name="chatbubbles-outline" size={18} color={tokens.accent} />
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Open Chat</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <KpiTile
            id="questions"
            label="Questions"
            value={`${stats?.totalQuestions ?? trends.totalInteractions ?? 0}`}
          />
          <KpiTile id="streak" label="Streak" value={`${stats?.streakDays ?? 0}d`} />
          <KpiTile
            id="mastered"
            label="Mastered"
            value={`${stats?.topicsMastered ?? topics.filter((t) => normalizeMasteryPercent(t.mastery) >= 80).length}`}
          />
          <KpiTile id="reasoning" label="Reasoning" value={`${progress?.reasoningScore ?? 0}`} />
        </View>

        <DashboardCard title="Weekly activity" subtitle="Cora sessions by day">
          <WeeklyActivityChart weeklyPattern={trends.weeklyPattern} />
        </DashboardCard>

        <DashboardCard title="Topic mastery" subtitle="From Solve and Chat sessions">
          <TopicMasteryBars topics={topics} />
        </DashboardCard>

        <DashboardCard title="How you use Cora" subtitle="Chat concepts vs Solve-style debugging">
          <InteractionMixChart
            conceptQuestions={trends.conceptQuestions}
            debugQuestions={trends.debugQuestions}
          />
        </DashboardCard>

        {(behavior.curiosityIndex != null ||
          behavior.independenceScore != null ||
          behavior.avgQuestionDepth != null) && (
          <DashboardCard title="Learning signals" subtitle="Behavior patterns Cora detected">
            <View style={styles.signalGrid}>
              {behavior.curiosityIndex != null ? (
                <SignalPill label="Curiosity" value={`${Math.round(behavior.curiosityIndex)}%`} />
              ) : null}
              {behavior.independenceScore != null ? (
                <SignalPill label="Independence" value={`${Math.round(behavior.independenceScore)}%`} />
              ) : null}
              {behavior.avgQuestionDepth != null ? (
                <SignalPill label="Question depth" value={behavior.avgQuestionDepth.toFixed(1)} />
              ) : null}
              {behavior.struggleDetection != null ? (
                <SignalPill label="Struggle signals" value={`${Math.round(behavior.struggleDetection)}%`} />
              ) : null}
            </View>
          </DashboardCard>
        )}

        {(progress?.misconceptions?.length ?? 0) > 0 ? (
          <DashboardCard title="Watch areas" subtitle="Topics to revisit">
            <View style={styles.watchList}>
              {progress!.misconceptions.slice(0, 4).map((item) => (
                <View
                  key={item.name}
                  style={[styles.watchRow, { backgroundColor: native.fill, borderColor: native.separator }]}
                >
                  <View style={styles.watchText}>
                    <Text style={type.bodyEmphasis} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[type.caption, { color: SN.secondaryLabel }]} numberOfLines={1}>
                      {item.topic} · {item.occurrences} occurrence{item.occurrences === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, severityStyle(item.severity)]}>
                    <Text style={[type.caption, styles.severityText]}>{item.severity}</Text>
                  </View>
                </View>
              ))}
            </View>
          </DashboardCard>
        ) : null}

        {(progress?.conversationTimeline?.length ?? 0) > 0 ? (
          <DashboardCard title="Recent chats" subtitle="Latest Cora conversations">
            <View style={styles.timeline}>
              {progress!.conversationTimeline.slice(0, 5).map((item) => (
                <View key={item.id} style={[styles.timelineRow, { borderBottomColor: native.separator }]}>
                  <View style={styles.timelineTop}>
                    <Text style={[type.caption, { color: tokens.accent }]} numberOfLines={1}>
                      {item.topic}
                    </Text>
                    <Text style={[type.footnote, { color: SN.secondaryLabel }]}>
                      {formatShortDate(item.date)}
                    </Text>
                  </View>
                  <Text style={[type.callout, { color: SN.secondaryLabel }]} numberOfLines={2}>
                    {item.messagePreview}
                  </Text>
                </View>
              ))}
            </View>
          </DashboardCard>
        ) : null}

        {!hasInsights ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
            ]}
          >
            <Text style={[type.callout, { color: SN.secondaryLabel, textAlign: "center", lineHeight: 22 }]}>
              No insights yet — start with Solve or Chat and Cora will populate charts here.
            </Text>
          </View>
        ) : null}

        {topics.length > 0 ? (
          <View style={styles.topicSection}>
            <Text style={[type.footnote, styles.sectionLabel, { color: SN.secondaryLabel }]}>All topics</Text>
            <CoraNavCardList>
              {topics.slice(0, 8).map((item, index) => {
                const pct = normalizeMasteryPercent(item.mastery)
                const status = masteryStatusLabel(pct)
                return (
                  <CoraNavListCard
                    key={`${item.topic}-${index}`}
                    item={{
                      id: `topic-${index}`,
                      title: item.topic,
                      subtitle: `${pct}% mastery`,
                      meta: status,
                      icon: "analytics-outline",
                      kind: status === "Mastered" ? "completed" : status === "Learning" ? "in_progress" : "available",
                    }}
                    index={index}
                  />
                )
              })}
            </CoraNavCardList>
          </View>
        ) : null}

        <CoraNavCardList>
          {quickLinks.map((item, index) => (
            <CoraNavListCard
              key={item.id}
              item={item}
              index={index}
              onPress={() => {
                if (item.id === "grades") goToModule("/module/grades")
                else if (item.id === "study-plan") onOpenStudyPlan?.()
              }}
            />
          ))}
        </CoraNavCardList>
      </ScrollView>
    </ModuleScreen>
  )
}

function SignalPill({ label, value }: { label: string; value: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  const cardLayout = useKpiGridCardStyle("46%")
  return (
    <View style={[styles.signalPill, cardLayout, { backgroundColor: native.fill }]}>
      <Text style={[type.footnote, { color: native.secondaryLabel }]}>{label}</Text>
      <Text style={[type.bodyEmphasis, { fontVariant: ["tabular-nums"] }]}>{value}</Text>
    </View>
  )
}

function severityStyle(severity: string) {
  if (severity === "severe") return { backgroundColor: hexToRgba("#ef4444", 0.12) }
  if (severity === "moderate") return { backgroundColor: hexToRgba("#f59e0b", 0.12) }
  return { backgroundColor: hexToRgba("#3b82f6", 0.12) }
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 8 },
  hero: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  heroIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  heroTitle: {},
  heroActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  heroBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiTile: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
    overflow: "hidden",
  },
  kpiIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  signalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  signalPill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  watchList: { gap: 8 },
  watchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  watchText: { flex: 1, minWidth: 0 },
  severityBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  severityText: { textTransform: "capitalize" },
  timeline: { gap: 0 },
  timelineRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  timelineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  topicSection: { gap: 8 },
  sectionLabel: {
    textTransform: "none",
    marginLeft: 4,
  },
})
