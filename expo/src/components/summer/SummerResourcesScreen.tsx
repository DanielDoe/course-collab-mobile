import { useMemo, useState } from "react"
import type { SummerResource, SummerTrainingResources } from "../../lib/summer-camp-api"
import { summerCampApi } from "../../lib/summer-camp-api"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerResourceActionSheet } from "./SummerResourceActionSheet"
import { SummerResourceListCard } from "./SummerResourceListCard"
import { useSummerLoader } from "./summer-module-hooks"

type ResourceFilter = "all" | "text" | "code" | "video" | "image_gallery"

const FILTER_OPTIONS = [
  { value: "all", label: "All resources" },
  { value: "text", label: "Reading" },
  { value: "code", label: "Code" },
  { value: "video", label: "Video" },
  { value: "image_gallery", label: "Gallery" },
] as const

type SelectedResource = {
  resource: SummerResource
  trainingTitle: string
}

function matchesResourceFilter(resource: SummerResource, filter: ResourceFilter): boolean {
  if (filter === "all") return true
  if (filter === "text") return resource.type === "text" || !resource.type
  return resource.type === filter
}

function filterTrainingResources(
  training: SummerTrainingResources,
  search: string,
  filter: ResourceFilter,
): SummerResource[] {
  return training.resources.filter((resource) => {
    if (!matchesResourceFilter(resource, filter)) return false
    return matchesSummerSearch(
      search,
      resource.title,
      resource.description,
      resource.module_title,
      training.training_title,
    )
  })
}

export function SummerResourcesScreen() {
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getResources)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<ResourceFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedResource | null>(null)

  const trainings = data?.trainings ?? []

  const filteredTrainings = useMemo(() => {
    return trainings
      .map((training) => ({
        ...training,
        resources: filterTrainingResources(training, search, filter),
      }))
      .filter((training) => training.resources.length > 0)
  }, [trainings, search, filter])

  const totalCount = useMemo(
    () => trainings.reduce((sum, training) => sum + training.resources.length, 0),
    [trainings],
  )
  const filteredCount = useMemo(
    () => filteredTrainings.reduce((sum, training) => sum + training.resources.length, 0),
    [filteredTrainings],
  )
  const filtersActive = filter !== "all"
  const queryActive = filtersActive || search.trim().length > 0

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search resources, modules, code…"
        filterActive={filtersActive}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />

      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Resource type"
        subtitle="Filter camp materials by format."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as ResourceFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <SummerSearchResultsBar
        visible={queryActive && totalCount > 0}
        shown={filteredCount}
        total={totalCount}
        query={search}
        onClear={() => {
          setSearch("")
          setFilter("all")
        }}
      />

      {!trainings.length ? (
        <FacultyEmptyState
          icon="library-outline"
          title="No resources yet"
          body="Camp resources will appear when your instructor publishes them."
        />
      ) : filteredTrainings.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search or reset your filters." />
      ) : (
        filteredTrainings.map((training) => (
          <ModuleSection key={training.training_id} title={training.training_title}>
            {training.resources.map((resource, index) => (
              <SummerResourceListCard
                key={resource.id}
                resource={resource}
                last={index === training.resources.length - 1}
                onPress={() =>
                  setSelected({
                    resource,
                    trainingTitle: training.training_title,
                  })
                }
              />
            ))}
          </ModuleSection>
        ))
      )}

      <SummerResourceActionSheet
        visible={selected != null}
        resource={selected?.resource ?? null}
        trainingTitle={selected?.trainingTitle}
        onClose={() => setSelected(null)}
      />
    </ModuleScreen>
  )
}
