import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { AppAlert } from "../../lib/app-alert"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorGroup, type InstructorSession } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useFacultyModuleStyles } from "../../lib/faculty-themed-ui"
import { useNativeType } from "../../lib/themed-module-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyGroupListCard } from "./FacultyCollabListCards"
import { useFacultyStickyHeaderScrollLayout,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  type FacultyFilterOption} from "./faculty-module-shell"
import { FacultyGroupActionSheet } from "./FacultyGroupActionSheet"
import { FacultyCollabCreateMenuSheet } from "./FacultyCollabCreateMenuSheet"
import { FacultyGroupCreateModal } from "./FacultyGroupCreateModal"
import { FacultyProjectCreateModal } from "./FacultyProjectCreateModal"

type MenuTab = "all" | "pending" | "approved" | "rejected" | "deleted"

const MENU_TABS: Array<{
  id: MenuTab
  label: string
}> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Queue" },
  { id: "approved", label: "Active" },
  { id: "rejected", label: "Denied" },
  { id: "deleted", label: "Trash" },
]

function isPendingGroup(group: InstructorGroup): boolean {
  return !group.deleted_at && (group.status === "pending" || group.status === "pending_update")
}

function tabMatches(group: InstructorGroup, tab: MenuTab): boolean {
  if (tab === "deleted") return Boolean(group.deleted_at)
  if (group.deleted_at) return false
  if (tab === "all") return true
  if (tab === "pending") return isPendingGroup(group)
  if (tab === "approved") return group.status === "approved"
  if (tab === "rejected") return group.status === "rejected"
  return true
}

export function FacultyGroupsScreen() {
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 88 })
  const tokens = useAppThemeTokens()
  const styles = useFacultyModuleStyles()
  const type = useNativeType()
  const router = useRouter()
  const { scope, ready } = useFacultyScope()

  const [menu, setMenu] = useState<MenuTab>("pending")
  const [activeGroups, setActiveGroups] = useState<InstructorGroup[]>([])
  const [deletedGroups, setDeletedGroups] = useState<InstructorGroup[]>([])
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [sessionFilter, setSessionFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [groupCreateOpen, setGroupCreateOpen] = useState(false)
  const [projectCreateOpen, setProjectCreateOpen] = useState(false)
  const [selected, setSelected] = useState<InstructorGroup | null>(null)

  const sessionOptions: FacultyFilterOption[] = useMemo(() => {
    const seen = new Set<string>()
    const unique = sessions.filter((s) => {
      if (seen.has(s.code)) return false
      seen.add(s.code)
      return true
    })
    return [{ value: "all", label: "All sections" }, ...unique.map((s) => ({ value: s.code, label: s.code }))]
  }, [sessions])

  const allGroups = useMemo(() => [...activeGroups, ...deletedGroups], [activeGroups, deletedGroups])

  const tabCounts = useMemo(() => {
    const counts: Record<MenuTab, number> = {
      all: activeGroups.length,
      pending: activeGroups.filter(isPendingGroup).length,
      approved: activeGroups.filter((g) => g.status === "approved").length,
      rejected: activeGroups.filter((g) => g.status === "rejected").length,
      deleted: deletedGroups.length}
    return counts
  }, [activeGroups, deletedGroups])

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const session = sessionFilter === "all" ? undefined : sessionFilter
    const [activeRows, deletedRows, sessionData] = await Promise.all([
      instructorApi.getGroups(scope, { session }),
      instructorApi.getGroups(scope, { session, status: "deleted" }),
      instructorApi.getSessions(scope).catch(() => ({ sessions: [] as InstructorSession[] })),
    ])
    setActiveGroups(activeRows)
    setDeletedGroups(deletedRows)
    setSessions((sessionData.sessions ?? []).filter((s) => s.code.toUpperCase() !== "BETA"))
  }, [scope, sessionFilter])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load groups."))
      .finally(() => setLoading(false))
  }, [ready, load])

  const filtered = useMemo(() => {
    let rows = allGroups.filter((g) => tabMatches(g, menu))
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.leader_name.toLowerCase().includes(q) ||
        g.session.toLowerCase().includes(q),
    )
  }, [allGroups, menu, search])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load groups.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("groups", handleRefresh)

  async function runAction(action: () => Promise<void>, options?: { closeSheet?: boolean; keepSelected?: boolean }) {
    setActing(true)
    setError("")
    const selectedId = selected?.id
    try {
      await action()
      await load()
      if (options?.keepSelected && selectedId && scope) {
        try {
          const fresh = await instructorApi.getGroupDetail(scope, selectedId)
          setSelected(fresh)
        } catch {
          setSelected(null)
        }
      } else if (options?.closeSheet !== false) {
        setSelected(null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.")
    } finally {
      setActing(false)
    }
  }

  const tabItems = useMemo(
    () =>
      MENU_TABS.map((item) => ({
        ...item,
        count: tabCounts[item.id] > 0 ? tabCounts[item.id] : undefined})),
    [tabCounts],
  )

  if (!ready) {
    return (
      <FacultyEmptyState
        icon="people-circle-outline"
        title="Select a course"
        body="Group management requires an active course."
      />
    )
  }

  return (
    <View style={styles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={menu} onChange={setMenu} scrollable={false} />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search groups, leaders…"
          filterActive={sessionFilter !== "all"}
          filterLabel={sessionOptions.find((o) => o.value === sessionFilter)?.label}
          onOpenFilter={() => setFilterOpen(true)}
          trailingAction={{
            onPress: () => setCreateMenuOpen(true),
            accessibilityLabel: "Create group or project"}}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_COLLAB_COLOR.link}
          />
        }
      >
        {tabCounts.pending > 0 && menu !== "pending" ? (
          <Pressable
            style={[
              localStyles.nudgeBanner,
              {
                backgroundColor: semanticSoft(FACULTY_COLLAB_COLOR.nudge, tokens.isDark),
                borderColor: `${FACULTY_COLLAB_COLOR.nudge}33`,
              },
            ]}
            onPress={() => setMenu("pending")}
            accessibilityRole="button"
            accessibilityLabel={`${tabCounts.pending} group${tabCounts.pending === 1 ? "" : "s"} awaiting review`}
          >
            <Ionicons name="time-outline" size={18} color={FACULTY_COLLAB_COLOR.nudge} />
            <Text style={[type.caption, localStyles.nudgeText, { color: FACULTY_COLLAB_COLOR.nudge }]}>
              {tabCounts.pending} group{tabCounts.pending === 1 ? "" : "s"} awaiting review
            </Text>
            <Ionicons name="chevron-forward" size={16} color={FACULTY_COLLAB_COLOR.nudge} />
          </Pressable>
        ) : null}

        <FacultyFilterSheet
          visible={filterOpen}
          title="Filter by section"
          subtitle="Show groups from one section"
          options={sessionOptions}
          value={sessionFilter}
          onSelect={(v) => {
            setSessionFilter(v)
            setFilterOpen(false)
          }}
          onClose={() => setFilterOpen(false)}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={FACULTY_COLLAB_COLOR.link} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon={search.trim() ? "search-outline" : "people-circle-outline"}
            title={search.trim() ? "No matches" : "No groups"}
            body={
              search.trim()
                ? "Try a different search or reset your filters."
                : menu === "pending"
                  ? "No groups waiting for approval."
                  : menu === "rejected"
                    ? "No rejected groups."
                    : menu === "deleted"
                      ? "No deleted groups."
                      : "Use + in the search bar to create a group for a student, or wait for student submissions."
            }
          />
        ) : (
          <View style={localStyles.list}>
            {filtered.map((group, index) => (
              <FacultyGroupListCard
                key={group.id}
                group={group}
                index={index}
                acting={acting}
                onPress={() => setSelected(group)}
                onApprove={() =>
                  void runAction(async () => {
                    await instructorApi.approveGroup(scope!, group.id)
                  })
                }
                onReject={() =>
                  AppAlert.alert("Reject group?", `“${group.name}” will be denied and students can form a new group.`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reject",
                      style: "destructive",
                      onPress: () =>
                        void runAction(async () => {
                          await instructorApi.rejectGroup(scope!, group.id)
                        }),
                    },
                  ])
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FacultyGroupActionSheet
        visible={selected != null}
        scope={scope}
        group={selected}
        acting={acting}
        onClose={() => setSelected(null)}
        onApprove={(g) =>
          void runAction(async () => {
            await instructorApi.approveGroup(scope!, g.id)
          })
        }
        onReject={(g) =>
          AppAlert.alert("Reject group?", `“${g.name}” will be denied and students can form a new group.`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reject",
              style: "destructive",
              onPress: () =>
                void runAction(async () => {
                  await instructorApi.rejectGroup(scope!, g.id)
                }),
            },
          ])
        }
        onDelete={(g) =>
          void runAction(async () => {
            await instructorApi.deleteGroup(scope!, g.id)
          })
        }
        onRestore={(g) =>
          void runAction(async () => {
            await instructorApi.restoreGroup(scope!, g.id)
          })
        }
        onRemoveMember={(g, memberId) =>
          void runAction(
            async () => {
              await instructorApi.removeGroupMember(scope!, g.id, memberId)
            },
            { closeSheet: false, keepSelected: true },
          )
        }
      />

      <FacultyCollabCreateMenuSheet
        visible={createMenuOpen}
        onClose={() => setCreateMenuOpen(false)}
        onCreateGroup={() => setGroupCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
      />

      <FacultyGroupCreateModal
        visible={groupCreateOpen}
        scope={scope}
        onClose={() => setGroupCreateOpen(false)}
        onCreated={() => void load()}
      />

      <FacultyProjectCreateModal
        visible={projectCreateOpen}
        scope={scope}
        onClose={() => setProjectCreateOpen(false)}
        onCreated={() => {
          setProjectCreateOpen(false)
          router.push("/module/projects")
        }}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  nudgeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1},
  nudgeText: { flex: 1, fontSize: 14, fontWeight: "700" },
  list: { gap: 10 },
})
