import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import {
  collaborationApi,
  formatRelativeTime,
  type GroupInbox,
  type GroupRecord,
  type JoinRequest,
  type LinkRequest,
  type OpenCall,
  type RosterStudent,
} from "../../lib/collaboration-api"
import {
  collabGroupStatusAccent,
  collabGroupStatusIcon,
  collabListThumb,
  collabStatusLabel,
} from "../../lib/collaboration-list-theme"
import { CollabSearch } from "./collab-shared"
import { CommEmptyState, CommSectionFooter, CommSectionHeader } from "../faculty/faculty-communication-ui"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { AppAlert } from "../../lib/app-alert"
import { CollabActionSheet, type CollabSheetOption } from "./collab-native-sheet"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type GroupFilter = "mine" | "all" | "discover" | "inbox"

const EMPTY_INBOX: GroupInbox = {
  incomingJoinRequests: [],
  outgoingJoinRequests: [],
  incomingLinkRequests: [],
  outgoingLinkRequests: [],
}

function GroupListCard({
  group,
  index,
  onPress,
  isDiscover,
}: {
  group: GroupRecord
  index: number
  onPress: () => void
  isDiscover?: boolean
}) {
  const thumb = collabListThumb(index)
  const members = Number(group.member_count ?? 0)
  const statusLabel = isDiscover ? "Open to join" : collabStatusLabel(group.status)
  const statusColor = collabGroupStatusAccent(group.status, thumb, isDiscover)
  const statusIcon = collabGroupStatusIcon(group.status, isDiscover)

  return (
    <SignatureListCard
      index={index}
      title={group.name}
      subtitle={group.leader_name ? `Led by ${group.leader_name}` : "Course group"}
      meta={`${members}/4 members · ${formatRelativeTime(group.created_at)}`}
      metaIcon="people-outline"
      statusLabel={statusLabel}
      statusColor={statusColor}
      statusIcon={statusIcon}
      icon="people"
      accent={thumb.label}
      onPress={onPress}
    />
  )
}

export function GroupsScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const [groups, setGroups] = useState<GroupRecord[]>([])
  const [discover, setDiscover] = useState<GroupRecord[]>([])
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([])
  const [ungrouped, setUngrouped] = useState<RosterStudent[]>([])
  const [inbox, setInbox] = useState<GroupInbox>(EMPTY_INBOX)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<GroupFilter>("all")
  const [search, setSearch] = useState("")
  const [acting, setActing] = useState(false)
  const [sheet, setSheet] = useState<{ title: string; message?: string; options: CollabSheetOption[] } | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [groupRes, discoverRes, inboxRes] = await Promise.all([
        collaborationApi.getGroups(session),
        collaborationApi.getGroupsDiscover(session),
        collaborationApi.getMyGroupRequests(session),
      ])
      setGroups(groupRes.groups ?? [])
      setDiscover(discoverRes.openGroups ?? [])
      setOpenCalls(discoverRes.openCalls ?? [])
      setUngrouped(discoverRes.studentsWithoutGroup ?? [])
      setInbox(inboxRes)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load groups.")
      setGroups([])
      setDiscover([])
      setOpenCalls([])
      setUngrouped([])
      setInbox(EMPTY_INBOX)
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

  useNotificationModuleRefresh("groups", onRefresh)

  function isMyGroup(g: GroupRecord, student: StudentSession): boolean {
    if (Number(g.created_by) === Number(student.databaseId)) return true
    if (String(g.leader_student_id) === String(student.id)) return true
    return (g.members ?? []).some(
      (m) =>
        String(m.id) === String(student.databaseId) ||
        String(m.student_id) === String(student.id),
    )
  }

  const myGroups = useMemo(() => {
    if (!session) return []
    return groups.filter((g) => isMyGroup(g, session))
  }, [groups, session])

  const inboxCount = inbox.incomingJoinRequests.length + inbox.incomingLinkRequests.length

  const navTabs = useMemo(
    () => [
      { id: "all" as const, label: "All", icon: "grid-outline" as const },
      { id: "mine" as const, label: "Mine", icon: "person-outline" as const },
      { id: "discover" as const, label: "Join", icon: "search-outline" as const },
      { id: "inbox" as const, label: inboxCount > 0 ? `Inbox (${inboxCount})` : "Inbox", icon: "mail-outline" as const },
    ],
    [inboxCount],
  )

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

  function filterGroups(source: GroupFilter) {
    const visible = source === "mine" ? myGroups : source === "discover" ? discover : groups
    const q = search.trim().toLowerCase()
    if (!q) return visible
    return visible.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.leader_name ?? "").toLowerCase().includes(q),
    )
  }

  function renderGroupPage(source: GroupFilter) {
    const filtered = filterGroups(source)
    if (filtered.length === 0) {
      return (
        <>
          <CommEmptyState
            icon="people-outline"
            title={source === "mine" ? "You're Not in a Group Yet" : "No Groups Found"}
            body="Groups for your course will appear here."
          />
          {source === "discover" ? renderDiscoverExtras() : null}
          <CommSectionFooter>
            {source === "discover"
              ? "Groups accepting members"
              : "Course groups for your section. Browse open calls from the Join tab."}
          </CommSectionFooter>
        </>
      )
    }

    return (
      <>
        <View style={signatureListStyles.list}>
          {filtered.map((group, index) => (
            <GroupListCard
              key={group.id}
              index={index}
              group={group}
              isDiscover={source === "discover"}
              onPress={() => router.push(`/collaboration/groups/${group.id}` as never)}
            />
          ))}
        </View>
        {source === "discover" ? renderDiscoverExtras() : null}
        <CommSectionFooter>
          {source === "discover"
            ? "Groups accepting members"
            : "Course groups for your section. Browse open calls from the Join tab."}
        </CommSectionFooter>
      </>
    )
  }

  function renderDiscoverExtras() {
    const q = search.trim().toLowerCase()
    const calls = q
      ? openCalls.filter(
          (c) =>
            (c.title ?? "").toLowerCase().includes(q) ||
            (c.group_name ?? "").toLowerCase().includes(q) ||
            (c.owner_name ?? "").toLowerCase().includes(q),
        )
      : openCalls
    const people = q
      ? ungrouped.filter(
          (s) =>
            s.full_name.toLowerCase().includes(q) ||
            s.student_id.toLowerCase().includes(q),
        )
      : ungrouped.filter((s) => Number(s.id) !== Number(session?.databaseId))

    return (
      <>
        {calls.length > 0 ? (
          <View style={styles.block}>
            <CommSectionHeader title="Open Calls" />
            <View style={signatureListStyles.list}>
              {calls.map((call, index) => (
                <SignatureListCard
                  key={`call-${call.id}`}
                  index={index}
                  title={call.title}
                  subtitle={call.group_name ?? call.owner_name ?? "Classmate"}
                  meta={formatRelativeTime(call.created_at)}
                  metaIcon="megaphone-outline"
                  statusLabel="Open"
                  statusIcon="radio-outline"
                  icon="megaphone-outline"
                  accent={collabListThumb(index).label}
                  onPress={() => {
                    if (!call.group_id || !session) return
                    setSheet({
                      title: call.title,
                      message: call.message || "Request to join this group.",
                      options: [
                        {
                          label: "Request to Join",
                          icon: "person-add-outline",
                          onPress: () =>
                            act(
                              () => collaborationApi.requestJoinGroup(session, call.group_id!),
                              "Request Sent",
                              "The group leader will review your request.",
                            ),
                        },
                        {
                          label: "View Group",
                          icon: "people-outline",
                          onPress: () => router.push(`/collaboration/groups/${call.group_id}` as never),
                        },
                      ],
                    })
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
        {people.length > 0 && session ? (
          <View style={styles.block}>
            <CommSectionHeader title="Students Without a Group" />
            <View style={signatureListStyles.list}>
              {people.map((student, index) => (
                <SignatureListCard
                  key={`ungrouped-${student.id}`}
                  index={index}
                  title={student.full_name}
                  subtitle={student.student_id}
                  meta="Available to team up"
                  metaIcon="person-outline"
                  statusLabel="Available"
                  statusIcon="ellipse-outline"
                  icon="person-outline"
                  accent={collabListThumb(index + 3).label}
                  onPress={() =>
                    setSheet({
                      title: student.full_name,
                      message: "Send a teammate invite to form a group.",
                      options: [
                        {
                          label: "Send Invite",
                          icon: "send-outline",
                          onPress: () =>
                            act(
                              () => collaborationApi.sendLinkRequest(session, student.id),
                              "Invite Sent",
                              `${student.full_name} will see your teammate request.`,
                            ),
                        },
                      ],
                    })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}
      </>
    )
  }

  function renderInbox() {
    const q = search.trim().toLowerCase()
    const match = (s: string) => !q || s.toLowerCase().includes(q)
    const incomingJoin = inbox.incomingJoinRequests.filter(
      (r) => match(r.group_name) || match(r.requester_name ?? ""),
    )
    const outgoingJoin = inbox.outgoingJoinRequests.filter(
      (r) => match(r.group_name) || match(r.leader_name ?? ""),
    )
    const incomingLink = inbox.incomingLinkRequests.filter((r) => match(r.from_student_name ?? ""))
    const outgoingLink = inbox.outgoingLinkRequests.filter((r) => match(r.to_student_name ?? ""))
    const empty =
      incomingJoin.length + outgoingJoin.length + incomingLink.length + outgoingLink.length === 0

    if (empty) {
      return (
        <>
          <CommEmptyState
            icon="mail-outline"
            title="No Pending Requests"
            body="Join requests and teammate invites will show up here."
          />
          <CommSectionFooter>Leaders accept join requests. Anyone can send a teammate invite.</CommSectionFooter>
        </>
      )
    }

    function joinCard(req: JoinRequest, index: number, incoming: boolean) {
      return (
        <SignatureListCard
          key={`join-${req.id}`}
          index={index}
          title={incoming ? req.requester_name ?? "Student" : req.group_name}
          subtitle={incoming ? `Wants to join ${req.group_name}` : req.leader_name ? `Led by ${req.leader_name}` : "Pending"}
          meta={formatRelativeTime(req.created_at)}
          metaIcon="mail-outline"
          statusLabel={incoming ? "Needs review" : "Pending"}
          statusIcon={incoming ? "alert-circle-outline" : "time-outline"}
          icon="people-outline"
          accent={collabListThumb(index).label}
          onPress={() => {
            if (!incoming) {
              router.push(`/collaboration/groups/${req.group_id}` as never)
              return
            }
            setSheet({
              title: req.requester_name ?? "Join Request",
              message: `Add this student to ${req.group_name}?`,
              options: [
                {
                  label: "Accept",
                  icon: "checkmark-circle-outline",
                  onPress: () =>
                    act(
                      () => collaborationApi.respondJoinRequest(session!, req.id, "accept"),
                      "Accepted",
                      `${req.requester_name ?? "Student"} was added to ${req.group_name}.`,
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
          }}
        />
      )
    }

    function linkCard(req: LinkRequest, index: number, incoming: boolean) {
      const name = incoming ? req.from_student_name : req.to_student_name
      return (
        <SignatureListCard
          key={`link-${req.id}`}
          index={index}
          title={name ?? "Classmate"}
          subtitle={incoming ? "Wants to form a group with you" : "Waiting for a response"}
          meta={formatRelativeTime(req.created_at)}
          metaIcon="link-outline"
          statusLabel={incoming ? "Needs review" : "Pending"}
          statusIcon={incoming ? "alert-circle-outline" : "time-outline"}
          icon="person-add-outline"
          accent={collabListThumb(index + 2).label}
          onPress={
            incoming
              ? () =>
                  setSheet({
                    title: name ?? "Teammate Invite",
                    message: "Accepting creates a group with this classmate.",
                    options: [
                      {
                        label: "Accept",
                        icon: "checkmark-circle-outline",
                        onPress: () =>
                          act(
                            () => collaborationApi.respondLinkRequest(session!, req.id, "accept"),
                            "Accepted",
                            "Your new group is ready.",
                          ),
                      },
                      {
                        label: "Decline",
                        icon: "close-circle-outline",
                        destructive: true,
                        onPress: () =>
                          act(
                            () => collaborationApi.respondLinkRequest(session!, req.id, "reject"),
                            "Declined",
                            "The teammate invite was declined.",
                          ),
                      },
                    ],
                  })
              : undefined
          }
        />
      )
    }

    return (
      <>
        {incomingJoin.length > 0 ? (
          <View style={styles.block}>
            <CommSectionHeader title="Join Requests" />
            <View style={signatureListStyles.list}>{incomingJoin.map((req, i) => joinCard(req, i, true))}</View>
          </View>
        ) : null}
        {incomingLink.length > 0 ? (
          <View style={styles.block}>
            <CommSectionHeader title="Teammate Invites" />
            <View style={signatureListStyles.list}>{incomingLink.map((req, i) => linkCard(req, i, true))}</View>
          </View>
        ) : null}
        {outgoingJoin.length > 0 ? (
          <View style={styles.block}>
            <CommSectionHeader title="Your Join Requests" />
            <View style={signatureListStyles.list}>{outgoingJoin.map((req, i) => joinCard(req, i, false))}</View>
          </View>
        ) : null}
        {outgoingLink.length > 0 ? (
          <View style={styles.block}>
            <CommSectionHeader title="Your Teammate Invites" />
            <View style={signatureListStyles.list}>{outgoingLink.map((req, i) => linkCard(req, i, false))}</View>
          </View>
        ) : null}
        <CommSectionFooter>Leaders accept join requests. Anyone can send a teammate invite.</CommSectionFooter>
      </>
    )
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  return (
    <>
      <TabbedModuleLayout
        tabs={navTabs}
        tab={filter}
        onTabChange={setFilter}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        error={error}
        chrome={
          <CollabSearch
            value={search}
            onChange={setSearch}
            placeholder="Search groups…"
            trailingAction={{
              onPress: () => router.push("/collaboration/groups/create" as never),
              accessibilityLabel: "Create group",
              icon: "add",
            }}
          />
        }
        pages={[
          renderGroupPage("all"),
          renderGroupPage("mine"),
          renderGroupPage("discover"),
          renderInbox(),
        ]}
      />
      <CollabActionSheet
        visible={sheet != null}
        onClose={() => setSheet(null)}
        title={sheet?.title ?? ""}
        message={sheet?.message}
        options={sheet?.options ?? []}
      />
    </>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  block: { marginTop: 20, gap: 8 },
})
