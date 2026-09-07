import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { persistFacultyCourse } from "../../hooks/useFacultyShellRefresh"
import {
  termPayloadFromForm,
  type AcademicTermNameForm,
} from "../../lib/faculty-academic-term-utils"
import {
  flattenFacultyCourseOfferings,
  facultyOfferingKey,
  normalizeFacultyCourseOfferings,
  type FacultyCourseOfferingRow,
} from "../../lib/faculty-my-courses-utils"
import {
  instructorApi,
  type InstructorAcademicTerm,
  type InstructorCourse,
  type InstructorSession,
} from "../../lib/instructor-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyModuleScrollPadding, FacultySearchToolbar } from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { FacultyMyCourseCard } from "./FacultyAdminListCards"
import { FacultyMyCourseActionSheet } from "./FacultyMyCourseActionSheet"
import { FacultyCreateCourseSheet } from "./FacultyCreateCourseSheet"
import { FacultyAcademicTermActionSheet } from "./FacultyAcademicTermActionSheet"
import {
  FacultyAcademicTermFormModal,
  FacultySectionFormModal,
} from "./FacultyAcademicTermFormModal"

type ActiveTermState = { id: number | null; label: string | null }

export function FacultyMyCoursesScreen() {
  const { styles: moduleStyles, native, type } = useModuleTheme()
  const scrollPad = useFacultyModuleScrollPadding(24)
  const { session } = useFacultyScope()
  const { selectedCourse, setSelectedCourse, refreshFacultyData } = useFacultyShell()

  const [courses, setCourses] = useState<FacultyCourseOfferingRow[]>([])
  const [activeTerm, setActiveTerm] = useState<ActiveTermState>({ id: null, label: null })
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedOffering, setSelectedOffering] = useState<FacultyCourseOfferingRow | null>(null)
  const [courseSheetOpen, setCourseSheetOpen] = useState(false)

  const [selectedTerm, setSelectedTerm] = useState<InstructorAcademicTerm | null>(null)
  const [termSheetOpen, setTermSheetOpen] = useState(false)
  const [termSheetLoading, setTermSheetLoading] = useState(false)

  const [termFormMode, setTermFormMode] = useState<"add" | "edit">("add")
  const [termFormOpen, setTermFormOpen] = useState(false)
  const [termFormTarget, setTermFormTarget] = useState<InstructorAcademicTerm | null>(null)

  const [sectionFormMode, setSectionFormMode] = useState<"add" | "edit">("add")
  const [sectionFormOpen, setSectionFormOpen] = useState(false)
  const [sectionFormTerm, setSectionFormTerm] = useState<InstructorAcademicTerm | null>(null)
  const [sectionFormTarget, setSectionFormTarget] = useState<InstructorSession | null>(null)

  const termScope = useMemo(() => {
    if (!session) return null
    const courseId = selectedCourse?.id ?? courses[0]?.course_id
    if (!courseId) return null
    return { instructorId: session.id, courseId }
  }, [session, selectedCourse, courses])

  const load = useCallback(async () => {
    if (!session) return
    const data = await instructorApi.getCourses(session.id)
    const raw = data.offerings?.length ? data.offerings : data.courses ?? []
    const offerings = flattenFacultyCourseOfferings(normalizeFacultyCourseOfferings(raw as Array<Record<string, unknown>>))
    setCourses(offerings)
    setActiveTerm({
      id: data.activeTerm?.id ?? null,
      label: data.activeTerm?.label ?? null,
    })
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load courses."))
      .finally(() => setLoading(false))
  }, [session, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  async function selectCourse(course: FacultyCourseOfferingRow | InstructorCourse) {
    if (!session || course.id <= 0) return
    const next: InstructorCourse = {
      id: "course_id" in course ? course.course_id : course.id,
      course_code: course.course_code,
      course_title: course.course_title,
      university: course.university,
      semester: course.semester,
      staff_role: course.staff_role,
      term_label: course.term_label,
      is_active_term: course.is_active_term,
      academic_term_id: course.academic_term_id,
      description: course.description,
      session_id: course.session_id,
      session_code: course.session_code,
    }
    await persistFacultyCourse(session.id, next.id, next.session_code)
    setSelectedCourse(next)
    await refreshFacultyData?.(next, { force: true })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        c.course_code.toLowerCase().includes(q) ||
        c.course_title.toLowerCase().includes(q) ||
        (c.term_label ?? c.semester ?? "").toLowerCase().includes(q),
    )
  }, [courses, search])

  const pager = useFacultyListPager(filtered, `courses:${search}`, "courses")
  const currentTerm = useMemo(
    () => pager.items.filter((c) => c.is_active_term !== false),
    [pager.items],
  )
  const otherTerms = useMemo(
    () => pager.items.filter((c) => c.is_active_term === false),
    [pager.items],
  )

  function openCourseSheet(course: FacultyCourseOfferingRow) {
    setSelectedOffering(course)
    setCourseSheetOpen(true)
  }

  async function openActiveTermSheet() {
    if (!termScope) {
      setTermFormMode("add")
      setTermFormTarget(null)
      setTermFormOpen(true)
      return
    }
    setTermSheetLoading(true)
    setError("")
    try {
      const data = await instructorApi.getAcademicTerms(termScope)
      const term =
        (activeTerm.id ? data.terms?.find((t) => t.id === activeTerm.id) : null) ??
        data.terms?.find((t) => t.is_active) ??
        null
      if (term) {
        setSelectedTerm(term)
        setTermSheetOpen(true)
      } else {
        setTermFormMode("add")
        setTermFormTarget(null)
        setTermFormOpen(true)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load active term.")
    } finally {
      setTermSheetLoading(false)
    }
  }

  function openEditTerm(term: InstructorAcademicTerm) {
    setTermSheetOpen(false)
    setTermFormMode("edit")
    setTermFormTarget(term)
    setTermFormOpen(true)
  }

  function openAddSection(term: InstructorAcademicTerm) {
    setTermSheetOpen(false)
    setSectionFormMode("add")
    setSectionFormTerm(term)
    setSectionFormTarget(null)
    setSectionFormOpen(true)
  }

  function openEditSection(term: InstructorAcademicTerm, section: InstructorSession) {
    setTermSheetOpen(false)
    setSectionFormMode("edit")
    setSectionFormTerm(term)
    setSectionFormTarget(section)
    setSectionFormOpen(true)
  }

  async function handleTermSubmit(form: AcademicTermNameForm) {
    if (!termScope) return
    setSubmitting(true)
    setError("")
    try {
      const payload = termPayloadFromForm(form)
      if (termFormMode === "add") {
        await instructorApi.createAcademicTerm(termScope, payload)
      } else if (termFormTarget) {
        await instructorApi.updateAcademicTerm(termScope, termFormTarget.id, payload)
      }
      setTermFormOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not save term.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSectionSubmit(payload: { code: string; description: string }) {
    if (!termScope || !sectionFormTerm) return
    if (!payload.code) {
      setError("Section code is required.")
      return
    }
    if (payload.code.toUpperCase() === "BETA") {
      setError("BETA sections cannot be linked to an academic term.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      if (sectionFormMode === "add") {
        await instructorApi.createSession(termScope, {
          code: payload.code,
          description: payload.description || null,
          academic_term_id: sectionFormTerm.id,
        })
      } else if (sectionFormTarget) {
        await instructorApi.updateSession(termScope, sectionFormTarget.id, {
          code: payload.code,
          description: payload.description || null,
        })
      }
      setSectionFormOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not save section.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCourseCreated(created: InstructorCourse) {
    await load()
    if (created?.id) {
      await selectCourse(created)
    }
  }

  function renderSection(label: string, items: FacultyCourseOfferingRow[]) {
    if (items.length === 0) return null
    return (
      <>
        <Text
          style={[
            type.sectionHeader,
            { color: native.secondaryLabel, paddingHorizontal: 4, marginTop: 4, textTransform: "none" },
          ]}
        >
          {label}
        </Text>
        <View style={styles.list}>
          {items.map((course) => (
            <FacultyMyCourseCard
              key={facultyOfferingKey(course)}
              course={course}
              active={selectedCourse?.id === course.course_id}
              onPress={() => openCourseSheet(course)}
            />
          ))}
        </View>
      </>
    )
  }

  const sheetOpen = courseSheetOpen || termSheetOpen || createOpen || termFormOpen || sectionFormOpen

  return (
    <>
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

      <ScrollView
        style={[moduleStyles.root, styles.root]}
        contentContainerStyle={[styles.content, scrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_ADMIN_COLOR.link}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTerm.label || termScope ? (
          <Pressable
            style={({ pressed }) => [
              styles.termBanner,
              { backgroundColor: `${FACULTY_ADMIN_COLOR.link}14` },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => void openActiveTermSheet()}
            accessibilityRole="button"
            accessibilityLabel={
              activeTerm.label ? `Manage active term ${activeTerm.label}` : "Manage academic terms"
            }
          >
            <Ionicons name="calendar-outline" size={16} color={FACULTY_ADMIN_COLOR.link} />
            <Text style={[type.secondary, styles.termBannerText, { color: FACULTY_ADMIN_COLOR.link, flex: 1 }]}>
              {activeTerm.label ? `Active term · ${activeTerm.label}` : "Set up academic term"}
            </Text>
            {termSheetLoading ? (
              <ActivityIndicator size="small" color={FACULTY_ADMIN_COLOR.link} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={FACULTY_ADMIN_COLOR.link} />
            )}
          </Pressable>
        ) : null}

        {error && !sheetOpen ? (
          <Text style={[type.destructive, styles.inlineError]}>{error}</Text>
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
            {currentTerm.length === 0 && otherTerms.length === 0 ? renderSection("Courses", pager.items) : null}
            <FacultyListPagerFooter pager={pager} />
          </>
        )}
      </ScrollView>

      <FacultyCreateCourseSheet
        visible={createOpen}
        instructorId={session?.id ?? null}
        activeTermLabel={activeTerm.label}
        activeTermId={activeTerm.id}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCourseCreated}
      />

      <FacultyMyCourseActionSheet
        visible={courseSheetOpen}
        course={selectedOffering}
        instructorId={session?.id ?? null}
        activeSelected={selectedOffering != null && selectedCourse?.id === selectedOffering.course_id}
        onClose={() => {
          setCourseSheetOpen(false)
          setSelectedOffering(null)
        }}
        onSelectCourse={selectCourse}
        onRemoved={() => void load()}
      />

      <FacultyAcademicTermActionSheet
        visible={termSheetOpen}
        term={selectedTerm}
        scope={termScope}
        courseCode={selectedCourse?.course_code ?? courses[0]?.course_code}
        onClose={() => {
          setTermSheetOpen(false)
          setSelectedTerm(null)
        }}
        onEditTerm={openEditTerm}
        onAddSection={openAddSection}
        onEditSection={openEditSection}
        onUpdated={() => void load()}
      />

      <FacultyAcademicTermFormModal
        visible={termFormOpen}
        mode={termFormMode}
        initial={termFormTarget}
        submitting={submitting}
        error={error}
        onClose={() => setTermFormOpen(false)}
        onSubmit={handleTermSubmit}
      />

      <FacultySectionFormModal
        visible={sectionFormOpen}
        mode={sectionFormMode}
        initialCode={sectionFormTarget?.code ?? ""}
        initialDescription={sectionFormTarget?.description ?? ""}
        submitting={submitting}
        onClose={() => setSectionFormOpen(false)}
        onSubmit={(payload) => void handleSectionSubmit(payload)}
      />
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
  inlineError: { paddingHorizontal: 4 },
})
