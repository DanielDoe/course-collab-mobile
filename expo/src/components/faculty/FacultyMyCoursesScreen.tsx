import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { persistFacultyCourse } from "../../hooks/useFacultyShellRefresh"
import { instructorAdminApi } from "../../lib/instructor-admin-api"
import { instructorApi, type InstructorCourse } from "../../lib/instructor-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyModuleScrollPadding, FacultySearchToolbar } from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetSaveAction,
  FacultySheetTextInput,
} from "./faculty-collab-sheet-ui"
import { FacultyMyCourseCard } from "./FacultyAdminListCards"

type CourseRow = InstructorCourse & { is_active_term?: boolean; term_label?: string | null }

export function FacultyMyCoursesScreen() {
  const { styles: moduleStyles, native, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const scrollPad = useFacultyModuleScrollPadding(24)
  const { session } = useFacultyScope()
  const { selectedCourse, setSelectedCourse, refreshFacultyData } = useFacultyShell()

  const [courses, setCourses] = useState<CourseRow[]>([])
  const [activeTermLabel, setActiveTermLabel] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [draftCode, setDraftCode] = useState("")
  const [draftTitle, setDraftTitle] = useState("")
  const [draftDescription, setDraftDescription] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    const data = await instructorApi.getCourses(session.id)
    setCourses((data.courses ?? []).filter((c) => c.id > 0) as CourseRow[])
    setActiveTermLabel(data.activeTerm?.label ?? null)
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  async function selectCourse(course: InstructorCourse) {
    if (!session || course.id <= 0) return
    setSelectedCourse(course)
    await persistFacultyCourse(session.id, course.id)
    await refreshFacultyData?.(course)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        c.course_code.toLowerCase().includes(q) ||
        c.course_title.toLowerCase().includes(q) ||
        (c.semester ?? "").toLowerCase().includes(q),
    )
  }, [courses, search])

  const currentTerm = useMemo(
    () => filtered.filter((c) => c.is_active_term !== false),
    [filtered],
  )
  const otherTerms = useMemo(
    () => filtered.filter((c) => c.is_active_term === false),
    [filtered],
  )

  async function handleCreateCourse() {
    if (!session) return
    if (!draftCode.trim() || !draftTitle.trim()) {
      setCreateError("Course code and title are required.")
      return
    }
    setCreating(true)
    setCreateError("")
    try {
      await instructorAdminApi.createCourse(session.id, {
        course_code: draftCode.trim(),
        course_title: draftTitle.trim(),
        description: draftDescription.trim() || null,
      })
      setCreateOpen(false)
      setDraftCode("")
      setDraftTitle("")
      setDraftDescription("")
      await load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create course.")
    } finally {
      setCreating(false)
    }
  }

  function renderSection(label: string, items: CourseRow[]) {
    if (items.length === 0) return null
    return (
      <>
        <Text style={[type.sectionHeader, { color: native.secondaryLabel, paddingHorizontal: 4, marginTop: 4, textTransform: "none" }]}>
          {label}
        </Text>
        <View style={styles.list}>
          {items.map((course) => (
            <FacultyMyCourseCard
              key={course.id}
              course={course}
              active={selectedCourse?.id === course.id}
              onPress={() => void selectCourse(course)}
            />
          ))}
        </View>
      </>
    )
  }

  return (
    <>
      <ScrollView
        style={[moduleStyles.root, styles.root]}
        contentContainerStyle={[styles.content, scrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_ADMIN_COLOR.link} />
        }
        showsVerticalScrollIndicator={false}
      >
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search courses"
          showFilter={false}
          trailingAction={{
            icon: "add",
            accessibilityLabel: "Create course",
            onPress: () => setCreateOpen(true),
          }}
        />

        {activeTermLabel ? (
          <View style={[styles.termBanner, { backgroundColor: `${FACULTY_ADMIN_COLOR.link}14` }]}>
            <Ionicons name="calendar-outline" size={16} color={FACULTY_ADMIN_COLOR.link} />
            <Text style={[type.secondary, styles.termBannerText, { color: FACULTY_ADMIN_COLOR.link }]}>
              Active term · {activeTermLabel}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={FACULTY_ADMIN_COLOR.link} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon="school-outline"
            title={search ? "No matches" : "No courses yet"}
            body={
              search
                ? "Try a different search or create a new course offering."
                : "Create a course or wait for assignments from your institution."
            }
          />
        ) : (
          <>
            {renderSection("Current Term", currentTerm)}
            {renderSection("Other Terms", otherTerms)}
            {currentTerm.length === 0 && otherTerms.length === 0
              ? renderSection("Courses", filtered)
              : null}
          </>
        )}
      </ScrollView>

      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title="Create Course"
            onClose={() => setCreateOpen(false)}
            accentColor={FACULTY_ADMIN_COLOR.link}
          />
          <ScrollView contentContainerStyle={[collabSheetStyles.scroll, scrollPad]}>
            <FacultySheetField label="Course code">
              <FacultySheetTextInput
                value={draftCode}
                onChangeText={setDraftCode}
                placeholder="ECE2202"
                autoCapitalize="characters"
              />
            </FacultySheetField>
            <FacultySheetField label="Course title">
              <FacultySheetTextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Digital Logic Design"
              />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <FacultySheetTextInput
                value={draftDescription}
                onChangeText={setDraftDescription}
                placeholder="Optional course description"
                multiline
              />
            </FacultySheetField>
            {createError ? <Text style={[type.destructive, styles.createError]}>{createError}</Text> : null}
            <FacultySheetSaveAction label="Create course" saving={creating} onPress={() => void handleCreateCourse()} />
          </ScrollView>
        </FacultySheetContainer>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: NATIVE.pagePadding, gap: 12 },
  termBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  termBannerText: { fontWeight: "600" },
  list: { gap: 12 },
  createError: { marginBottom: 8 },
})
