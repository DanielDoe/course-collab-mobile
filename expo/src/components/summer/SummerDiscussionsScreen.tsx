import { useCallback, useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { appendNativeQuery, openWebPath } from "../../constants/module-web-paths"
import { getSummerWebPath } from "../../constants/summer-web-paths"
import { summerCampApi, type SummerDiscussion, type SummerDiscussionTab } from "../../lib/summer-camp-api"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  SummerSegmentNav,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerDiscussionActionSheet } from "./SummerDiscussionActionSheet"
import { SummerDiscussionListCard } from "./SummerDiscussionListCard"
import { useSummerLoader } from "./summer-module-hooks"

type DiscussionFilter = "all" | "open" | "resolved"

const TAB_OPTIONS = [
  { id: "my_questions" as const, label: "My Questions", icon: "help-circle-outline" as const },
  { id: "training" as const, label: "Training", icon: "chatbubbles-outline" as const },
  { id: "announcements" as const, label: "Announcements", icon: "megaphone-outline" as const },
  { id: "resolved" as const, label: "Resolved", icon: "checkmark-circle-outline" as const },
]

const FILTER_OPTIONS = [
  { value: "all", label: "All threads" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
] as const

function matchesFilter(discussion: SummerDiscussion, filter: DiscussionFilter, tab: SummerDiscussionTab): boolean {
  if (tab === "announcements" || tab === "resolved") return true
  if (filter === "all") return true
  if (filter === "resolved") return Boolean(discussion.is_resolved)
  return !discussion.is_resolved
}

function discussionWebPath(discussion: SummerDiscussion, tab: SummerDiscussionTab): string {
  const params = new URLSearchParams({
    id: String(discussion.id),
    tab,
  })
  return `${getSummerWebPath("discussions")}?${params.toString()}`
}

function emptyCopy(tab: SummerDiscussionTab): {
  title: string
  body: string
  icon: keyof typeof Ionicons.glyphMap
} {
  switch (tab) {
    case "training":
      return {
        icon: "chatbubbles-outline",
        title: "No training threads yet",
        body: "Questions from your camp cohort will show up here.",
      }
    case "announcements":
      return {
        icon: "megaphone-outline",
        title: "No announcements yet",
        body: "Instructor updates from your camp faculty will appear here.",
      }
    case "resolved":
      return {
        icon: "checkmark-circle-outline",
        title: "No resolved threads",
        body: "Questions marked resolved by faculty or peers will appear here.",
      }
    default:
      return {
        icon: "help-circle-outline",
        title: "No questions yet",
        body: "Ask your first question to get help from camp faculty and peers.",
      }
  }
}

export function SummerDiscussionsScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<SummerDiscussionTab>("my_questions")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<DiscussionFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selected, setSelected] = useState<SummerDiscussion | null>(null)

  const fetchDiscussions = useCallback(
    (studentId: string) => summerCampApi.getDiscussions(studentId, tab),
    [tab],
  )
  const { data, loading, refreshing, error, refresh } = useSummerLoader(fetchDiscussions)

  const discussions = data?.discussions ?? []

  const filtered = useMemo(() => {
    return discussions.filter((discussion) => {
      if (!matchesFilter(discussion, filter, tab)) return false
      return matchesSummerSearch(
        search,
        discussion.title,
        discussion.body,
        discussion.description,
        discussion.author_name,
        discussion.training_title,
        discussion.module_title,
      )
    })
  }, [discussions, filter, search, tab])

  const filtersActive = filter !== "all" && tab !== "announcements" && tab !== "resolved"
  const queryActive = filtersActive || search.trim().length > 0
  const empty = emptyCopy(tab)

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSegmentNav tabs={TAB_OPTIONS} tab={tab} onChange={setTab} theme="student" />

      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={
          tab === "announcements"
            ? "Search announcements…"
            : tab === "resolved"
              ? "Search resolved threads…"
              : "Search discussions…"
        }
        filterActive={filtersActive}
        onOpenFilter={
          tab === "announcements" || tab === "resolved" ? undefined : () => setFilterSheetOpen(true)
        }
        showFilter={tab !== "announcements" && tab !== "resolved"}
        trailingAction={{
          onPress: () => openWebPath(router, appendNativeQuery(`${getSummerWebPath("discussions")}?new=1`)),
          accessibilityLabel: "Ask a question",
          icon: "add",
        }}
      />

      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Thread status"
        subtitle="Filter questions by resolution status."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as DiscussionFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <SummerSearchResultsBar
        visible={queryActive && discussions.length > 0}
        shown={filtered.length}
        total={discussions.length}
        query={search}
        onClear={() => {
          setSearch("")
          setFilter("all")
        }}
      />

      {!discussions.length ? (
        <FacultyEmptyState icon={empty.icon} title={empty.title} body={empty.body} />
      ) : filtered.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search or reset your filters." />
      ) : (
        <ModuleSection>
          {filtered.map((discussion, index) => (
            <SummerDiscussionListCard
              key={`${tab}-${discussion.id}`}
              discussion={discussion}
              last={index === filtered.length - 1}
              onPress={() => setSelected(discussion)}
            />
          ))}
        </ModuleSection>
      )}

      <SummerDiscussionActionSheet
        visible={selected != null}
        discussion={selected}
        tab={tab}
        onClose={() => setSelected(null)}
        onOpenWeb={(discussion) => {
          setSelected(null)
          openWebPath(router, appendNativeQuery(discussionWebPath(discussion, tab)))
        }}
      />
    </ModuleScreen>
  )
}
