import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  type PlaygroundCredits,
  type PlaygroundPersonalStats} from "../../lib/collaboration-api"
import {
  PLAYGROUND_LEADERBOARD_THUMB,
  playgroundGameStatusAccent,
  playgroundGameStatusIcon,
  playgroundGameStatusLabel,
  playgroundListThumb,
} from "../../lib/playground-list-theme"
import { playgroundJoinColors } from "../../lib/playground-theme"
import { getLastPlaygroundClassroomSession } from "../../lib/playground-session-lock"
import { CollabEmpty, CollabSectionTitle } from "./collab-shared"
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

  const openJoin = (mode: "classroom" | "personal") => {
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

      {credits ? (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
            <Ionicons name="flash-outline" size={18} color={joinColors.primary} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Credits</Text>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>
              {credits.isUnlimited || credits.creditsLimit === "unlimited"
                ? "Unlimited"
                : `${credits.credits ?? 0}${typeof credits.creditsLimit === "number" ? ` / ${credits.creditsLimit}` : ""}`}
            </Text>
          </View>
          {personal ? (
            <View style={[styles.statCard, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
              <Ionicons name="trophy-outline" size={18} color={PLAYGROUND_LEADERBOARD_THUMB.fill} />
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Best score</Text>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>{personal.bestScore} pts</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.joinCard, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
        <CollabSectionTitle
          title="Join the game"
          hint="Confirm your details before entering a session"
        />
        <Text style={[type.caption, styles.joinBody, { color: native.secondaryLabel }]}>
          Review your name, student ID, and optional nickname — then join a live class session or
          pick a solo practice set.
        </Text>
        <View style={styles.joinActions}>
          <Pressable
            style={[styles.joinPrimary, { backgroundColor: joinColors.primary }]}
            onPress={() => openJoin("classroom")}
          >
            <Ionicons name="people-outline" size={18} color={joinColors.primaryInk} />
            <Text style={styles.joinPrimaryText}>Join live session</Text>
          </Pressable>
          <Pressable
            style={[
              styles.joinSecondary,
              {
                backgroundColor: joinColors.secondaryFill,
                borderColor: joinColors.secondaryBorder,
              },
            ]}
            onPress={() => openJoin("personal")}
          >
            <Ionicons name="person-outline" size={18} color={joinColors.secondaryInk} />
            <Text style={[styles.joinSecondaryText, { color: joinColors.secondaryInk }]}>Solo practice</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeCard, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}
          onPress={() => void openLeaderboard()}
        >
          <SolidListThumbTile thumb={PLAYGROUND_LEADERBOARD_THUMB} icon="podium-outline" />
          <View style={styles.modeCopy}>
            <Text style={[type.bodyEmphasis, styles.modeTitle, { color: native.label }]}>Leaderboard</Text>
            <Text style={[type.caption, styles.modeSub, { color: native.secondaryLabel }]}>
              Live session rankings
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </Pressable>
      </View>

      <CollabSectionTitle title="Recent games" hint="Your last personal sessions" />

      {personal?.recentGames && personal.recentGames.length > 0 ? (
        <View style={signatureListStyles.list}>
          {personal.recentGames.map((game, index) => (
            <RecentGameCard key={index} game={game} index={index} />
          ))}
        </View>
      ) : (
        <CollabEmpty
          icon="game-controller-outline"
          title="No games yet"
          body="Join a classroom session or start solo practice to build your streak."
          actionLabel="Start solo practice"
          onAction={() => openJoin("personal")}
        />
      )}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minHeight: 88,
    justifyContent: "center",
  },
  joinCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  joinBody: { lineHeight: 18, fontWeight: "500" },
  joinActions: { gap: 10 },
  joinPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12},
  joinPrimaryText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  joinSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1},
  joinSecondaryText: { fontWeight: "600", fontSize: 14 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    minHeight: 88,
  },
  modeCopy: { flex: 1, gap: 2 },
  modeTitle: {},
  modeSub: { fontWeight: "600" },
})
