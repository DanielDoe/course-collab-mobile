import { useMemo, useState } from "react"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { formatAssessmentType } from "./assessment-config"

type Props = {
  search: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  types: string[]
}

export function HistoryFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  types,
}: Props) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const filterOptions = useMemo(
    () => [
      { value: "all", label: "All types" },
      ...types.map((t) => ({ value: t, label: formatAssessmentType(t) })),
    ],
    [types],
  )

  return (
    <>
      <StudentSearchToolbar
        value={search}
        onChange={onSearchChange}
        placeholder="Search history…"
        filterActive={typeFilter !== "all"}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />

      <StudentFilterSheet
        visible={filterSheetOpen}
        title="Assessment type"
        subtitle="Filter history by quiz, homework, exam, or show everything."
        options={filterOptions}
        value={typeFilter}
        onSelect={(value) => {
          onTypeFilterChange(value)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />
    </>
  )
}
