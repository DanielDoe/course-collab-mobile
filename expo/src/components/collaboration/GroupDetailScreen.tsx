import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { IOS, SYSTEM } from "../../constants/faculty-communication-theme"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  statusTone,
  type GroupRecord,
} from "../../lib/collaboration-api"
import { CommGroupedList, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { ModuleSectionHeader } from "../modules/ModuleScreen"
import { CollabFlowHeader } from "./collab-nav"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const groupId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const scrollPad = useModuleScrollContentPadding(24)
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const [group, setGroup] = useState<GroupRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(groupId)) return
    setError("")
    try {
      const res = await collaborationApi.getGroup(session, groupId)
      setGroup(res.group ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load group.")
    }
  }, [session, groupId])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  useNotificationModuleRefresh("groups", load)

  const isLeader = useMemo(
    () => group?.created_by === Number(session?.databaseId),
    [group?.created_by, session?.databaseId],
  )

  const isMember = useMemo(
    () =>
      (group?.members ?? []).some(
        (m) => m.student_id === session?.id || String(m.id) === session?.databaseId,
      ),
    [group?.members, session?.id, session?.databaseId],
  )

  const requestJoin = async () => {
    if (!session) return
    setActing(true)
    try {
      await collaborationApi.requestJoinGroup(session, groupId)
      AppAlert.alert("Request sent", "The group leader will review your request.")
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not send request.")
    } finally {
      setActing(false)
    }
  }

  const leaveGroup = () => {
    if (!session) return
    AppAlert.alert("Leave group?", "You will need to join or create another group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setActing(true)
          try {
            await collaborationApi.removeGroupMember(session, groupId, Number(session.databaseId))
            router.back()
          } catch (err) {
            AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not leave group.")
          } finally {
            setActing(false)
          }
        },
      },
    ])
  }

  const deleteGroup = () => {
    if (!session) return
    AppAlert.alert("Delete group?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setActing(true)
          try {
            await collaborationApi.deleteGroup(session, groupId)
            router.back()
          } catch (err) {
            AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not delete group.")
          } finally {
            setActing(false)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Group" fallbackHref="/module/groups" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={native.tint} />
        </View>
      </View>
    )
  }

  if (!group) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Group" fallbackHref="/module/groups" />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || "Group not found."}</Text>
        </View>
      </View>
    )
  }

  const tone = statusTone(group.status)
  const members = group.members ?? []

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <CollabFlowHeader
        title={group.name}
        subtitle={group.leader_name ? `Led by ${group.leader_name}` : "Course group"}
        fallbackHref="/module/groups"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollPad.paddingBottom }]}
      >

      <CommGroupedList>
        <View style={styles.summaryRow}>
          <FacultyStatusPill label={tone.label} tone="neutral" />
          <Text style={styles.meta}>
            {members.length}/4 members · {formatRelativeTime(group.created_at)}
          </Text>
        </View>
      </CommGroupedList>

      <ModuleSectionHeader title="Members" />
      <CommGroupedList>
        {members.map((member, index) => (
          <View key={member.id} style={[styles.memberRow, index < members.length - 1 && styles.rowBorder]}>
            <View style={[styles.memberAvatar, { backgroundColor: SN.accentSoft }]}>
              <Text style={[styles.memberInitial, { color: SN.accent }]}>{member.full_name?.charAt(0) ?? "?"}</Text>
            </View>
            <View style={styles.memberCopy}>
              <Text style={styles.memberName}>{member.full_name}</Text>
              <Text style={styles.memberId}>{member.student_id}</Text>
            </View>
            {group.created_by === member.id ? (
              <Ionicons name="star" size={16} color={tokens.warning} />
            ) : null}
          </View>
        ))}
      </CommGroupedList>

      {!isMember && !isLeader ? (
        <Pressable style={[styles.primaryBtn, { backgroundColor: SN.accent }]} onPress={requestJoin} disabled={acting}>
          <Ionicons name="person-add-outline" size={18} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Request to join</Text>
        </Pressable>
      ) : null}

      {isMember && !isLeader ? (
        <Pressable style={styles.secondaryBtn} onPress={leaveGroup} disabled={acting}>
          <Text style={[styles.secondaryBtnText, { color: SN.accent }]}>Leave group</Text>
        </Pressable>
      ) : null}

      {isLeader ? (
        <>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: SN.accent }]}
            onPress={() => router.push(`/collaboration/projects/submit?groupId=${groupId}` as never)}
          >
            <Ionicons name="rocket-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Submit project</Text>
          </Pressable>
          <Pressable style={[styles.dangerBtn, { backgroundColor: SYSTEM.red.soft }]} onPress={deleteGroup} disabled={acting}>
            <Text style={styles.dangerBtnText}>Delete group</Text>
          </Pressable>
        </>
      ) : null}

      <CommSectionFooter>Group leaders manage members and project submissions.</CommSectionFooter>
    </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  errorText: { ...nativeType.destructive },
  summaryRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: IOS.secondaryGrouped,
  },
  meta: nativeType.caption,
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IOS.separator,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
    backgroundColor: IOS.secondaryGrouped,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitial: { fontSize: 15, fontWeight: "700" },
  memberCopy: { flex: 1 },
  memberName: nativeType.bodyEmphasis,
  memberId: nativeType.footnote,
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
    marginTop: 4,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
    backgroundColor: IOS.secondaryGrouped,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  dangerBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
  },
  dangerBtnText: { fontSize: 15, fontWeight: "600", color: NATIVE.destructive },
})
