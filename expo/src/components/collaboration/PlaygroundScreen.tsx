import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useModulePageLayout } from "../../lib/responsive-layout"
import {
  collaborationApi,
  type PlaygroundCredits,
  type PlaygroundPersonalStats,
} from "../../lib/collaboration-api"
import {
  PLAYGROUND_LEADERBOARD_THUMB,
  playgroundGameStatusAccent,
  playgroundGameStatusIcon,
  playgroundGameStatusLabel,
  playgroundListThumb,
} from "../../lib/playground-list-theme"
import { playgroundJoinColors } from "../../lib/playground-theme"
import { getLastPlaygroundClassroomSession } from "../../lib/playground-session-lock"
import {
  isPlaygroundOutOfCredits,
  PLAYGROUND_OUT_OF_CREDITS_MESSAGE,
} from "../../lib/playground-credits"
import { CollabSectionTitle } from "./collab-shared"
import { SignatureListCard } from "../theme/SignatureListCard"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { signatureListStyles } from "../theme/TabbedModuleLayout"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function RecentGameCard({
  game,
  index,
}: {
  game: PlaygroundPersonalStats["recentGames"][number]
  index: number
}) {
  const thumb = playgroundListThumb(index)
  const statusLabel = playgroundGameStatusLabel(game.completedAt)

  return (
    <SignatureListCard
      index={index}
      title={`${game.questionsAnswered} questions · ${game.correctAnswers} correct`}
      meta={game.completedAt ? "Completed session" : "Personal practice"}
      metaIcon="game-controller-outline"
      statusLabel={statusLabel}
      statusColor={playgroundGameStatusAccent(game.completedAt, thumb)}
      statusIcon={playgroundGameStatusIcon(game.completedAt)}
      trailingValue={`${game.score} pts`}
      trailingValueColor={thumb.label}
      icon="trophy-outline"
      accent={thumb.label}
      showChevron={false}
    />
  )
}

export function PlaygroundScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const page = useModulePageLayout()
  const joinColors = playgroundJoinColors(tokens)
  const [credits, setCredits] = useState<PlaygroundCredits | null>(null)
  const [personal, setPersonal] = useState<PlaygroundPersonalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [creditRes, personalRes] = await Promise.all([
        collaborationApi.getPlaygroundCredits(session),
        collaborationApi.getPlaygroundPersonal(session),
      ])
      setCredits(creditRes)
      setPersonal(personalRes)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load playground.")
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const outOfCredits = isPlaygroundOutOfCredits(credits)

  const promptUpgradeOrWait = () => {
    AppAlert.alert("No playground credits", PLAYGROUND_OUT_OF_CREDITS_MESSAGE, [
      { text: "Not now", style: "cancel" },
      { text: "View plans", onPress: () => router.push("/membership" as never) },
    ])
  }

  const openJoin = (mode: "classroom" | "personal") => {
    if (outOfCredits) {
      promptUpgradeOrWait()
      return
    }
    router.push(`/collaboration/playground/join?mode=${mode}` as never)
  }

  const openLeaderboard = useCallback(async () => {
    const lastSession = await getLastPlaygroundClassroomSession()
    if (lastSession) {
      router.push(`/collaboration/playground/leaderboard?sessionId=${lastSession}` as never)
      return
    }
    router.push("/collaboration/playground/leaderboard" as never)
  }, [router])

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={onRefresh} error={error}>
      <View style={[styles.page, { gap: page.stackGap + 4 }]}>
      {credits ? (
        <View style={[styles.statsRow, { gap: page.cardGap, flexDirection: page.stackStats ? "column" : "row" }]}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: native.secondaryGrouped,
                borderColor: tokens.border,
                padding: page.cardPadding,
              },
            ]}
          >
            <Ionicons name="flash-outline" size={18} color={joinColors.primary} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Credits</Text>
            <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1} adjustsFontSizeToFit>
              {credits.isUnlimited || credits.creditsLimit === "unlimited"
                ? "Unlimited"
                : `${credits.credits ?? 0}${typeof credits.creditsLimit === "number" ? ` / ${credits.creditsLimit}` : ""}`}
            </Text>
          </View>
          {personal ? (
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: native.secondaryGrouped,
                  borderColor: tokens.border,
                  padding: page.cardPadding,
                },
              ]}
            >
              <Ionicons name="trophy-outline" size={18} color={PLAYGROUND_LEADERBOARD_THUMB.fill} />
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Best score</Text>
              <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                {personal.bestScore} pts
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.joinCard,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: tokens.border,
            padding: page.cardPadding,
            gap: page.cardGap,
          },
        ]}
      >
        <View style={styles.joinHeader}>
          <Text style={[type.sectionHeader, { color: native.secondaryLabel }]}>Join the game</Text>
          <Text style={[type.caption, styles.joinHint, { color: native.secondaryLabel }]}>
            Confirm your details before entering a session
          </Text>
        </View>
        <Text style={[type.caption, styles.joinBody, { color: native.secondaryLabel }]}>
          {outOfCredits
            ? PLAYGROUND_OUT_OF_CREDITS_MESSAGE
            : "Review your name, student ID, and optional nickname — then join a live class session or pick a solo practice set."}
        </Text>
        <View
          style={[
            styles.joinActions,
            {
              flexDirection: page.joinActionsHorizontal ? "row" : "column",
              gap: page.cardGap,
            },
          ]}
        >
          <Pressable
            style={[
              styles.joinPrimary,
              page.joinActionsHorizontal ? styles.joinActionFlex : null,
              { backgroundColor: joinColors.primary, opacity: outOfCredits ? 0.45 : 1 },
            ]}
            onPress={() => openJoin("classroom")}
          >
            <Ionicons name="people-outline" size={18} color={joinColors.primaryInk} />
            <Text style={styles.joinPrimaryText} numberOfLines={1} adjustsFontSizeToFit>
              {outOfCredits ? "No credits left" : "Join live session"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.joinSecondary,
              page.joinActionsHorizontal ? styles.joinActionFlex : null,
              {
                backgroundColor: joinColors.secondaryFill,
                borderColor: joinColors.secondaryBorder,
                opacity: outOfCredits ? 0.45 : 1,
              },
            ]}
            onPress={() => openJoin("personal")}
          >
            <Ionicons name="person-outline" size={18} color={joinColors.secondaryInk} />
            <Text
              style={[styles.joinSecondaryText, { color: joinColors.secondaryInk }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {outOfCredits ? "No credits left" : "Solo practice"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[
          styles.modeCard,
          tokens.cardShadow,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: tokens.border,
            padding: page.cardPadding,
          },
        ]}
        onPress={() => void openLeaderboard()}
      >
        <SolidListThumbTile thumb={PLAYGROUND_LEADERBOARD_THUMB} icon="podium-outline" />
        <View style={styles.modeCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
            Leaderboard
          </Text>
          <Text style={[type.caption, styles.modeSub, { color: native.secondaryLabel }]} numberOfLines={2}>
            Live session rankings
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      </Pressable>

      <View style={[styles.recentBlock, { gap: page.cardGap }]}>
        <CollabSectionTitle title="Recent games" hint="Your last personal sessions" />

        {personal?.recentGames && personal.recentGames.length > 0 ? (
          <View style={signatureListStyles.list}>
            {personal.recentGames.map((game, index) => (
              <RecentGameCard key={index} game={game} index={index} />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: native.secondaryGrouped,
                borderColor: tokens.border,
                paddingHorizontal: page.cardPadding,
                paddingTop: page.cardPadding,
                paddingBottom: page.cardPadding + 14,
                gap: page.cardGap,
              },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: native.fill }]}>
              <Ionicons name="game-controller-outline" size={22} color={native.tertiaryLabel} />
            </View>
            <Text style={[type.bodyEmphasis, styles.emptyTitle, { color: native.label }]}>No games yet</Text>
            <Text style={[type.caption, styles.emptyBody, { color: native.secondaryLabel }]}>
              Join a classroom session or start solo practice to build your streak.
            </Text>
            <Pressable
              style={[styles.emptyAction, { backgroundColor: joinColors.primary }]}
              onPress={() => openJoin("personal")}
            >
              <Text style={styles.emptyActionText}>Start solo practice</Text>
            </Pressable>
          </View>
        )}
      </View>
      </View>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  page: { width: "100%", alignSelf: "stretch" },
  statsRow: { width: "100%" },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    minHeight: 92,
    justifyContent: "center",
  },
  joinCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  joinHeader: { gap: 4 },
  joinHint: { lineHeight: 18, fontWeight: "500" },
  joinBody: { lineHeight: 20, fontWeight: "500" },
  joinActions: { width: "100%" },
  joinActionFlex: { flex: 1, minWidth: 0 },
  joinPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: NATIVE.buttonMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  joinPrimaryText: { color: "#ffffff", fontWeight: "600", fontSize: 14, flexShrink: 1 },
  joinSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: NATIVE.buttonMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  joinSecondaryText: { fontWeight: "600", fontSize: 14, flexShrink: 1 },
  modeCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    minHeight: 88,
  },
  modeCopy: { flex: 1, gap: 3, minWidth: 0 },
  modeSub: { fontWeight: "600" },
  recentBlock: { width: "100%" },
  emptyCard: {
    width: "100%",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyTitle: { textAlign: "center" },
  emptyBody: { textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  emptyAction: {
    alignSelf: "stretch",
    minHeight: NATIVE.buttonMinHeight,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: NATIVE.buttonRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActionText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
})
