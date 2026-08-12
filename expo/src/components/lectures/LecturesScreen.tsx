import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { LectureListCard } from "./LectureListCard"
import { useSession } from "../../context/SessionProvider"
import { ApiError, studentApi, type LectureItem } from "../../lib/student-api"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import type { StudentSession } from "../../lib/session"
import {
  formatCourseLabel,
  matchesLectureFilter,
  type LectureFilter,
} from "./lecture-list-utils"

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
  const courseLabel = formatCourseLabel(session)

  const [lectures, setLectures] = useState<LectureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<LectureFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await studentApi.getLectures(session)
      setLectures(data.lectures ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load lectures.")
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("lectures", onRefresh)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return lectures.filter((lecture) => {
      if (!matchesLectureFilter(lecture, filter)) return false
      if (!q) return true
      return (
        lecture.title.toLowerCase().includes(q) ||
        String(lecture.week).includes(q) ||
        courseLabel.toLowerCase().includes(q)
      )
    })
  }, [lectures, search, filter, courseLabel])

  function openSlides(lecture: LectureItem) {
    openLectureViewer(router, lecture.id, lecture.week)
  }

  return (
    <ModuleScreen
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      empty={!loading && filtered.length === 0}
      emptyTitle={search.trim() || filter !== "all" ? "No matching lectures" : "No lectures posted"}
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

      <View style={styles.list}>
        {filtered.map((lecture, index) => (
          <LectureListCard
            key={lecture.id}
            lecture={lecture}
            courseLabel={courseLabel}
            index={index}
            onPress={() => openSlides(lecture)}
          />
        ))}
      </View>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
})
