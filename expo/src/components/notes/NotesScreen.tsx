import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { ScrollView } from "react-native-gesture-handler"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import { useThrottledFocusRefresh } from "../../lib/use-throttled-focus-refresh"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import type { StudentSession } from "../../lib/session"
import {
  digitalNotesApi,
  getCachedCourseNote,
  setCachedCourseNotes,
  type CourseDigitalNote,
  type StudentDigitalNote,
} from "../../lib/digital-notes-api"
import { noteContentPreviewText } from "../../lib/digital-note-content"
import { PillSwipeTabs } from "../theme/PillSwipeTabs"
import {
  StudentGroupedFilterSheet,
  StudentSearchToolbar,
  type StudentFilterGroup,
} from "../student/student-search-toolbar"
import { CommEmptyState, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { NoteListCard } from "./NoteListCard"
import { formatNoteWhen } from "./note-list-utils"
import { ModuleSection } from "../modules/ModuleScreen"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { NATIVE } from "../../constants/faculty-native-theme"
import { parseCircuitWorkspace, workspaceHasContent } from "../../lib/circuit-workspace"

type Tab = "mine" | "course"
type MineFilter = "all" | "owned" | "shared"
type NoteSort = "recent" | "title"
type NoteContentFilter = "all" | "typed" | "ink" | "both"

const MINE_FILTER_OPTIONS = [
  { value: "all", label: "All notes" },
  { value: "owned", label: "My notes" },
  { value: "shared", label: "Shared with me" },
] as const

const SORT_OPTIONS = [
  { value: "recent", label: "Most recent" },
  { value: "title", label: "Title A–Z" },
] as const

const CONTENT_FILTER_OPTIONS = [
  { value: "all", label: "All content" },
  { value: "typed", label: "Typed only" },
  { value: "ink", label: "Handwritten only" },
  { value: "both", label: "Typed + ink" },
] as const

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function notePreview(body: string): string {
  const text = noteContentPreviewText(body, 120)
  if (!text) return "No text yet"
  return text
}

export function NotesScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const scrollPad = useModuleScrollContentPadding()
  const insets = useSafeAreaInsets()

  const [tab, setTab] = useState<Tab>("mine")

  const [mineFilter, setMineFilter] = useState<MineFilter>("all")
  const [noteSort, setNoteSort] = useState<NoteSort>("recent")
  const [contentFilter, setContentFilter] = useState<NoteContentFilter>("all")
  const [search, setSearch] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [myNotes, setMyNotes] = useState<StudentDigitalNote[]>([])
  const [courseNotes, setCourseNotes] = useState<CourseDigitalNote[]>([])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    const [mineRes, courseRes] = await Promise.all([
      digitalNotesApi.listMyNotes(session),
      digitalNotesApi.listCourseNotes(session),
    ])
    setMyNotes(mineRes.notes ?? [])
    const courseList = courseRes.notes ?? []
    setCourseNotes(courseList)
    setCachedCourseNotes(courseList)
  }, [session])

  useNotificationModuleRefresh(["notes", "ai-notetaker"], load)

  useThrottledFocusRefresh(
    useCallback(async () => {
      if (!session) return
      setLoading(true)
      try {
        await load()
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load notes.")
      } finally {
        setLoading(false)
      }
    }, [session, load]),
    Boolean(session),
  )

  useEffect(() => {
    setFilterSheetOpen(false)
  }, [tab])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refresh failed.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const filteredMyNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    let next = myNotes.filter((note) => {
      if (mineFilter === "owned" && note.isOwner === false) return false
      if (mineFilter === "shared" && note.isOwner !== false) return false
      const hasTyped = note.bodyText.trim().length > 0
      const hasInk = workspaceHasContent(parseCircuitWorkspace(note.inkWorkspace))
      if (contentFilter === "typed" && !hasTyped) return false
      if (contentFilter === "ink" && !hasInk) return false
      if (contentFilter === "both" && !(hasTyped && hasInk)) return false
      if (!q) return true
      return (
        note.title.toLowerCase().includes(q) ||
        note.bodyText.toLowerCase().includes(q) ||
        (note.ownerName?.toLowerCase().includes(q) ?? false)
      )
    })

    next = [...next].sort((a, b) => {
      if (noteSort === "title") return a.title.localeCompare(b.title)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return next
  }, [myNotes, mineFilter, contentFilter, noteSort, search])

  const filteredCourseNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return courseNotes.filter((note) => {
      if (!q) return true
      return (
        note.title.toLowerCase().includes(q) ||
        note.bodyText.toLowerCase().includes(q) ||
        (note.topic?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [courseNotes, search])

  const groupedCourseNotes = useMemo(() => {
    const groups = new Map<string, CourseDigitalNote[]>()
    for (const note of filteredCourseNotes) {
      const key = note.topic?.trim() || "General"
      const bucket = groups.get(key) ?? []
      bucket.push(note)
      groups.set(key, bucket)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredCourseNotes])

  const mineFilterActive =
    mineFilter !== "all" || noteSort !== "recent" || contentFilter !== "all"
  const hasActiveQuery = Boolean(search.trim()) || (tab === "mine" && mineFilterActive)

  const mineFilterGroups = useMemo<StudentFilterGroup[]>(
    () => [
      {
        id: "ownership",
        title: "Show",
        value: mineFilter,
        options: [...MINE_FILTER_OPTIONS],
      },
      {
        id: "sort",
        title: "Sort",
        value: noteSort,
        options: [...SORT_OPTIONS],
      },
      {
        id: "content",
        title: "Content",
        value: contentFilter,
        options: [...CONTENT_FILTER_OPTIONS],
      },
    ],
    [mineFilter, noteSort, contentFilter],
  )

  async function createNote() {
    if (!session || creating) return
    setCreating(true)
    try {
      const res = await digitalNotesApi.createNote(session, {
        title: "Untitled note",
        bodyText: "",
      })
      const noteId = res.note?.id
      if (!noteId) {
        throw new ApiError("Server did not return the new note.", 500)
      }
      router.push(`/notes/${noteId}`)
    } catch (err) {
      AppAlert.alert("Create failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setCreating(false)
    }
  }

  function clearQuery() {
    setSearch("")
    setMineFilter("all")
    setNoteSort("recent")
    setContentFilter("all")
  }

  const searchPlaceholder = tab === "mine" ? "Search my notes…" : "Search course notes…"

  const pageScrollStyle = useMemo(
    () => ({
      paddingBottom: scrollPad.paddingBottom,
      gap: 12 as const,
      flexGrow: 1,
    }),
    [scrollPad.paddingBottom],
  )

  function renderResultsBar(forTab: Tab) {
    if (!hasActiveQuery) return null
    return (
      <View style={styles.resultsBar}>
        <Text style={[type.caption, styles.resultsText, { color: SN.secondaryLabel }]}>
          {forTab === "mine"
            ? `${filteredMyNotes.length} of ${myNotes.length} note${myNotes.length === 1 ? "" : "s"}`
            : `${filteredCourseNotes.length} of ${courseNotes.length} note${courseNotes.length === 1 ? "" : "s"}`}
          {search.trim() ? ` matching “${search.trim()}”` : ""}
        </Text>
        <Pressable onPress={clearQuery} hitSlop={8}>
          <Text style={[styles.clearBtn, { color: tokens.accent }]}>Clear</Text>
        </Pressable>
      </View>
    )
  }

  function renderMinePage() {
    if (loading && !refreshing) {
      return (
        <View style={styles.pageCenter}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading notes…</Text>
        </View>
      )
    }

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageScrollStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        directionalLockEnabled
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        {renderResultsBar("mine")}
        {filteredMyNotes.length === 0 ? (
          <CommEmptyState
            icon="document-text-outline"
            title={myNotes.length === 0 ? "No notes yet" : "No matches"}
            body={
              myNotes.length === 0
                ? "Tap + in the search bar to create a note, or wait for a classmate to share one with you."
                : "Try a different search term or reset your filters."
            }
          />
        ) : (
          <>
            <View style={styles.list}>
              {filteredMyNotes.map((note, index) => {
                const shared = note.isOwner === false
                return (
                  <NoteListCard
                    key={`mine-${note.id}-${shared ? "shared" : "own"}`}
                    title={note.title || "Untitled note"}
                    preview={notePreview(note.bodyText)}
                    contextLabel={shared ? `Shared by ${note.ownerName ?? "classmate"}` : undefined}
                    updatedLabel={formatNoteWhen(note.updatedAt)}
                    kind={shared ? "shared" : "personal"}
                    index={index}
                    onPress={() => router.push(`/notes/${note.id}`)}
                  />
                )
              })}
            </View>
            <CommSectionFooter>Tap a note to edit, or use filters to find shared notes.</CommSectionFooter>
          </>
        )}
      </ScrollView>
    )
  }

  function renderCoursePage() {
    if (loading && !refreshing) {
      return (
        <View style={styles.pageCenter}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading notes…</Text>
        </View>
      )
    }

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageScrollStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        directionalLockEnabled
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        {renderResultsBar("course")}
        {filteredCourseNotes.length === 0 ? (
          <CommEmptyState
            icon="book-outline"
            title={courseNotes.length === 0 ? "No course notes" : "No matches"}
            body={
              courseNotes.length === 0
                ? "Published instructor notes will appear here, grouped by topic when assigned."
                : "Try a different search term."
            }
          />
        ) : (
          <>
            {groupedCourseNotes.map(([topicName, topicNotes]) => (
              <ModuleSection key={topicName} title={topicName}>
                <View style={styles.list}>
                  {topicNotes.map((note, index) => (
                    <NoteListCard
                      key={`course-${note.id}`}
                      title={note.title || "Untitled note"}
                      preview={notePreview(note.bodyText)}
                      contextLabel={note.topic?.trim() || undefined}
                      updatedLabel={formatNoteWhen(note.updatedAt)}
                      kind="course"
                      index={index}
                      onPress={() => router.push(`/notes/course/${note.id}`)}
                    />
                  ))}
                </View>
              </ModuleSection>
            ))}
            <CommSectionFooter>Instructor notes are read-only. Open one to review content.</CommSectionFooter>
          </>
        )}
      </ScrollView>
    )
  }

  if (!session) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground, paddingBottom: insets.bottom }]}>
        <CommEmptyState
          icon="document-text-outline"
          title="Sign in required"
          body="Notes are available after you sign in as a student."
        />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View
        style={[
          styles.chrome,
          {
            paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding,
            paddingHorizontal: NATIVE.pagePadding,
          },
        ]}
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: native.secondaryGrouped }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}

        <StudentSearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          showFilter={tab === "mine"}
          filterActive={mineFilterActive}
          onOpenFilter={tab === "mine" ? () => setFilterSheetOpen(true) : undefined}
          trailingAction={
            tab === "mine"
              ? {
                  onPress: () => void createNote(),
                  accessibilityLabel: "Create note",
                  icon: "add",
                }
              : undefined
          }
        />
      </View>

      {tab === "mine" ? (
        <StudentGroupedFilterSheet
          visible={filterSheetOpen}
          title="My notes"
          subtitle="Filter by ownership, sort order, and content type."
          groups={mineFilterGroups}
          onSelect={(groupId, value) => {
            if (groupId === "ownership") setMineFilter(value as MineFilter)
            if (groupId === "sort") setNoteSort(value as NoteSort)
            if (groupId === "content") setContentFilter(value as NoteContentFilter)
          }}
          onClose={() => setFilterSheetOpen(false)}
        />
      ) : null}

      <PillSwipeTabs
        options={[
          { id: "mine", label: "My Notes", icon: "document-text-outline" },
          { id: "course", label: "Course Notes", icon: "book-outline" },
        ]}
        value={tab}
        onChange={setTab}
        pagePaddingHorizontal={NATIVE.pagePadding}
        pages={[renderMinePage(), renderCoursePage()]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  chrome: {
    gap: 12,
    paddingBottom: 4,
  },
  errorBox: {
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  pageScroll: {
    flex: 1,
  },
  pageCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  list: {
    gap: 10,
  },
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 2,
  },
  resultsText: { flex: 1, lineHeight: 18 },
  clearBtn: { fontSize: 13, fontWeight: "600" },
})
