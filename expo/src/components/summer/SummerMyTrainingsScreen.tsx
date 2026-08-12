import { useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { summerCampApi, type SummerTrainingEnrollment } from "../../lib/summer-camp-api"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerTrainingListCard } from "./SummerTrainingListCard"
import { useSummerLoader, useSummerStudentId } from "./summer-module-hooks"

type TrainingFilter = "all" | "in_progress" | "complete" | "not_started"

const FILTER_OPTIONS = [
  { value: "all", label: "All trainings" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "not_started", label: "Not started" },
] as const

function matchesFilter(training: SummerTrainingEnrollment, filter: TrainingFilter): boolean {
  const pct = training.percent ?? 0
  if (filter === "all") return true
  if (filter === "complete") return pct >= 100
  if (filter === "in_progress") return pct > 0 && pct < 100
  return pct <= 0
}

export function SummerMyTrainingsScreen() {
  const router = useRouter()
  const studentId = useSummerStudentId()
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getMyTrainings)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<TrainingFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const trainings = data?.trainings ?? []

  const filtered = useMemo(() => {
    return trainings.filter((training) => {
      if (!matchesFilter(training, filter)) return false
      return matchesSummerSearch(
        search,
        training.training_title,
        training.training_description,
        training.camp_title,
        training.status,
      )
    })
  }, [trainings, filter, search])

  const filtersActive = filter !== "all"
  const queryActive = filtersActive || search.trim().length > 0

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search trainings, camps, faculty…"
        filterActive={filtersActive}
        onOpenFilter={() => setFilterSheetOpen(true)}
        trailingAction={{
          onPress: () => router.push("/module/browse-trainings" as never),
          accessibilityLabel: "Browse trainings",
          icon: "add",
        }}
      />

      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Training status"
        subtitle="Filter enrolled camp tracks by progress."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as TrainingFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <SummerSearchResultsBar
        visible={queryActive && trainings.length > 0}
        shown={filtered.length}
        total={trainings.length}
        query={search}
        onClear={() => {
          setSearch("")
          setFilter("all")
        }}
      />

      {trainings.length === 0 ? (
        <FacultyEmptyState
          icon="school-outline"
          title="No trainings enrolled"
          body="Browse camp tracks to join your first summer training."
        />
      ) : filtered.length === 0 ? (
        <FacultyEmptyState
          icon="search-outline"
          title="No matches"
          body="Try a different search or reset your filters."
        />
      ) : (
        <ModuleSection>
          {filtered.map((training, index) => (
            <SummerTrainingListCard
              key={training.enrollment_id}
              training={training}
              studentId={studentId}
              last={index === filtered.length - 1}
            />
          ))}
        </ModuleSection>
      )}
    </ModuleScreen>
  )
}
