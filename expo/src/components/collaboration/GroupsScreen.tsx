import { useCallback, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { formatRelativeTime, type GroupRecord } from "../../lib/collaboration-api"
import { useStudentGroups } from "../../hooks/query/useStudentGroups"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
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
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"

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
  const groupsQuery = useStudentGroups(session)
  const groups = groupsQuery.groups
  const discover = groupsQuery.discover
  const loading = groupsQuery.isInitialLoading
  const refreshing = groupsQuery.isRefreshing && !groupsQuery.isInitialLoading
  const error = groupsQuery.error instanceof ApiError
    ? groupsQuery.error.message
    : groupsQuery.error
      ? "Failed to load groups."
      : ""
  const [filter, setFilter] = useState<GroupFilter>("all")
  const [search, setSearch] = useState("")

  const onRefresh = useCallback(async () => {
    await groupsQuery.refetch()
  }, [groupsQuery.refetch])

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

  const allGroupsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.leader_name ?? "").toLowerCase().includes(q),
    )
  }, [groups, search])

  const mineGroupsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return myGroups
    return myGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.leader_name ?? "").toLowerCase().includes(q),
    )
  }, [myGroups, search])

  const discoverFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return discover
    return discover.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.leader_name ?? "").toLowerCase().includes(q),
    )
  }, [discover, search])

  const allGroupsPager = useFacultyListPager(allGroupsFiltered, `all:${search}`, "groups")
  const mineGroupsPager = useFacultyListPager(mineGroupsFiltered, `mine:${search}`, "groups")
  const discoverPager = useFacultyListPager(discoverFiltered, `discover:${search}`, "groups")

  const navTabs = useMemo(
    () => [
      { id: "all" as const, label: "All", icon: "grid-outline" as const },
      { id: "mine" as const, label: "Mine", icon: "person-outline" as const },
      { id: "discover" as const, label: "Join", icon: "search-outline" as const },
    ],
    [],
  )

  function renderGroupPage(
    source: GroupFilter,
    pager: ReturnType<typeof useFacultyListPager<GroupRecord>>,
  ) {
    if (pager.total === 0) {
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
          {pager.items.map((group, index) => (
            <GroupListCard
              key={group.id}
              index={pager.page * pager.pageSize + index}
              group={group}
              isDiscover={source === "discover"}
              onPress={() => router.push(`/collaboration/groups/${group.id}` as never)}
            />
          ))}
        </View>
        <FacultyListPagerFooter pager={pager} />
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
        <>
        <QueryRefreshBanner visible={groupsQuery.refreshFailed} onRetry={() => void onRefresh()} />
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
        </>
      }
      pages={[
        renderGroupPage("all", allGroupsPager),
        renderGroupPage("mine", mineGroupsPager),
        renderGroupPage("discover", discoverPager),
      ]}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
})
