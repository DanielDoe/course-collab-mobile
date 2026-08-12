import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  stripHtml,
  type ProjectRecord,
} from "../../lib/collaboration-api"
import {
  collabListThumb,
  collabProjectStatusAccent,
  collabProjectStatusIcon,
  collabStatusLabel,
} from "../../lib/collaboration-list-theme"
import { CollabListPlaceholder } from "./collab-shared"
import { useCollabTheme } from "./collab-module-ui"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { SignatureListCard } from "../theme/SignatureListCard"
import { signatureListStyles } from "../theme/TabbedModuleLayout"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type ProjectFilter = "all" | "approved" | "pending"

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All projects" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending review" },
] as const

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
  const summary = stripHtml(project.summary ?? "").slice(0, 100)
  const groupName = project.group?.name ?? "Group project"
  const metaParts = [
    project.target_platform,
    formatRelativeTime(project.created_at),
  ].filter(Boolean)

  return (
    <SignatureListCard
      index={index}
      title={project.title}
      subtitle={summary || groupName}
      meta={metaParts.join(" · ")}
      metaIcon="folder-outline"
      statusLabel={collabStatusLabel(project.status, "In review")}
      statusColor={collabProjectStatusAccent(project.status, thumb)}
      statusIcon={collabProjectStatusIcon(project.status)}
      icon="rocket-outline"
      accent={thumb.label}
      onPress={onPress}
    />
  )
}

export function ProjectsScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const theme = useCollabTheme()
  const type = useNativeType()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<ProjectFilter>("all")
  const [search, setSearch] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const res = await collaborationApi.getProjects(session)
      setProjects(res.projects ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load projects.")
      setProjects([])
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

  useNotificationModuleRefresh("projects", onRefresh)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const byStatus =
      filter === "all" ? projects : projects.filter((p) => (p.status ?? "").toLowerCase() === filter)
    if (!q) return byStatus
    return byStatus.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.group?.name ?? "").toLowerCase().includes(q) ||
        (p.target_platform ?? "").toLowerCase().includes(q),
    )
  }, [projects, filter, search])

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={onRefresh} error={error}>
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search projects…"
        filterActive={filter !== "all"}
        onOpenFilter={() => setFilterSheetOpen(true)}
        trailingAction={{
          onPress: () => router.push("/collaboration/projects/submit" as never),
          accessibilityLabel: "Submit project",
          icon: "add",
        }}
      />

      <StudentFilterSheet
        visible={filterSheetOpen}
        title="Project status"
        subtitle="Filter the class portfolio by review status."
        options={[...STATUS_FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as ProjectFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <Text style={[type.sectionHeader, styles.sectionLabel, { color: theme.primaryDark }]}>
        Class portfolio
      </Text>

      {filtered.length === 0 ? (
        <CollabListPlaceholder
          icon="folder-open-outline"
          title="No projects yet"
          body="Submitted projects from your class will show up here."
        />
      ) : (
        <View style={signatureListStyles.list}>
          {filtered.map((project, index) => (
            <ProjectListCard
              key={project.id}
              index={index}
              project={project}
              onPress={() => router.push(`/collaboration/projects/${project.id}` as never)}
            />
          ))}
        </View>
      )}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: 4,
  },
})
