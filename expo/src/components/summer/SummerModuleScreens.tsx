import { useMemo, useState } from "react"
import { summerCampApi } from "../../lib/summer-camp-api"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { SYSTEM } from "../../constants/faculty-native-theme"
import {
  FacultyEmptyState,
  ModuleListRow,
  ModuleScreen,
  ModuleSection,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
  semanticSoft,
} from "./summer-module-shell"
import { useSummerLoader } from "./summer-module-hooks"

export function SummerRoadmapScreen() {
  const tokens = useAppThemeTokens()
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getRoadmap)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "complete" | "pending">("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const roadmaps = useMemo(() => {
    return (data?.roadmaps ?? [])
      .map((roadmap) => ({
        ...roadmap,
        milestones: roadmap.milestones.filter((milestone) => {
          if (filter === "complete" && !milestone.is_complete) return false
          if (filter === "pending" && milestone.is_complete) return false
          return matchesSummerSearch(search, milestone.title, milestone.status, roadmap.training_title)
        }),
      }))
      .filter((roadmap) => roadmap.milestones.length > 0 || (!search.trim() && filter === "all"))
  }, [data?.roadmaps, search, filter])

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search milestones…"
        filterActive={filter !== "all"}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />
      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Milestone status"
        options={[
          { value: "all", label: "All milestones" },
          { value: "pending", label: "In progress" },
          { value: "complete", label: "Complete" },
        ]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as typeof filter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />
      {!data?.roadmaps.length ? (
        <FacultyEmptyState icon="map-outline" title="No roadmap yet" body="Enroll in a training to see your learning path." />
      ) : roadmaps.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search or filter." />
      ) : (
        roadmaps.map((roadmap) => (
          <ModuleSection key={roadmap.training_id} title={roadmap.training_title}>
            {roadmap.milestones.map((milestone, index, arr) => (
              <ModuleListRow
                key={milestone.id}
                icon={milestone.is_complete ? "checkmark-circle-outline" : "ellipse-outline"}
                iconBg={
                  milestone.is_complete
                    ? semanticSoft(tokens.success, tokens.isDark)
                    : semanticSoft(SYSTEM.gray.color, tokens.isDark)
                }
                iconColor={milestone.is_complete ? tokens.success : SYSTEM.gray.color}
                title={milestone.title}
                meta={milestone.status.replace(/_/g, " ")}
                last={index === arr.length - 1}
              />
            ))}
          </ModuleSection>
        ))
      )}
    </ModuleScreen>
  )
}
