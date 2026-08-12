import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { collaborationApi } from "../../lib/collaboration-api"
import {
  PLAYGROUND_LEAVE_LOBBY_MESSAGE,
  PLAYGROUND_LEAVE_LOBBY_TITLE,
} from "../../lib/playground-join-guard"
import { clearPlaygroundSessionLock, upsertPlaygroundSessionLock } from "../../lib/playground-session-lock"
import { CollabFlowHeader } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"
import { useAppThemeTokens } from "../../context/AppearanceProvider"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function PlaygroundWaitingScreen() {
  const { sessionId, resultId } = useLocalSearchParams<{ sessionId: string; resultId: string }>()
  const session = useStudentSession()
  const router = useRouter()
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const [label, setLabel] = useState("Playground")
  const [participants, setParticipants] = useState<Array<{ displayName: string; is_current_user?: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sid = Number(sessionId)
  const rid = Number(resultId)

  const leaveLobby = useCallback(() => {
    AppAlert.alert(PLAYGROUND_LEAVE_LOBBY_TITLE, PLAYGROUND_LEAVE_LOBBY_MESSAGE, [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave lobby",
        style: "destructive",
        onPress: () => {
          void clearPlaygroundSessionLock().then(() => {
            router.replace("/module/playground" as never)
          })
        },
      },
    ])
  }, [router])

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      leaveLobby()
      return true
    })
    return () => sub.remove()
  }, [leaveLobby])

  useEffect(() => {
    if (!Number.isFinite(sid) || !Number.isFinite(rid)) return
    void upsertPlaygroundSessionLock({
      sessionId: sid,
      resultId: rid,
      mode: "CLASSROOM",
      startedAt: Date.now(),
      answeredQuestionIds: [],
      lockedIndex: 0,
    })
  }, [sid, rid])

  const poll = useCallback(async () => {
    if (!session || !Number.isFinite(sid) || !Number.isFinite(rid)) return
    try {
      const data = await collaborationApi.getPlaygroundLobby(session, sid, rid)
      setLabel(data.sessionLabel ?? data.sessionCode ?? "Playground")
      setParticipants(data.participants ?? [])
      if (data.gameStarted) {
        router.replace(
          `/collaboration/playground/game?sessionId=${sid}&resultId=${rid}` as never,
        )
      }
      if (data.sessionEnded) {
        void clearPlaygroundSessionLock().then(() => {
          router.replace("/module/playground" as never)
        })
      }
    } finally {
      setLoading(false)
    }
  }, [session, sid, rid, router])

  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, 2500)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [poll])

  return (
    <View style={[styles.flex, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader
        title="Waiting room"
        subtitle={label}
        fallbackHref="/module/playground"
        onBackPress={leaveLobby}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.hero,
            { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator },
          ]}
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.heroTitle, { color: theme.primaryDark }]}>Waiting for instructor…</Text>
          <Text style={[styles.heroSub, { color: SN.secondaryLabel }]}>
            The game starts when your instructor begins the session.
          </Text>
          {label ? (
            <View style={[styles.sessionBadge, { backgroundColor: theme.soft, borderColor: tokens.border }]}>
              <Ionicons name="game-controller-outline" size={14} color={theme.primary} />
              <Text style={[styles.sessionBadgeText, { color: theme.primaryDark }]} numberOfLines={2}>
                {label}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.primaryDark }]}>
          {participants.length} players in lobby
        </Text>
        {loading && participants.length === 0 ? (
          <Text style={[styles.empty, { color: SN.secondaryLabel }]}>Loading participants…</Text>
        ) : (
          participants.map((p, i) => (
            <View
              key={`${p.displayName}-${i}`}
              style={[
                styles.playerRow,
                { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator },
              ]}
            >
              <Ionicons name="person-circle-outline" size={20} color={theme.primary} />
              <Text
                style={[
                  styles.playerName,
                  { color: SN.label },
                  p.is_current_user && { color: theme.primary, fontWeight: "600" },
                ]}
              >
                {p.displayName}
                {p.is_current_user ? " (you)" : ""}
              </Text>
            </View>
          ))
        )}

        <Pressable style={styles.leaveBtn} onPress={leaveLobby}>
          <Text style={[styles.leaveBtnText, { color: SN.secondaryLabel }]}>Leave lobby</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  hero: {
    alignItems: "center",
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    gap: 10,
  },
  heroTitle: { fontSize: 17, fontWeight: "600" },
  heroSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
  },
  sessionBadgeText: { fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "600" },
  empty: { fontSize: 13, textAlign: "center" },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  playerName: { fontSize: 14, fontWeight: "600" },
  leaveBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  leaveBtnText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
})
