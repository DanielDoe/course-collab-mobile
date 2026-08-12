import { useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { summerCampApi, type SummerProject } from "../../lib/summer-camp-api"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { summerModuleRoute } from "./summer-training-routes"
import {
  ModuleScreen,
  ModuleSection,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerProjectListCard } from "./SummerProjectListCard"
import { useSummerLoader } from "./summer-module-hooks"

type ProjectFilter = "all" | "not_started" | "in_progress" | "complete"

const FILTER_OPTIONS = [
  { value: "all", label: "All projects" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
] as const

function matchesFilter(project: SummerProject, filter: ProjectFilter): boolean {
  if (filter === "all") return true
  if (filter === "complete") return project.status === "complete" || project.is_complete
  if (filter === "in_progress") return project.status === "in_progress"
  return project.status === "not_started" && !project.is_complete
}

export function SummerProjectsScreen() {
  const router = useRouter()
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getProjects)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<ProjectFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const projects = data?.projects ?? []

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      if (!matchesFilter(project, filter)) return false
      return matchesSummerSearch(
        search,
        project.project_title,
        project.title,
        project.training_title,
        project.camp_title,
        project.instructor_name,
        project.badge_title,
        project.category,
      )
    })
  }, [projects, filter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, SummerProject[]>()
    for (const project of filtered) {
      const key = project.training_title || "Projects"
      const list = map.get(key) ?? []
      list.push(project)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [filtered])

  const filtersActive = filter !== "all"
  const queryActive = filtersActive || search.trim().length > 0

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search projects, camps, faculty…"
        filterActive={filtersActive}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />

      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Project status"
        subtitle="Filter capstone projects by progress."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as ProjectFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <SummerSearchResultsBar
        visible={queryActive && projects.length > 0}
        shown={filtered.length}
        total={projects.length}
        query={search}
        onClear={() => {
          setSearch("")
          setFilter("all")
        }}
      />

      {projects.length === 0 ? (
        <FacultyEmptyState
          icon="folder-open-outline"
          title="No projects yet"
          body="Advanced capstone projects unlock after you complete core camp modules."
        />
      ) : filtered.length === 0 ? (
        <FacultyEmptyState
          icon="search-outline"
          title="No matches"
          body="Try a different search or reset your filters."
        />
      ) : (
        grouped.map(([trainingTitle, items]) => (
          <ModuleSection key={trainingTitle} title={trainingTitle}>
            {items.map((project, index) => (
              <SummerProjectListCard
                key={project.module_id}
                project={project}
                last={index === items.length - 1}
                onPress={() =>
                  router.push(summerModuleRoute(project.training_id, project.module_id) as never)
                }
              />
            ))}
          </ModuleSection>
        ))
      )}
    </ModuleScreen>
  )
}
