import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useSession } from "../../context/SessionProvider"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  type GroupRecord,
  type OpenCall} from "../../lib/collaboration-api"
import { CollabCard, CollabSectionTitle } from "./collab-shared"
import { CollabFlowHeader } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function GroupsDiscoverScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const scrollPad = useModuleScrollContentPadding(24)
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const [openGroups, setOpenGroups] = useState<GroupRecord[]>([])
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session) return
    try {
      const res = await collaborationApi.getGroupsDiscover(session)
      setOpenGroups(res.openGroups)
      setOpenCalls(res.openCalls)
    } catch {
      setOpenGroups([])
      setOpenCalls([])
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

  useNotificationModuleRefresh("groups", load)

  const requestJoin = async (groupId: number) => {
    if (!session) return
    try {
      await collaborationApi.requestJoinGroup(session, groupId)
      AppAlert.alert("Request sent", "The group leader will review your request.")
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not send request.")
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader
        title="Discover groups"
        subtitle="Join open teams or browse calls"
        fallbackHref="/module/groups"
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollPad.paddingBottom }]}>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
        ) : (
          <>
            <CollabSectionTitle title="Open groups" hint="Groups with available spots" />
            {openGroups.length === 0 ? (
              <Text style={[styles.empty, { color: SN.secondaryLabel }]}>No open groups right now.</Text>
            ) : (
              openGroups.map((group, index) => (
                <View key={group.id} style={styles.cardWrap}>
                  <CollabCard
                    thumbIndex={index}
                    icon="people-circle-outline"
                    title={group.name}
                    subtitle={group.leader_name ? `Led by ${group.leader_name}` : undefined}
                    meta={`${group.member_count ?? 0}/4 members`}
                    onPress={() => router.push(`/collaboration/groups/${group.id}` as never)}
                  />
                  <Pressable
                    style={[styles.joinBtn, { backgroundColor: theme.soft }]}
                    onPress={() => requestJoin(group.id)}
                  >
                    <Text style={[styles.joinBtnText, { color: theme.primary }]}>Request to join</Text>
                  </Pressable>
                </View>
              ))
            )}

            <CollabSectionTitle title="Open calls" hint="Students looking for teammates" />
            {openCalls.length === 0 ? (
              <Text style={[styles.empty, { color: SN.secondaryLabel }]}>No open calls posted.</Text>
            ) : (
              openCalls.map((call) => (
                <View
                  key={call.id}
                  style={[
                    styles.callCard,
                    { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator },
                  ]}
                >
                  <Text style={styles.callTitle}>{call.title}</Text>
                  {call.message ? <Text style={styles.callBody}>{call.message}</Text> : null}
                  <Text style={[styles.callMeta, { color: SN.secondaryLabel }]}>
                    {call.owner_name ?? call.group_name ?? "Student"} · {call.session}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  empty: { fontSize: 13, textAlign: "center", paddingVertical: 12 },
  cardWrap: { gap: 8 },
  joinBtn: {
    alignSelf: "flex-start",
    marginLeft: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  joinBtnText: { fontSize: 12, fontWeight: "700" },
  callCard: {
    borderRadius: 999,
    padding: 14,
    borderWidth: 1,
    gap: 6},
  callTitle: { fontSize: 15, fontWeight: "600", color: NATIVE.label },
  callBody: { fontSize: 13, color: "#475569", lineHeight: 18 },
  callMeta: { fontSize: 11, fontWeight: "600" }})
