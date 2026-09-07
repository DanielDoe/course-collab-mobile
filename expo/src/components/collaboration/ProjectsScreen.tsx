import { useCallback, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  formatRelativeTime,
  stripHtml,
  type GroupRecord,
  type ProjectRecord,
} from "../../lib/collaboration-api"
import { useStudentProjects } from "../../hooks/query/useStudentProjects"
import { useStudentGroups } from "../../hooks/query/useStudentGroups"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import {
  collabListThumb,
  collabProjectStatusAccent,
  collabProjectStatusIcon,
  collabStatusLabel,
} from "../../lib/collaboration-list-theme"
import { CollabSearch } from "./collab-shared"
import { CommEmptyState, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { AppButton } from "../theme/AppButton"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"
import { ModuleSectionHeader } from "../modules/ModuleScreen"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type ProjectTab = "all" | "mine" | "approved"

function isMyGroup(group: GroupRecord, student: StudentSession): boolean {
  if (Number(group.created_by) === Number(student.databaseId)) return true
  if (String(group.leader_student_id) === String(student.id)) return true
  return (group.members ?? []).some(
    (member) =>
      String(member.id) === String(student.databaseId) ||
      String(member.student_id) === String(student.id),
  )
}

function isMyProject(project: ProjectRecord, student: StudentSession, myGroupIds: Set<number>): boolean {
  const groupId = project.group_id ?? project.group?.id
  if (groupId != null && myGroupIds.has(groupId)) return true
  if (Number(project.group?.created_by) === Number(student.databaseId)) return true
  if (project.leader?.id != null && Number(project.leader.id) === Number(student.databaseId)) return true
  if (project.leader?.student_id && String(project.leader.student_id) === String(student.id)) return true
  return (project.members ?? []).some((member) => String(member.id) === String(student.databaseId))
}

function canLeadSubmit(groups: GroupRecord[], student: StudentSession): boolean {
  return groups.some(
    (group) => Number(group.created_by) === Number(student.databaseId) && group.status === "approved",
  )
}

function ProjectListCard({
  project,
  index,
  onPress,
}: {
  project: ProjectRecord
  index: number
  onPress: () => void
}) {
  const thumb = collabListThumb(index)
  const summary = stripHtml(project.summary ?? "").slice(0, 90)
  const groupName = project.group?.name ?? "Group project"
  const metaParts = [
    project.target_platform,
    project.leader?.full_name ? `Led by ${project.leader.full_name}` : null,
    formatRelativeTime(project.created_at),
  ].filter(Boolean)

  return (
    <SignatureListCard
      index={index}
      title={project.title}
      subtitle={summary || groupName}
      meta={metaParts.join(" · ") || groupName}
      metaIcon="people-outline"
      statusLabel={collabStatusLabel(project.status, "In review")}
      statusColor={collabProjectStatusAccent(project.status, thumb)}
      statusIcon={collabProjectStatusIcon(project.status)}
      icon="rocket-outline"
      accent={thumb.label}
      onPress={onPress}
    />
  )
}

function ProjectGettingStarted({
  canSubmit,
  onFindGroup,
  onSubmit,
}: {
  canSubmit: boolean
  onFindGroup: () => void
  onSubmit: () => void
}) {
  return (
    <View style={signatureListStyles.list}>
      <SignatureListCard
        index={0}
        title="Join a group"
        subtitle="Team projects are submitted by an approved group of up to four."
        meta="Groups · Collaboration"
        metaIcon="people-outline"
        icon="people-outline"
        accent={collabListThumb(0).label}
        onPress={onFindGroup}
      />
      <SignatureListCard
        index={1}
        title={canSubmit ? "Submit your project" : "Submit after your group is approved"}
        subtitle="Leaders send a title, summary, and deliverables for instructor review."
        meta="Group leaders"
        metaIcon="rocket-outline"
        icon="rocket-outline"
        accent={collabListThumb(1).label}
        onPress={canSubmit ? onSubmit : onFindGroup}
      />
      <SignatureListCard
        index={2}
        title="Vote on approved work"
        subtitle="Once faculty approve a project, it joins the class portfolio."
        meta="Class portfolio"
        metaIcon="star-outline"
        icon="star-outline"
        accent={collabListThumb(2).label}
        showChevron={false}
      />
    </View>
  )
}

export function ProjectsScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const projectsQuery = useStudentProjects(session)
  const groupsQuery = useStudentGroups(session)
  const projects = projectsQuery.projects
  const groups = groupsQuery.groups
  const loading = projectsQuery.isInitialLoading
  const refreshing = projectsQuery.isRefreshing && !projectsQuery.isInitialLoading
  const error = projectsQuery.error instanceof ApiError
    ? projectsQuery.error.message
    : projectsQuery.error
      ? "Failed to load projects."
      : ""
  const [tab, setTab] = useState<ProjectTab>("all")
  const [search, setSearch] = useState("")

  const onRefresh = useCallback(async () => {
    await Promise.all([projectsQuery.refetch(), groupsQuery.refetch()])
  }, [projectsQuery.refetch, groupsQuery.refetch])

  useNotificationModuleRefresh("projects", onRefresh)

  const myGroupIds = useMemo(() => {
    if (!session) return new Set<number>()
    return new Set(groups.filter((group) => isMyGroup(group, session)).map((group) => group.id))
  }, [groups, session])

  const mine = useMemo(() => {
    if (!session) return []
    return projects.filter((project) => isMyProject(project, session, myGroupIds))
  }, [projects, session, myGroupIds])

  const approved = useMemo(
    () => projects.filter((project) => (project.status ?? "").toLowerCase() === "approved"),
    [projects],
  )

  const leadCanSubmit = Boolean(session && canLeadSubmit(groups, session))

  const navTabs = useMemo(
    () => [
      { id: "all" as const, label: "All", icon: "grid-outline" as const },
      { id: "mine" as const, label: "Mine", icon: "person-outline" as const },
      { id: "approved" as const, label: "Live", icon: "star-outline" as const },
    ],
    [],
  )

  const openGroups = useCallback(() => {
    router.push("/module/groups" as never)
  }, [router])

  const openSubmit = useCallback(() => {
    router.push("/collaboration/projects/submit" as never)
  }, [router])

  function sourceFor(tabId: ProjectTab): ProjectRecord[] {
    if (tabId === "mine") return mine
    if (tabId === "approved") return approved
    return projects
  }

  function filterProjects(tabId: ProjectTab): ProjectRecord[] {
    const visible = sourceFor(tabId)
    const query = search.trim().toLowerCase()
    if (!query) return visible
    return visible.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        (project.group?.name ?? "").toLowerCase().includes(query) ||
        (project.target_platform ?? "").toLowerCase().includes(query) ||
        (project.leader?.full_name ?? "").toLowerCase().includes(query),
    )
  }

  const allProjectsFiltered = useMemo(() => filterProjects("all"), [projects, mine, approved, search])
  const mineProjectsFiltered = useMemo(() => filterProjects("mine"), [projects, mine, approved, search])
  const approvedProjectsFiltered = useMemo(() => filterProjects("approved"), [projects, mine, approved, search])

  const allProjectsPager = useFacultyListPager(allProjectsFiltered, `all:${search}`, "projects")
  const mineProjectsPager = useFacultyListPager(mineProjectsFiltered, `mine:${search}`, "projects")
  const approvedProjectsPager = useFacultyListPager(approvedProjectsFiltered, `approved:${search}`, "projects")

  function projectsPager(tabId: ProjectTab) {
    if (tabId === "mine") return mineProjectsPager
    if (tabId === "approved") return approvedProjectsPager
    return allProjectsPager
  }

  function emptyCopy(tabId: ProjectTab, searching: boolean): { title: string; body: string } {
    if (searching) {
      return { title: "No matching projects", body: "Try a different name, group, or platform." }
    }
    if (tabId === "mine") {
      return {
        title: "No project from your group yet",
        body: leadCanSubmit
          ? "You’re a group leader — submit a proposal for instructor review."
          : "Join or create an approved group, then the leader can submit your project.",
      }
    }
    if (tabId === "approved") {
      return {
        title: "Nothing live yet",
        body: "Approved class projects will show up here for voting.",
      }
    }
    return {
      title: "No class projects yet",
      body: "Your section’s team projects will land here after groups submit them.",
    }
  }

  function footerCopy(tabId: ProjectTab, count: number): string {
    if (tabId === "mine") return "Projects from groups you belong to"
    if (tabId === "approved") return "Faculty-approved work · Vote from a project’s page"
    if (count === 0) return "Team projects for your section · Submit after your group is approved"
    if (count === 1) return "1 project in your section"
    return `${count} projects in your section`
  }

  function renderPage(tabId: ProjectTab) {
    const filtered = filterProjects(tabId)
    const pager = projectsPager(tabId)
    const searching = search.trim().length > 0
    const showGettingStarted = tabId === "all" && !searching && projects.length === 0

    if (showGettingStarted) {
      return (
        <>
          <ModuleSectionHeader title="Get started" />
          <ProjectGettingStarted
            canSubmit={leadCanSubmit}
            onFindGroup={openGroups}
            onSubmit={openSubmit}
          />
          <CommSectionFooter>{footerCopy(tabId, 0)}</CommSectionFooter>
        </>
      )
    }

    if (filtered.length === 0) {
      const copy = emptyCopy(tabId, searching)
      return (
        <>
          <CommEmptyState icon="rocket-outline" title={copy.title} body={copy.body} />
          {!searching && tabId === "mine" ? (
            <View style={styles.emptyAction}>
              <AppButton
                label={leadCanSubmit ? "Submit project" : "Find a group"}
                icon={leadCanSubmit ? "cloud-upload-outline" : "people-outline"}
                iconPosition="left"
                onPress={leadCanSubmit ? openSubmit : openGroups}
              />
            </View>
          ) : null}
          <CommSectionFooter>{footerCopy(tabId, sourceFor(tabId).length)}</CommSectionFooter>
        </>
      )
    }

    return (
      <>
        <View style={signatureListStyles.list}>
          {pager.items.map((project, index) => (
            <ProjectListCard
              key={project.id}
              index={pager.page * pager.pageSize + index}
              project={project}
              onPress={() => router.push(`/collaboration/projects/${project.id}` as never)}
            />
          ))}
        </View>
        <FacultyListPagerFooter pager={pager} />
        <CommSectionFooter>{footerCopy(tabId, filtered.length)}</CommSectionFooter>
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
      tab={tab}
      onTabChange={setTab}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      error={error}
      chrome={
        <>
          <QueryRefreshBanner visible={projectsQuery.refreshFailed} onRetry={() => void onRefresh()} />
          <CollabSearch
            value={search}
            onChange={setSearch}
            placeholder="Search projects…"
            trailingAction={{
              onPress: openSubmit,
              accessibilityLabel: "Submit project",
              icon: "add",
            }}
          />
        </>
      }
      pages={[renderPage("all"), renderPage("mine"), renderPage("approved")]}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyAction: { marginTop: 8 },
})
