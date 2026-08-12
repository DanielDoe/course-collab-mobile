import { useMemo, useState } from "react"
import { View } from "react-native"
import type { SummerCheckpoint } from "../../lib/summer-camp-api"
import { summerCampApi } from "../../lib/summer-camp-api"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  ModuleSectionHeader,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerCheckpointActionSheet } from "./SummerCheckpointActionSheet"
import { SummerCheckpointListCard } from "./SummerCheckpointListCard"
import { useSummerLoader } from "./summer-module-hooks"

type CheckpointFilter = "all" | "pending" | "approved"
type CheckpointVariant = "pending" | "approved"

type SelectedCheckpoint = {
  checkpoint: SummerCheckpoint
  variant: CheckpointVariant
}

const FILTER_OPTIONS = [
  { value: "all", label: "All checkpoints" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
] as const

export function SummerCheckpointsScreen() {
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getCheckpoints)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<CheckpointFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedCheckpoint | null>(null)

  const pending = useMemo(
    () =>
      (data?.pending ?? []).filter((item) =>
        matchesSummerSearch(
          search,
          item.content.title,
          item.content.description,
          item.module_title,
          item.training_title,
        ),
      ),
    [data?.pending, search],
  )

  const approved = useMemo(
    () =>
      (data?.approved ?? []).filter((item) =>
        matchesSummerSearch(
          search,
          item.content.title,
          item.content.description,
          item.module_title,
          item.training_title,
        ),
      ),
    [data?.approved, search],
  )

  const totalCount = (data?.pending.length ?? 0) + (data?.approved.length ?? 0)
  const filteredCount =
    (filter === "all" || filter === "pending" ? pending.length : 0) +
    (filter === "all" || filter === "approved" ? approved.length : 0)
  const filtersActive = filter !== "all"
  const queryActive = filtersActive || search.trim().length > 0
  const showPending = filter === "all" || filter === "pending"
  const showApproved = filter === "all" || filter === "approved"

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search checkpoints…"
        filterActive={filtersActive}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />

      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Checkpoint status"
        subtitle="Filter submissions by review status."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as CheckpointFilter)
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

      {!data?.pending.length && !data?.approved.length ? (
        <FacultyEmptyState
          icon="cloud-upload-outline"
          title="No checkpoints"
          body="Checkpoint assignments will appear here."
        />
      ) : filteredCount === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search or reset your filters." />
      ) : (
        <>
          {showPending && pending.length ? (
            <View style={{ gap: 8 }}>
              <ModuleSectionHeader title="Pending" />
              <ModuleSection>
                {pending.map((item, index, arr) => (
                  <SummerCheckpointListCard
                    key={item.block_id}
                    checkpoint={item}
                    variant="pending"
                    last={index === arr.length - 1}
                    onPress={() => setSelected({ checkpoint: item, variant: "pending" })}
                  />
                ))}
              </ModuleSection>
            </View>
          ) : null}

          {showApproved && approved.length ? (
            <View style={{ gap: 8 }}>
              <ModuleSectionHeader title="Approved" />
              <ModuleSection>
                {approved.map((item, index, arr) => (
                  <SummerCheckpointListCard
                    key={`approved-${item.block_id}`}
                    checkpoint={item}
                    variant="approved"
                    last={index === arr.length - 1}
                    onPress={() => setSelected({ checkpoint: item, variant: "approved" })}
                  />
                ))}
              </ModuleSection>
            </View>
          ) : null}
        </>
      )}

      <SummerCheckpointActionSheet
        visible={selected != null}
        checkpoint={selected?.checkpoint ?? null}
        variant={selected?.variant ?? "pending"}
        onClose={() => setSelected(null)}
      />
    </ModuleScreen>
  )
}
