import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  statusTone,
  type GroupRecord,
  type JoinRequest,
  type RosterStudent,
} from "../../lib/collaboration-api"
import {
  CommGroupedList,
  CommListRow,
  CommSectionFooter,
  CommSectionHeader,
} from "../faculty/faculty-communication-ui"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { AppButton } from "../theme/AppButton"
import { CollabFlowHeader } from "./collab-nav"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { CollabActionSheet, type CollabSheetOption } from "./collab-native-sheet"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const groupId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const [group, setGroup] = useState<GroupRecord | null>(null)
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [incoming, setIncoming] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [acting, setActing] = useState(false)
  const [sheet, setSheet] = useState<{ title: string; message?: string; options: CollabSheetOption[] } | null>(null)
  const [picker, setPicker] = useState<"member" | "call" | null>(null)
  const [callTitle, setCallTitle] = useState("")
  const [callMessage, setCallMessage] = useState("")

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(groupId)) return
    setError("")
    try {
      const [res, rosterRes, inboxRes] = await Promise.all([
        collaborationApi.getGroup(session, groupId),
        collaborationApi.getRoster(session),
        collaborationApi.getMyGroupRequests(session),
      ])
      setGroup(res.group ?? null)
      setRoster(rosterRes.students ?? [])
      setIncoming((inboxRes.incomingJoinRequests ?? []).filter((r) => r.group_id === groupId))
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
      isLeader ||
      (group?.members ?? []).some(
        (m) => m.student_id === session?.id || String(m.id) === session?.databaseId,
      ),
    [group?.members, session?.id, session?.databaseId, isLeader],
  )
  const addable = useMemo(() => {
    const memberIds = new Set((group?.members ?? []).map((m) => Number(m.id)))
    if (group?.created_by != null) memberIds.add(Number(group.created_by))
    return roster.filter((s) => !memberIds.has(Number(s.id)))
  }, [roster, group])

  async function act(fn: () => Promise<unknown>, okTitle: string, okBody: string) {
    if (!session || acting) return
    setActing(true)
    try {
      await fn()
      AppAlert.alert(okTitle, okBody)
      await load()
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not complete that action.")
    } finally {
      setActing(false)
    }
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
          <Text style={[type.destructive]}>{error || "Group not found."}</Text>
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
        subtitle={`Led by ${group.leader_name ?? "—"}`}
        fallbackHref="/module/groups"
        rightSlot={
          isLeader ? (
            <Pressable
              onPress={() =>
                setSheet({
                  title: group.name,
                  options: [
                    {
                      label: "Add Member",
                      icon: "person-add-outline",
                      onPress: () => setPicker("member"),
                    },
                    {
                      label: "Post Open Call",
                      icon: "megaphone-outline",
                      onPress: () => setPicker("call"),
                    },
                    {
                      label: "Submit Project",
                      icon: "rocket-outline",
                      onPress: () => router.push(`/collaboration/projects/submit?groupId=${groupId}` as never),
                    },
                    {
                      label: "Delete Group",
                      icon: "trash-outline",
                      destructive: true,
                      onPress: () =>
                        AppAlert.alert("Delete Group?", "This cannot be undone.", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () =>
                              act(async () => {
                                await collaborationApi.deleteGroup(session!, groupId)
                                router.back()
                              }, "Deleted", "The group was removed."),
                          },
                        ]),
                    },
                  ],
                })
              }
              hitSlop={8}
              accessibilityLabel="Group actions"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={tokens.accent} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CommGroupedList>
          <View style={styles.summaryRow}>
            <FacultyStatusPill label={tone.label} tone="neutral" />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {members.length}/4 members · {formatRelativeTime(group.created_at)}
            </Text>
          </View>
        </CommGroupedList>

        <CommSectionHeader title="Members" />
        <CommGroupedList>
          {members.map((member, index) => (
            <CommListRow
              key={member.id}
              icon={group.created_by === member.id ? "star" : "person-outline"}
              iconColor={group.created_by === member.id ? tokens.warning : SN.accent}
              iconSoft={SN.accentSoft}
              title={member.full_name}
              subtitle={member.student_id}
              meta={group.created_by === member.id ? "Leader" : undefined}
              isLast={index === members.length - 1}
              showChevron={isLeader && group.created_by !== member.id}
              onPress={
                isLeader && group.created_by !== member.id
                  ? () =>
                      setSheet({
                        title: member.full_name,
                        message: "Remove this classmate from the group?",
                        options: [
                          {
                            label: "Remove Member",
                            icon: "close-circle-outline",
                            destructive: true,
                            onPress: () =>
                              act(
                                () => collaborationApi.removeGroupMember(session!, groupId, member.id),
                                "Removed",
                                `${member.full_name} was removed from the group.`,
                              ),
                          },
                        ],
                      })
                  : undefined
              }
            />
          ))}
        </CommGroupedList>

        {isLeader && incoming.length > 0 ? (
          <>
            <CommSectionHeader title="Join Requests" />
            <CommGroupedList>
              {incoming.map((req, index) => (
                <CommListRow
                  key={req.id}
                  icon="mail-outline"
                  iconColor={SN.accent}
                  iconSoft={SN.accentSoft}
                  title={req.requester_name ?? "Student"}
                  subtitle={formatRelativeTime(req.created_at)}
                  isLast={index === incoming.length - 1}
                  onPress={() =>
                    setSheet({
                      title: req.requester_name ?? "Join Request",
                      message: `Add this student to ${group.name}?`,
                      options: [
                        {
                          label: "Accept",
                          icon: "checkmark-circle-outline",
                          onPress: () =>
                            act(
                              () => collaborationApi.respondJoinRequest(session!, req.id, "accept"),
                              "Accepted",
                              `${req.requester_name ?? "Student"} was added.`,
                            ),
                        },
                        {
                          label: "Decline",
                          icon: "close-circle-outline",
                          destructive: true,
                          onPress: () =>
                            act(
                              () => collaborationApi.respondJoinRequest(session!, req.id, "reject"),
                              "Declined",
                              "The join request was declined.",
                            ),
                        },
                      ],
                    })
                  }
                />
              ))}
            </CommGroupedList>
          </>
        ) : null}

        {!isMember ? (
          <AppButton
            label="Request to Join"
            icon="person-add-outline"
            iconPosition="left"
            onPress={() =>
              act(
                () => collaborationApi.requestJoinGroup(session!, groupId),
                "Request Sent",
                "The group leader will review your request.",
              )
            }
            disabled={acting}
          />
        ) : null}

        {isMember && !isLeader ? (
          <AppButton
            label="Leave Group"
            variant="outline"
            onPress={() =>
              AppAlert.alert("Leave Group?", "You will need to join or create another group.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Leave",
                  style: "destructive",
                  onPress: () =>
                    act(async () => {
                      await collaborationApi.removeGroupMember(session!, groupId, Number(session!.databaseId))
                      router.back()
                    }, "Left Group", "You left the group."),
                },
              ])
            }
            disabled={acting}
          />
        ) : null}

        {isLeader ? (
          <AppButton
            label="Submit Project"
            icon="rocket-outline"
            iconPosition="left"
            onPress={() => router.push(`/collaboration/projects/submit?groupId=${groupId}` as never)}
          />
        ) : null}

        <CommSectionFooter>Group leaders manage members, join requests, and project submissions.</CommSectionFooter>
      </ScrollView>

      <CollabActionSheet
        visible={sheet != null}
        onClose={() => setSheet(null)}
        title={sheet?.title ?? ""}
        message={sheet?.message}
        options={sheet?.options ?? []}
      />

      <CollabActionSheet
        visible={picker === "member"}
        onClose={() => setPicker(null)}
        title="Add Member"
        message={addable.length === 0 ? "No classmates available to add." : "Choose a classmate to add."}
        options={addable.map((student) => ({
          label: student.full_name,
          detail: student.student_id,
          icon: "person-outline" as const,
          onPress: () =>
            act(
              () => collaborationApi.addGroupMember(session!, groupId, student.id),
              "Member Added",
              `${student.full_name} was added to the group.`,
            ),
        }))}
      />

      <CollabActionSheet
        visible={picker === "call"}
        onClose={() => setPicker(null)}
        title="Post Open Call"
        message="Classmates can find this on the Join tab."
      >
        <View style={[styles.callForm, { backgroundColor: native.fill }]}>
          <TextInput
            style={[styles.input, { color: native.label }]}
            value={callTitle}
            onChangeText={setCallTitle}
            placeholder="Looking for a teammate…"
            placeholderTextColor={native.tertiaryLabel}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline, { color: native.label }]}
            value={callMessage}
            onChangeText={setCallMessage}
            placeholder="What skills or availability do you need?"
            placeholderTextColor={native.tertiaryLabel}
            multiline
          />
          <AppButton
            label="Post Call"
            disabled={acting || !callTitle.trim()}
            onPress={() =>
              act(
                async () => {
                  await collaborationApi.createOpenCall(session!, {
                    title: callTitle.trim(),
                    message: callMessage.trim() || undefined,
                    groupId,
                  })
                  setCallTitle("")
                  setCallMessage("")
                  setPicker(null)
                },
                "Open Call Posted",
                "Classmates can find this on the Join tab.",
              )
            }
          />
        </View>
      </CollabActionSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: NATIVE.pagePadding, gap: 12, paddingBottom: 40 },
  summaryRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  callForm: { borderRadius: NATIVE.sectionRadius, padding: 12, gap: 10 },
  input: {
    fontSize: 17,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
})
