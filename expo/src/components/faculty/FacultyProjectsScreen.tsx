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
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorProject, type InstructorSession } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useFacultyModuleStyles } from "../../lib/faculty-themed-ui"
import { useNativeType } from "../../lib/themed-module-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyProjectListCard } from "./FacultyCollabListCards"
import { useFacultyStickyHeaderScrollLayout,
  FacultyGroupedFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  type FacultyFilterOption} from "./faculty-module-shell"
import { FacultyCollabCreateMenuSheet } from "./FacultyCollabCreateMenuSheet"
import { FacultyGroupCreateModal } from "./FacultyGroupCreateModal"
import { FacultyProjectCreateModal } from "./FacultyProjectCreateModal"
import { FacultyProjectActionSheet } from "./FacultyProjectActionSheet"
import { FacultyProjectLeaderboard } from "./FacultyProjectLeaderboard"
import { FacultyProjectLeaderboardDetailSheet } from "./FacultyProjectLeaderboardDetailSheet"
import {
  FacultyProjectPresentationConfigPanel,
  FacultyProjectPresentationsPanel,
  FacultyProjectScoreProjectsPanel,
  FacultyProjectScoresOverviewPanel,
  FacultyProjectStudentGradesPanel,
} from "./FacultyProjectsModulePanels"
import type { ProjectLeaderboardEntry, ProjectLeaderboardStats } from "../../lib/instructor-api"
import { filterRowsToCourseSessions } from "../../lib/faculty-projects-module-utils"
import {
  facultySessionCodesForScope,
  fetchFacultyTermSessions,
  rowMatchesFacultySection,
  useFacultySectionFilter,
} from "../../lib/faculty-section-scope"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"

type ProjectModuleTab = "overview" | "score" | "leaderboard" | "manage" | "presentations" | "config" | "grades"
type StatusFilter = "all" | "pending" | "approved" | "rejected"
type PresentationStatusFilter = "all" | "scheduled" | "completed" | "cancelled"

const PROJECT_MODULE_TABS: Array<{ id: ProjectModuleTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "score", label: "Score" },
  { id: "leaderboard", label: "Board" },
  { id: "manage", label: "Manage" },
  { id: "presentations", label: "Slots" },
  { id: "config", label: "Config" },
  { id: "grades", label: "Grades" },
]

const PRESENTATION_STATUS_OPTIONS: FacultyFilterOption[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const STATUS_OPTIONS: FacultyFilterOption[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export function FacultyProjectsScreen() {
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 88 })
  const tokens = useAppThemeTokens()
  const styles = useFacultyModuleStyles()
  const type = useNativeType()
  const { scope, ready } = useFacultyScope()
  const { sessionFilter, setSessionFilter, apiSession } = useFacultySectionFilter(scope)

  const [tab, setTab] = useState<ProjectModuleTab>("overview")
  const [presentationStatusFilter, setPresentationStatusFilter] = useState<PresentationStatusFilter>("all")
  const [projects, setProjects] = useState<InstructorProject[]>([])
  const [leaderboard, setLeaderboard] = useState<ProjectLeaderboardEntry[]>([])
  const [leaderboardStats, setLeaderboardStats] = useState<ProjectLeaderboardStats | null>(null)
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [groupCreateOpen, setGroupCreateOpen] = useState(false)
  const [projectCreateOpen, setProjectCreateOpen] = useState(false)

  const [selected, setSelected] = useState<InstructorProject | null>(null)
  const [selectedLeaderboardEntry, setSelectedLeaderboardEntry] = useState<ProjectLeaderboardEntry | null>(null)

  const sessionOptions: FacultyFilterOption[] = useMemo(() => {
    const seen = new Set<string>()
    const unique = sessions.filter((s) => {
      if (seen.has(s.code)) return false
      seen.add(s.code)
      return true
    })
    return [{ value: "all", label: "All sections" }, ...unique.map((s) => ({ value: s.code, label: s.code }))]
  }, [sessions])

  const pendingCount = useMemo(
    () => projects.filter((p) => p.status === "pending" || p.status === "pending_update").length,
    [projects],
  )

  const load = useCallback(async () => {
    if (!scope) return
    const status =
      tab === "manage" && statusFilter === "pending"
        ? undefined
        : tab === "manage" && statusFilter !== "all"
          ? statusFilter
          : undefined
    const boardSession = tab === "leaderboard" ? apiSession : undefined
    const warnings: string[] = []
    const [projectResult, boardResult, sessionResult] = await Promise.allSettled([
      instructorApi.getProjects(scope, { session: apiSession, status }),
      tab === "leaderboard"
        ? instructorApi.getProjectLeaderboard(scope, { session: boardSession, limit: 50 })
        : Promise.resolve({ leaderboard: [] as ProjectLeaderboardEntry[], stats: undefined }),
      fetchFacultyTermSessions(scope),
    ])
    if (projectResult.status === "rejected") {
      throw projectResult.reason
    }
    setProjects(projectResult.value)
    if (boardResult.status === "fulfilled") {
      setLeaderboard(boardResult.value.leaderboard)
      setLeaderboardStats(boardResult.value.stats ?? null)
    } else {
      setLeaderboard([])
      setLeaderboardStats(null)
      warnings.push("Could not load the leaderboard.")
    }
    if (sessionResult.status === "fulfilled") {
      setSessions(sessionResult.value)
    } else {
      setSessions([])
      warnings.push("Could not load sections.")
    }
    setError(warnings.join(" "))
  }, [scope, apiSession, statusFilter, tab])

  useEffect(() => {
    if (!scope) return
    setProjects([])
    setLeaderboard([])
    setLeaderboardStats(null)
  }, [scope?.courseId, scope?.sessionId])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load projects."))
      .finally(() => setLoading(false))
  }, [ready, load])

  const filtered = useMemo(() => {
    let rows = projects.filter((project) => rowMatchesFacultySection(project.group ?? project, scope, sessionFilter))
    if (tab === "manage" && statusFilter === "pending") {
      rows = rows.filter((p) => p.status === "pending" || p.status === "pending_update")
    }
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.group?.name.toLowerCase().includes(q) ?? false) ||
        (p.leader?.full_name.toLowerCase().includes(q) ?? false),
    )
  }, [projects, search, tab, statusFilter, scope, sessionFilter])

  const courseSessionCodes = useMemo(
    () => facultySessionCodesForScope(scope, sessions),
    [scope, sessions],
  )

  const filteredLeaderboard = useMemo(() => {
    const scoped = filterRowsToCourseSessions(leaderboard, (entry) => entry.session, courseSessionCodes)
    if (!search.trim()) return scoped
    const q = search.trim().toLowerCase()
    return scoped.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        (entry.groupName ?? "").toLowerCase().includes(q) ||
        (entry.leaderName ?? "").toLowerCase().includes(q) ||
        (entry.session ?? "").toLowerCase().includes(q),
    )
  }, [leaderboard, search, courseSessionCodes])

  const pager = useFacultyListPager(filtered, `${tab}:${search}:${statusFilter}:${sessionFilter}`, "projects")

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh projects.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("projects", handleRefresh)

  async function runAction(action: () => Promise<unknown>, closeAfter = false) {
    setActing(true)
    setError("")
    try {
      await action()
      await load()
      if (closeAfter) setSelected(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.")
    } finally {
      setActing(false)
    }
  }

  if (!ready) {
    return (
      <FacultyEmptyState icon="folder-open-outline" title="Select a course" body="Project management requires an active course." />
    )
  }

  const tabItems = PROJECT_MODULE_TABS.map((item) => ({
    ...item,
    count: item.id === "manage" && pendingCount > 0 ? pendingCount : undefined,
  }))

  const filtersActive =
    tab === "presentations"
      ? presentationStatusFilter !== "all" || sessionFilter !== "all"
      : tab === "grades"
        ? sessionFilter !== "all"
        : statusFilter !== "all" || sessionFilter !== "all"

  function handleFilterSelect(groupId: string, value: string) {
    if (groupId === "status") {
      if (tab === "presentations") setPresentationStatusFilter(value as PresentationStatusFilter)
      else setStatusFilter(value as StatusFilter)
    }
    if (groupId === "section") setSessionFilter(value)
  }

  const filterGroups =
    tab === "presentations"
      ? [
          {
            id: "status",
            title: "Status",
            value: presentationStatusFilter,
            options: PRESENTATION_STATUS_OPTIONS,
          },
          {
            id: "section",
            title: "Section",
            value: sessionFilter,
            options: sessionOptions,
          },
        ]
      : tab === "grades" || tab === "leaderboard" || tab === "overview" || tab === "score"
        ? [
            {
              id: "section",
              title: "Section",
              value: sessionFilter,
              options: sessionOptions,
            },
          ]
        : [
            {
              id: "status",
              title: "Status",
              value: statusFilter,
              options: STATUS_OPTIONS,
            },
            {
              id: "section",
              title: "Section",
              value: sessionFilter,
              options: sessionOptions,
            },
          ]

  const searchPlaceholder =
    tab === "presentations"
      ? "Search presentations…"
      : tab === "grades"
        ? "Search students, groups…"
        : tab === "score"
          ? "Search approved projects…"
          : tab === "overview"
            ? "Search projects, groups…"
            : "Search projects, groups…"

  const showSearch = tab !== "config"
  const showCreate = tab === "manage"

  return (
    <View style={styles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={tab} onChange={setTab} scrollable />

        {showSearch ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            filterActive={filtersActive}
            filterLabel={
              sessionFilter !== "all"
                ? sessionOptions.find((o) => o.value === sessionFilter)?.label
                : tab === "manage" && statusFilter !== "all"
                  ? STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ??
                    (statusFilter === "pending" ? "Pending only" : undefined)
                  : tab === "presentations" && presentationStatusFilter !== "all"
                    ? PRESENTATION_STATUS_OPTIONS.find((o) => o.value === presentationStatusFilter)?.label
                    : undefined
            }
            onOpenFilter={() => setFilterSheetOpen(true)}
            trailingAction={
              showCreate
                ? {
                    onPress: () => setCreateMenuOpen(true),
                    accessibilityLabel: "Create group or project",
                  }
                : undefined
            }
          />
        ) : null}
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
        {showSearch && pendingCount > 0 && tab === "manage" && statusFilter !== "pending" ? (
          <Pressable
            style={[
              localStyles.nudgeBanner,
              {
                backgroundColor: semanticSoft(FACULTY_COLLAB_COLOR.nudge, tokens.isDark),
                borderColor: `${FACULTY_COLLAB_COLOR.nudge}33`,
              },
            ]}
            onPress={() => setStatusFilter("pending")}
            accessibilityRole="button"
            accessibilityLabel={`${pendingCount} project${pendingCount === 1 ? "" : "s"} awaiting review`}
          >
            <Ionicons name="time-outline" size={18} color={FACULTY_COLLAB_COLOR.nudge} />
            <Text style={[type.caption, localStyles.nudgeText, { color: FACULTY_COLLAB_COLOR.nudge }]}>
              {pendingCount} project{pendingCount === 1 ? "" : "s"} awaiting review
            </Text>
            <Ionicons name="chevron-forward" size={16} color={FACULTY_COLLAB_COLOR.nudge} />
          </Pressable>
        ) : null}

        <FacultyGroupedFilterSheet
          visible={filterSheetOpen}
          title={
            tab === "presentations"
              ? "Filter presentations"
              : tab === "grades"
                ? "Filter grades"
                : tab === "overview" || tab === "score"
                  ? "Filter scores"
                  : "Filter projects"
          }
          subtitle="Narrow by status or section."
          groups={filterGroups}
          onSelect={handleFilterSelect}
          onClose={() => setFilterSheetOpen(false)}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && (tab === "manage" || tab === "leaderboard") ? (
          <ActivityIndicator color={FACULTY_COLLAB_COLOR.link} style={{ marginTop: 32 }} />
        ) : tab === "overview" && scope ? (
          <FacultyProjectScoresOverviewPanel scope={scope} search={search} sessionFilter={sessionFilter} />
        ) : tab === "score" && scope ? (
          <FacultyProjectScoreProjectsPanel scope={scope} search={search} sessionFilter={sessionFilter} />
        ) : tab === "presentations" && scope ? (
          <FacultyProjectPresentationsPanel
            scope={scope}
            search={search}
            statusFilter={presentationStatusFilter}
            sessionCodes={courseSessionCodes}
          />
        ) : tab === "config" && scope ? (
          <FacultyProjectPresentationConfigPanel scope={scope} sessionCodes={courseSessionCodes} />
        ) : tab === "grades" && scope ? (
          <FacultyProjectStudentGradesPanel scope={scope} search={search} sessionFilter={sessionFilter} />
        ) : tab === "leaderboard" ? (
          filteredLeaderboard.length === 0 ? (
            <FacultyEmptyState
              icon={search.trim() ? "search-outline" : "trophy-outline"}
              title={search.trim() ? "No matches" : "No scores yet"}
              body={
                search.trim()
                  ? "Try a different search or reset your filters."
                  : "Leaderboard fills in as projects are scored."
              }
            />
          ) : (
            <FacultyProjectLeaderboard
              entries={filteredLeaderboard}
              stats={leaderboardStats}
              onSelect={setSelectedLeaderboardEntry}
            />
          )
        ) : tab === "manage" && filtered.length === 0 ? (
            <FacultyEmptyState
              icon="folder-open-outline"
              title={search.trim() ? "No matches" : "No projects"}
              body={
                search.trim()
                  ? "Try a different search or reset your filters."
                  : statusFilter === "pending"
                    ? "No projects waiting for approval."
                    : "Student team projects will appear here."
              }
            />
        ) : tab === "manage" ? (
          <View style={localStyles.list}>
            {pager.items.map((project, index) => (
              <FacultyProjectListCard
                key={project.id}
                project={project}
                index={index}
                acting={acting}
                onPress={() => setSelected(project)}
                onApprove={() => void runAction(() => instructorApi.approveProject(scope!, project.id), true)}
                onReview={() => setSelected(project)}
              />
            ))}
            <FacultyListPagerFooter pager={pager} />
          </View>
        ) : null}
      </ScrollView>

      <FacultyProjectLeaderboardDetailSheet
        visible={selectedLeaderboardEntry != null}
        scope={scope}
        entry={selectedLeaderboardEntry}
        onClose={() => setSelectedLeaderboardEntry(null)}
      />

      <FacultyProjectActionSheet
        visible={selected != null}
        scope={scope}
        project={selected}
        acting={acting}
        onClose={() => setSelected(null)}
        onUpdated={async () => {
          await load()
          if (selected && scope) {
            try {
              const { project } = await instructorApi.getProjectDetail(scope, selected.id)
              setSelected(project)
            } catch {
              /* keep current */
            }
          }
        }}
        onApprove={(project) => void runAction(() => instructorApi.approveProject(scope!, project.id), true)}
        onDelete={(project) =>
          void runAction(async () => {
            await instructorApi.deleteProject(scope!, project.id)
            setSelected(null)
          })
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
        onCreated={() => void load()}
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
