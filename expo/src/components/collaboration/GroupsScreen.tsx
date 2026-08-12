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
  type GroupRecord,
} from "../../lib/collaboration-api"
import {
  collabGroupStatusAccent,
  collabGroupStatusIcon,
  collabListThumb,
  collabStatusLabel,
} from "../../lib/collaboration-list-theme"
import { CollabSearch } from "./collab-shared"
import { CommEmptyState, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type GroupFilter = "mine" | "all" | "discover"

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
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<GroupFilter>("all")
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [groupRes, discoverRes] = await Promise.all([
        collaborationApi.getGroups(session),
        collaborationApi.getGroupsDiscover(session),
      ])
      setGroups(groupRes.groups ?? [])
      setDiscover(discoverRes.openGroups ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load groups.")
      setGroups([])
      setDiscover([])
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

  const myGroups = useMemo(() => {
    if (!session) return []
    return groups.filter((g) =>
      (g.members ?? []).some(
        (m) => m.student_id === session.id || String(m.student_id) === session.id,
      ),
    )
  }, [groups, session])

  const navTabs = useMemo(
    () => [
      { id: "all" as const, label: "All", icon: "grid-outline" as const },
      { id: "mine" as const, label: "Mine", icon: "person-outline" as const },
      { id: "discover" as const, label: "Join", icon: "search-outline" as const },
    ],
    [],
  )

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
            title={source === "mine" ? "You're not in a group yet" : "No groups found"}
            body="Groups for your course will appear here."
          />
          <CommSectionFooter>
            {source === "discover"
              ? "Groups accepting members"
              : "Course groups for your section · Browse open calls from the Join tab"}
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
        <CommSectionFooter>
          {source === "discover"
            ? "Groups accepting members"
            : "Course groups for your section · Browse open calls from the Join tab"}
        </CommSectionFooter>
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
      pages={[renderGroupPage("all"), renderGroupPage("mine"), renderGroupPage("discover")]}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
})
