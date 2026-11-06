import { useCallback, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { AppButton } from "../theme/AppButton"
import { LectureListCard } from "./LectureListCard"
import { useSession } from "../../context/SessionProvider"
import { ApiError, type LectureItem } from "../../lib/student-api"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import type { StudentSession } from "../../lib/session"
import { useStudentLectures } from "../../hooks/query/useStudentLectures"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import {
  formatLectureIndexLabel,
  lectureDisplayTitle,
  lectureListDisplayTitle,
  matchesLectureFilter,
  type LectureFilter,
} from "./lecture-list-utils"
import { NotificationListPager } from "../faculty/faculty-notifications-ui"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function openLectureViewer(
  router: ReturnType<typeof useRouter>,
  lectureId: number,
  week: number,
) {
  router.push({
    pathname: "/lecture/[week]",
    params: { week: String(week), lectureId: String(lectureId) },
  } as never)
}

const FILTER_OPTIONS: Array<{ value: LectureFilter; label: string }> = [
  { value: "all", label: "All lectures" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In progress" },
  { value: "available", label: "Not started" },
  { value: "locked", label: "Locked" },
]

export function LecturesScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const courseCode = session?.courseCode ?? null

  const listQuery = useStudentLectures(session)
  const lectures = listQuery.lectures
  const loading = listQuery.isInitialLoading
  const refreshing = listQuery.isRefreshing && !listQuery.isInitialLoading
  const error = listQuery.error instanceof ApiError ? listQuery.error.message : listQuery.error ? "Failed to load lectures." : ""
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<LectureFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const isFiltering = search.trim().length > 0 || filter !== "all"

  const onRefresh = useCallback(async () => {
    await listQuery.refetch()
  }, [listQuery.refetch])

  useNotificationModuleRefresh("lectures", onRefresh)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return lectures.filter((lecture) => {
      if (!matchesLectureFilter(lecture, filter)) return false
      if (!q) return true
      return (
        lecture.title.toLowerCase().includes(q) ||
        lectureDisplayTitle(lecture, courseCode).toLowerCase().includes(q) ||
        lectureListDisplayTitle(lecture, lectures, courseCode).toLowerCase().includes(q) ||
        formatLectureIndexLabel(lecture.week, { title: lecture.title, courseCode })
          .toLowerCase()
          .includes(q) ||
        String(lecture.week).includes(q)
      )
    })
  }, [lectures, search, filter, courseCode])

  const pager = useFacultyListPager(filtered, `${search}|${filter}`, "lectures", { preset: "lecture" })

  function openSlides(lecture: LectureItem) {
    openLectureViewer(router, lecture.id, lecture.week)
  }

  return (
    <ModuleScreen
      loading={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      /* A filtered miss keeps the toolbar mounted so the search can be cleared;
         ModuleScreen's empty state would replace it and trap the student. */
      empty={!loading && filtered.length === 0 && !isFiltering}
      emptyTitle="No lectures posted"
    >
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search lectures…"
        showFilter
        filterActive={filter !== "all"}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />

      <StudentFilterSheet
        visible={filterSheetOpen}
        title="Filter lectures"
        subtitle="Show lectures by viewing progress."
        options={FILTER_OPTIONS}
        value={filter}
        onSelect={(value) => {
          setFilter(value as LectureFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <QueryRefreshBanner visible={listQuery.refreshFailed} onRetry={() => void onRefresh()} />
      {loading ? (
        <QuerySkeleton />
      ) : filtered.length === 0 ? (
        <FacultyEmptyState
          icon="search-outline"
          title="No matching lectures"
          body="Nothing matches your search or filter."
          action={
            <AppButton
              label="Clear search"
              variant="secondary"
              size="sm"
              fullWidth={false}
              icon="close-circle-outline"
              iconPosition="left"
              onPress={() => {
                setSearch("")
                setFilter("all")
              }}
            />
          }
        />
      ) : (
        <View style={styles.list}>
          {pager.items.map((lecture, index) => (
            <LectureListCard
              key={lecture.id}
              lecture={lecture}
              courseCode={courseCode}
              index={pager.page * pager.pageSize + index}
              siblings={filtered}
              onPress={() => openSlides(lecture)}
            />
          ))}
          <NotificationListPager page={pager.page} pageCount={pager.pageCount} onPageChange={pager.setPage} />
        </View>
      )}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
})
