import { StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { ModuleListRow, ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { CommSectionFooter } from "../faculty/faculty-communication-ui"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  CORA_HEADER_TAGLINE,
  CORA_SUBTITLE,
  CORA_TAGLINE,
} from "../../lib/cora-constants"
import { CoraBrand } from "../cora/CoraBrand"
import { CORA_HOME_QUICK_ACTIONS, CORA_TOOLS, type CoraSectionId } from "../../lib/cora-nav-config"
import {
  CORA_HOME_ACTIVITY_THUMBS,
  CORA_HOME_CHALLENGE_THUMBS,
  CORA_HOME_CREDITS_THUMB,
  CORA_HOME_EXPLORE_THUMBS,
  coraHomeQuickActionThumb,
} from "../../lib/cora-home-theme"
import { solidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import type { AiTutorRecommendation, AiTutorStats } from "../../lib/ai-tutor-api"
import type { StudentSession } from "../../lib/session"
import { hasNavAccess } from "../../constants/student-nav"
import type { MembershipTier } from "../../types/dashboard"

type HomeActionIcon = keyof typeof Ionicons.glyphMap

const QUICK_ACTION_ICONS: Record<string, HomeActionIcon> = {
  "explain-problem": "help-circle-outline",
  "walk-circuit": "git-network-outline",
  "help-code": "code-slash-outline",
  "prepare-exam": "flag-outline",
  "review-homework": "search-outline",
  "generate-flashcards": "layers-outline",
  "summarize-lecture": "document-text-outline",
  "create-study-plan": "calendar-outline",
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function OverviewStatRow({
  title,
  value,
  icon,
  thumb,
  last,
}: {
  title: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
  thumb: SolidListThumb
  last?: boolean
}) {
  const type = useNativeType()
  const native = useThemedNative()
  return (
    <View style={[styles.statRow, !last && [styles.statRowBorder, { borderBottomColor: native.separator }]]}>
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact" style={styles.statIconTile} />
      <Text style={[type.callout, styles.statLabel]}>{title}</Text>
      <Text style={[type.callout, styles.statValue]}>{value}</Text>
    </View>
  )
}

export function CoraHomeTab({
  session,
  stats,
  creditsLabel,
  recommendations,
  loading,
  refreshing,
  onRefresh,
  onNavigateSection,
  onOpenWorkspacePrompt,
  membershipTier,
}: {
  session: StudentSession
  stats: AiTutorStats | null
  creditsLabel: string
  recommendations: AiTutorRecommendation[]
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
  onNavigateSection: (section: CoraSectionId) => void
  onOpenWorkspacePrompt: (prompt: string) => void
  membershipTier: MembershipTier
}) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const firstName = session.name.split(" ")[0] ?? "there"
  const hasCodebench = hasNavAccess(membershipTier, "Trailblazer")

  const onQuickAction = (actionId: string, section: CoraSectionId, toolId?: string) => {
    if (toolId) {
      const tool = CORA_TOOLS.find((t) => t.id === toolId)
      if (tool?.workspacePrompt) {
        onOpenWorkspacePrompt(tool.workspacePrompt)
        return
      }
      if (tool?.route) {
        router.push(tool.route as never)
        return
      }
    }
    if (section === "code" && !hasCodebench) {
      router.push("/membership" as never)
      return
    }
    onNavigateSection(section)
  }

  return (
    <ModuleScreen
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentStyle={{ paddingTop: NATIVE.pagePadding }}
    >
      <View style={[styles.moduleHeader, { borderBottomColor: native.separator }]}>
        <Text style={[type.caption, styles.moduleTagline, { color: SN.secondaryLabel }]}>
          {CORA_HEADER_TAGLINE}
        </Text>
      </View>

      <LinearGradient
        colors={tokens.hero.gradientSoft}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.hero,
          {
            borderColor: native.separator,
          },
        ]}
      >
        <View style={[styles.heroAccent, { backgroundColor: tokens.hero.bubbleA }]} />
        <View style={[styles.heroAccentB, { backgroundColor: tokens.hero.bubbleB }]} />
        <CoraBrand size="lg" style={styles.heroBrand} />
        <Text style={[type.caption, styles.heroEyebrow, { color: SN.secondaryLabel }]}>
          {greeting()}, {firstName}
        </Text>
        <Text style={[type.sheetTitle, styles.heroTitle]}>What would you like to accomplish today?</Text>
        <Text style={[type.caption, styles.heroBody, { color: SN.secondaryLabel }]}>
          {CORA_SUBTITLE.toLowerCase()}
        </Text>
        <View style={[styles.heroTag, { backgroundColor: SN.accentSoft, borderColor: tokens.hero.pillBorder }]}>
          <Text style={[type.caption, { color: tokens.hero.codeText, fontWeight: "600" }]}>{CORA_TAGLINE}</Text>
        </View>
      </LinearGradient>

      <ModuleSection title="Quick Actions">
        {CORA_HOME_QUICK_ACTIONS.map((action, index) => (
          <ModuleListRow
            key={action.id}
            title={action.title}
            subtitle={action.description}
            icon={QUICK_ACTION_ICONS[action.id] ?? "sparkles-outline"}
            solidThumb={coraHomeQuickActionThumb(action.id, index)}
            last={index === CORA_HOME_QUICK_ACTIONS.length - 1}
            onPress={() => onQuickAction(action.id, action.section, action.toolId)}
          />
        ))}
      </ModuleSection>

      <ModuleSection title="Credits">
        <View style={styles.creditsPanel}>
          <SolidListThumbTile
            thumb={CORA_HOME_CREDITS_THUMB}
            icon="sparkles-outline"
            size="compact"
            style={styles.creditsIconTile}
          />
          <View style={styles.creditsCopy}>
            <Text style={[type.bodyEmphasis, styles.creditsValue]}>{creditsLabel}</Text>
            <Text style={[type.caption, styles.creditsSubtitle, { color: SN.secondaryLabel }]}>
              Weekly message allowance
            </Text>
          </View>
        </View>
      </ModuleSection>

      <ModuleSection title="Your Activity">
        <OverviewStatRow
          title="Questions asked"
          value={String(stats?.totalQuestions ?? 0)}
          icon="help-circle-outline"
          thumb={CORA_HOME_ACTIVITY_THUMBS.questions}
        />
        <OverviewStatRow
          title="Day streak"
          value={`${stats?.streakDays ?? 0} days`}
          icon="flame-outline"
          thumb={CORA_HOME_ACTIVITY_THUMBS.streak}
        />
        <OverviewStatRow
          title="Topics mastered"
          value={String(stats?.topicsMastered ?? 0)}
          icon="ribbon-outline"
          thumb={CORA_HOME_ACTIVITY_THUMBS.mastered}
        />
        <OverviewStatRow
          title="Weekly progress"
          value={`${stats?.weeklyProgress ?? 0}%`}
          icon="trending-up-outline"
          thumb={CORA_HOME_ACTIVITY_THUMBS.progress}
          last
        />
      </ModuleSection>

      <ModuleSection title="Today's Recommendations">
        {recommendations.length === 0 ? (
          <View style={styles.recEmpty}>
            <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
              Start with <Text style={type.bodyEmphasis}>Solve</Text> or open a lecture in{" "}
              <Text style={type.bodyEmphasis}>Learn</Text> — your copilot will personalize recommendations as you go.
            </Text>
          </View>
        ) : (
          recommendations.map((rec, index) => (
            <ModuleListRow
              key={rec.id}
              title={rec.title}
              subtitle={rec.description}
              icon="sparkles-outline"
              solidThumb={solidListThumb(index + 2)}
              last={index === recommendations.length - 1}
              onPress={() => {
                if (rec.link.startsWith("/")) router.push(rec.link as never)
                else onNavigateSection("workspace")
              }}
            />
          ))
        )}
      </ModuleSection>

      <ModuleSection title="Daily Challenge">
        <ModuleListRow
          title="Practice Hub guided mode"
          subtitle="Solve one problem in Practice Hub with guided mode"
          icon="fitness-outline"
          solidThumb={CORA_HOME_CHALLENGE_THUMBS.practice}
          onPress={() => router.push("/module/practice" as never)}
        />
        <ModuleListRow
          title="Start with Solve"
          subtitle="Paste a homework or quiz question for step-by-step help"
          icon="extension-puzzle-outline"
          solidThumb={CORA_HOME_CHALLENGE_THUMBS.solve}
          last
          onPress={() => onNavigateSection("solve")}
        />
      </ModuleSection>

      <ModuleSection title="Explore Cora">
        <ModuleListRow
          title="Learn"
          subtitle="Lecture summaries, flashcards, and quizzes"
          icon="book-outline"
          solidThumb={CORA_HOME_EXPLORE_THUMBS.learn}
          onPress={() => onNavigateSection("learn")}
        />
        <ModuleListRow
          title="Code"
          subtitle="CodeBench programming workspace"
          icon="code-slash-outline"
          solidThumb={CORA_HOME_EXPLORE_THUMBS.code}
          onPress={() => onNavigateSection("code")}
        />
        <ModuleListRow
          title="Insights"
          subtitle="Topic mastery and activity stats"
          icon="bar-chart-outline"
          solidThumb={CORA_HOME_EXPLORE_THUMBS.insights}
          onPress={() => onNavigateSection("insights")}
        />
        <ModuleListRow
          title="Study Plan"
          subtitle="Daily focus and exam countdown"
          icon="flag-outline"
          solidThumb={CORA_HOME_EXPLORE_THUMBS.studyPlan}
          last
          onPress={() => onNavigateSection("study-plan")}
        />
      </ModuleSection>

      <CommSectionFooter>
        Study plan syncs with your calendar on the web dashboard. Your copilot remembers context so you never repeat
        yourself.
      </CommSectionFooter>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  moduleHeader: {
    gap: 4,
    paddingBottom: 14,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  moduleTagline: {
    fontSize: 12,
    lineHeight: 16,
  },
  hero: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 4,
    overflow: "hidden",
    gap: 6,
  },
  heroAccent: {
    position: "absolute",
    right: -24,
    top: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroAccentB: {
    position: "absolute",
    left: -18,
    bottom: -20,
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  heroEyebrow: {
    fontSize: 14,
  },
  heroBrand: {
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  heroBody: {
    lineHeight: 20,
    maxWidth: 320,
  },
  heroTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  creditsPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  creditsIconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  creditsCopy: {
    flex: 1,
    gap: 2,
  },
  creditsValue: {
    fontSize: 16,
  },
  creditsSubtitle: {
    lineHeight: 18,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statIconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  statLabel: {
    flex: 1,
  },
  statValue: {
    fontWeight: "600",
  },
  recEmpty: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
})
