import { useState } from "react"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"

export type AssessmentFilter = "all" | "open" | "done"

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
] as const

type Props = {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  filter: AssessmentFilter
  onFilterChange: (filter: AssessmentFilter) => void
  openIssueCount?: number
  onOpenIssues: () => void
}

export function AssessmentFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  filter,
  onFilterChange,
  openIssueCount = 0,
  onOpenIssues,
}: Props) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  return (
    <>
      <StudentSearchToolbar
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        filterActive={filter !== "all"}
        onOpenFilter={() => setFilterSheetOpen(true)}
        trailingAction={{
          onPress: onOpenIssues,
          accessibilityLabel: "Issues and comments",
          icon: "add",
          badgeCount: openIssueCount,
        }}
      />

      <StudentFilterSheet
        visible={filterSheetOpen}
        title="Status"
        subtitle="Show all assessments or narrow by availability."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          onFilterChange(value as AssessmentFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />
    </>
  )
}
