import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import Svg, { Circle, G } from "react-native-svg"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { ApiError, formatStudentModuleError } from "../../lib/student-api"
import { practiceApi, type PracticeAccess, type PracticeConfigResponse, type TopicProgress } from "../../lib/practice-api"
import {
  isPracticeTopicLocked,
  practiceTopicUnlockedCount,
  resolvePracticeSessionQuestionCount,
} from "../../lib/practice-session-count"
import { setActivePracticeSession } from "../../lib/practice-session"
import type { StudentSession } from "../../lib/session"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleSection, ModuleSectionHeader } from "../modules/ModuleScreen"

type Difficulty = "easy" | "medium" | "hard" | "mixed"

const DIFFICULTIES: { id: Difficulty; label: string; tone: "success" | "warning" | "danger" | "accent" }[] = [
  { id: "easy", label: "Easy", tone: "success" },
  { id: "medium", label: "Medium", tone: "warning" },
  { id: "hard", label: "Hard", tone: "danger" },
  { id: "mixed", label: "Mixed", tone: "accent" },
]

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function topicProgressPct(topic: TopicProgress): number {
  const total = practiceTopicUnlockedCount(topic)
  if (total <= 0) return 0
  return Math.min(100, Math.round((topic.completed / total) * 100))
}

const CARD_RING = 112
const CARD_RING_R = 44
const CARD_RING_STROKE = 7
const CARD_RING_CIRC = 2 * Math.PI * CARD_RING_R

function cardArcColor(pct: number, tokens: ReturnType<typeof useAppThemeTokens>): string {
  if (pct >= 70) return tokens.success
  if (pct > 0) return tokens.accent
  return tokens.accent
}

function SummaryStatRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  valueColor?: string
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <View style={summaryStyles.statRow}>
      <View style={summaryStyles.statLabelWrap}>
        <Ionicons name={icon} size={15} color={SN.accent} />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>{label}</Text>
      </View>
      <Text style={[type.bodyEmphasis, { color: valueColor ?? native.label }]}>{value}</Text>
    </View>
  )
}

function PracticeSummaryCard({
  pct,
  topic,
  unlockedCount,
  newCount,
  lockedInTopic,
  sessionQuestionCount,
}: {
  pct: number
  topic: TopicProgress
  unlockedCount: number
  newCount: number
  lockedInTopic: number
  sessionQuestionCount: number
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const arcColor = cardArcColor(pct, tokens)
  const progressLength = (pct / 100) * CARD_RING_CIRC
  const accuracy = topic.accuracy ?? 0
  const accuracyColor = accuracy >= 80 ? tokens.success : accuracy >= 50 ? tokens.warning : tokens.danger

  return (
    <View style={[summaryStyles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
      <View style={summaryStyles.ringWrap}>
        <Svg width={CARD_RING} height={CARD_RING} viewBox={`0 0 ${CARD_RING} ${CARD_RING}`}>
          <Circle cx={CARD_RING / 2} cy={CARD_RING / 2} r={34} fill={hexToRgba(SN.accent, 0.06)} />
          <G transform={`rotate(-90 ${CARD_RING / 2} ${CARD_RING / 2})`}>
            <Circle
              cx={CARD_RING / 2}
              cy={CARD_RING / 2}
              r={CARD_RING_R}
              stroke={native.fill}
              strokeWidth={CARD_RING_STROKE}
              fill="none"
            />
            <Circle
              cx={CARD_RING / 2}
              cy={CARD_RING / 2}
              r={CARD_RING_R}
              stroke={arcColor}
              strokeWidth={CARD_RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${progressLength} ${CARD_RING_CIRC}`}
              fill="none"
            />
          </G>
        </Svg>
        <View style={summaryStyles.ringCenter}>
          <Text style={[summaryStyles.ringPct, { color: arcColor }]}>{pct}%</Text>
          <Text style={[summaryStyles.ringComplete, { color: native.secondaryLabel }]}>Complete</Text>
        </View>
      </View>

      <View style={summaryStyles.statRows}>
        <SummaryStatRow
          icon="stats-chart-outline"
          label="Progress"
          value={`${topic.completed}/${unlockedCount}${lockedInTopic > 0 ? ` · ${lockedInTopic} locked` : ""}`}
          valueColor={SN.accent}
        />
        <SummaryStatRow icon="sparkles-outline" label="New questions" value={String(newCount)} />
        <SummaryStatRow
          icon="checkmark-circle-outline"
          label="Accuracy"
          value={`${accuracy}%`}
          valueColor={accuracyColor}
        />
        <SummaryStatRow
          icon="layers-outline"
          label="Session size"
          value={`${sessionQuestionCount} unlocked${lockedInTopic > 0 ? ` · ${topic.questionCount} total` : ""}`}
        />
        {lockedInTopic > 0 ? (
          <SummaryStatRow
            icon="lock-closed-outline"
            label="Trailblazer unlocks"
            value={`${lockedInTopic} more`}
            valueColor={tokens.warning}
          />
        ) : null}
        {topic.lastPracticed ? (
          <SummaryStatRow
            icon="time-outline"
            label="Last practiced"
            value={new Date(topic.lastPracticed).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          />
        ) : null}
      </View>
    </View>
  )
}

const summaryStyles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 20,
    marginTop: 4,
  },
  ringWrap: {
    alignSelf: "center",
    width: CARD_RING,
    height: CARD_RING,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  ringPct: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  ringComplete: { fontSize: 13, fontWeight: "500" },
  statRows: { gap: 12 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 5,
  },
  statLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
})

export function PracticeTopicScreen() {
  const session = useStudentSession()
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const router = useRouter()
  const { topic: topicParam } = useLocalSearchParams<{ topic?: string }>()
  const topicName = typeof topicParam === "string" ? decodeURIComponent(topicParam) : ""
  const scrollPad = useModuleScrollContentPadding(24)
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [topic, setTopic] = useState<TopicProgress | null>(null)
  const [practiceAccess, setPracticeAccess] = useState<PracticeAccess | null>(null)
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfigResponse | null>(null)
  const [sessionQuestionCount, setSessionQuestionCount] = useState(10)
  const [courseId, setCourseId] = useState<number | undefined>()
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed")

  const difficultyColors = useMemo(
    () => ({
      success: tokens.success,
      warning: tokens.warning,
      danger: tokens.danger,
      accent: tokens.accent,
    }),
    [tokens],
  )

  const load = useCallback(async () => {
    if (!session || !topicName) return
    try {
      const [progress, config] = await Promise.all([
        practiceApi.getTopicsProgress(session),
        practiceApi.getConfig(session),
      ])
      setCourseId(progress.courseId ?? session.courseId)
      setPracticeAccess(progress.access ?? config.access ?? null)
      setPracticeConfig(config)
      const match = progress.topics?.find((t) => t.name === topicName) ?? null
      setLoadError(null)
      setTopic(match)
      if (match && membershipTierLoaded) {
        setSessionQuestionCount(resolvePracticeSessionQuestionCount(membershipTier, match, config))
      } else {
        setSessionQuestionCount(config.numQuestions ?? 10)
      }
    } catch (err) {
      setTopic(null)
      setLoadError(formatStudentModuleError(err, "Failed to load this topic."))
    }
  }, [session, topicName, membershipTier, membershipTierLoaded])

  useEffect(() => {
    if (!topic || !practiceConfig || !membershipTierLoaded) return
    setSessionQuestionCount(resolvePracticeSessionQuestionCount(membershipTier, topic, practiceConfig))
  }, [topic, practiceConfig, membershipTier, membershipTierLoaded])

  useEffect(() => {
    if (!session || !topicName) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, topicName, load])

  const canStartPractice = practiceAccess?.canStartPractice !== false
  const topicLocked = topic ? isPracticeTopicLocked(topic, canStartPractice) : true
  const unlockedCount = topic ? practiceTopicUnlockedCount(topic) : 0

  const startPractice = async () => {
    if (!session || !topic || topicLocked) {
      AppAlert.alert(
        "Practice locked",
        practiceAccess?.level === "none"
          ? "Upgrade to Explorer to start practicing."
          : "Upgrade to Trailblazer for full topic access.",
        [
          { text: "Not now", style: "cancel" },
          { text: "View plans", onPress: () => router.push("/membership" as never) },
        ],
      )
      return
    }

    if (sessionQuestionCount <= 0) {
      AppAlert.alert(
        "No questions available",
        "You've completed all unlocked questions in this topic. Upgrade to Trailblazer for the full bank.",
        [
          { text: "Not now", style: "cancel" },
          { text: "View plans", onPress: () => router.push("/membership" as never) },
        ],
      )
      return
    }

    if (topic.completed >= unlockedCount && unlockedCount > 0) {
      AppAlert.alert(
        "No new questions",
        `You've practiced all ${unlockedCount} unlocked questions in this topic. Upgrade to Trailblazer for the rest.`,
      )
      return
    }

    setGenerating(true)
    try {
      const fullTopic =
        membershipTier === "Explorer" ||
        membershipTier === "Trailblazer" ||
        practiceConfig?.limits?.fullTopicAccess === true ||
        (practiceConfig?.access?.level === "partial")

      const data = await practiceApi.generate(session, {
        topics: [topic.name],
        count: sessionQuestionCount,
        difficulty: difficulty === "mixed" ? undefined : difficulty,
        courseId,
        fullTopic,
      })

      if (!data.questions?.length) {
        AppAlert.alert("No questions available", "This topic has no practice questions right now.")
        return
      }

      if (fullTopic && data.questions.length < sessionQuestionCount) {
        AppAlert.alert(
          "Partial practice session",
          `Loaded ${data.questions.length} of ${sessionQuestionCount} questions for this topic.`,
        )
      }

      await setActivePracticeSession({
        attemptId: data.attemptId,
        questions: data.questions,
        topic: topic.name,
        difficulty,
      })

      router.push({ pathname: "/practice/quiz" } as never)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        AppAlert.alert(
          "Practice locked",
          err.message,
          [
            { text: "Not now", style: "cancel" },
            { text: "View plans", onPress: () => router.push("/membership" as never) },
          ],
        )
        return
      }
      AppAlert.alert(
        "Could not start practice",
        err instanceof ApiError ? err.message : "Please try again.",
      )
    } finally {
      setGenerating(false)
    }
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground, paddingBottom: insets.bottom }]}>
        <Text style={type.caption}>Student session required.</Text>
      </View>
    )
  }

  if (!topicName) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Practice" fallbackHref="/module/practice" />
        <View style={styles.center}>
          <Text style={type.caption}>Topic not found.</Text>
        </View>
      </View>
    )
  }

  const pct = topic ? topicProgressPct(topic) : 0
  const newCount = topic ? Math.max(0, unlockedCount - topic.completed) : 0
  const lockedInTopic = topic ? Math.max(0, topic.questionCount - unlockedCount) : 0

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Practice Summary" fallbackHref="/module/practice" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      ) : !topic ? (
        <View style={styles.center}>
          <Text style={[type.caption, { color: SN.secondaryLabel, textAlign: "center", paddingHorizontal: 24 }]}>
            {loadError ?? "This topic is no longer available."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, scrollPad]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <Text style={[type.bodyEmphasis, { color: native.label }]}>{topic.name}</Text>
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
            {topicLocked
              ? "Upgrade to Explorer to practice this topic."
              : lockedInTopic > 0
                ? `${unlockedCount} of ${topic.questionCount} questions unlocked on your plan.`
                : "Ready to practice — choose difficulty, then start your session."}
          </Text>

          {topicLocked ? (
            <View style={[styles.lockedBanner, { backgroundColor: `${tokens.warning}18`, borderColor: `${tokens.warning}44` }]}>
              <Ionicons name="lock-closed-outline" size={22} color={tokens.warning} />
              <View style={styles.lockedCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Practice locked</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  Explorer unlocks half of each topic. Trailblazer unlocks the full bank.
                </Text>
              </View>
              <Pressable
                style={[styles.upgradeChip, { backgroundColor: SN.accent }]}
                onPress={() => router.push("/membership" as never)}
              >
                <Text style={styles.upgradeChipText}>View plans</Text>
              </Pressable>
            </View>
          ) : null}

          <PracticeSummaryCard
            pct={pct}
            topic={topic}
            unlockedCount={unlockedCount}
            newCount={newCount}
            lockedInTopic={lockedInTopic}
            sessionQuestionCount={sessionQuestionCount}
          />

          <ModuleSectionHeader title="Difficulty" />
          {!topicLocked ? (
            <>
              <ModuleSection>
                <View style={styles.difficultyRow}>
                  {DIFFICULTIES.map((d) => (
                    <Pressable
                      key={d.id}
                      style={[
                        styles.difficultyPill,
                        { backgroundColor: difficulty === d.id ? difficultyColors[d.tone] : native.fill },
                      ]}
                      onPress={() => setDifficulty(d.id)}
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          { color: difficulty === d.id ? "#ffffff" : native.secondaryLabel },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ModuleSection>

              <Pressable
                style={[
                  styles.startBtn,
                  { backgroundColor: SN.accent },
                  (generating || sessionQuestionCount <= 0) && styles.startBtnDisabled,
                ]}
                onPress={() => void startPractice()}
                disabled={generating || sessionQuestionCount <= 0}
              >
                {generating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={18} color="#ffffff" />
                    <Text style={styles.startBtnText}>Start Practice</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.startBtn, { backgroundColor: SN.accent }]}
              onPress={() => router.push("/membership" as never)}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#ffffff" />
              <Text style={styles.startBtnText}>Upgrade to practice</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: NATIVE.pagePadding, gap: 12 },
  difficultyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  difficultyPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  difficultyText: { fontSize: 13, fontWeight: "600" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 16,
    marginTop: 8,
  },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  lockedCopy: { flex: 1, gap: 4 },
  upgradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  upgradeChipText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
})
