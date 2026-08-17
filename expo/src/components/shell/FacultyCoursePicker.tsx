import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFacultyShell } from "../../context/FacultyShellContext"
import type { InstructorCourse } from "../../lib/instructor-api"
import { persistFacultyCourse } from "../../hooks/useFacultyShellRefresh"
import type { FacultySession } from "../../lib/session"
import { API_BASE_URL } from "../../constants"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import {
  facultyCoursePickerSections,
  facultyCourseRowSemesterVisible,
} from "../../lib/faculty-course-lists"
import { FacultyCoursePickerRow } from "../faculty/FacultyCollabListCards"

type Props = {
  session: FacultySession
}

export function FacultyCoursePicker({ session }: Props) {
  const insets = useSafeAreaInsets()
  const { tokens, native, type } = useModuleTheme()
  const {
    coursePickerOpen,
    closeCoursePicker,
    courses,
    selectedCourse,
    setSelectedCourse,
    refreshFacultyData,
  } = useFacultyShell()

  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    if (!coursePickerOpen || courses.length > 0) return
    setLoadingCourses(true)
    setLoadError("")
    void refreshFacultyData?.(undefined, { force: true })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : ""
        setLoadError(
          msg.includes("Network request failed")
            ? `Could not reach the CourseCollab API (${API_BASE_URL}). Check your connection and try again.`
            : "Could not load courses. Pull to refresh or try again.",
        )
      })
      .finally(() => setLoadingCourses(false))
  }, [coursePickerOpen, courses.length, refreshFacultyData])

  async function selectCourse(course: InstructorCourse) {
    if (!course.id || course.id <= 0) return
    setSelectedCourse(course)
    await persistFacultyCourse(session.id, course.id)
    closeCoursePicker()
    try {
      await refreshFacultyData?.(course)
    } catch (err) {
      console.warn("[FacultyCoursePicker] refresh failed", err)
    }
  }

  const uniqueCourses = useMemo(
    () => [...new Map(courses.map((course) => [course.id, course])).values()],
    [courses],
  )
  const sections = useMemo(() => facultyCoursePickerSections(uniqueCourses), [uniqueCourses])
  const duplicateCodes = useMemo(() => {
    return new Set(
      uniqueCourses
        .filter((c, i, arr) => arr.findIndex((x) => x.course_code === c.course_code) !== i)
        .map((c) => c.course_code),
    )
  }, [uniqueCourses])

  return (
    <GlassBottomSheetModal
      visible={coursePickerOpen}
      onClose={closeCoursePicker}
      accessibilityLabel="Close course picker"
      maxHeight="88%"
      scrollable
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <GlassSheetHandle />
        <View style={styles.head}>
          <Text style={[type.sheetTitle, { color: native.label, flex: 1 }]}>Switch course</Text>
          <Pressable
            onPress={closeCoursePicker}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close course picker"
            style={styles.doneHit}
          >
            <Text style={[type.bodyEmphasis, { color: FACULTY_COLLAB_COLOR.link }]}>Done</Text>
          </Pressable>
        </View>
        <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]}>
          All of your courses, grouped by term. Mobile tools stay scoped to one course at a time.
        </Text>

        {loadingCourses ? (
          <ActivityIndicator color={FACULTY_COLLAB_COLOR.link} style={styles.loading} />
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Text style={[type.secondary, { color: tokens.danger, textAlign: "center" }]}>{loadError}</Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: FACULTY_COLLAB_COLOR.action }]}
              onPress={() => {
                setLoadingCourses(true)
                setLoadError("")
                void refreshFacultyData?.(undefined, { force: true })
                  .catch((err) => {
                    const msg = err instanceof Error ? err.message : ""
                    setLoadError(
                      msg.includes("Network request failed")
                        ? `Could not reach the CourseCollab API (${API_BASE_URL}). Check your connection and try again.`
                        : "Could not load courses. Pull to refresh or try again.",
                    )
                  })
                  .finally(() => setLoadingCourses(false))
              }}
            >
              <Text style={[type.bodyEmphasis, { color: FACULTY_COLLAB_COLOR.actionInk }]}>Try again</Text>
            </Pressable>
          </View>
        ) : courses.length === 0 ? (
          <Text style={[type.secondary, styles.empty, { color: native.secondaryLabel }]}>
            No courses assigned to this account.
          </Text>
        ) : (
          <View style={styles.list}>
            {sections.map((section) => (
              <View key={section.key} style={styles.section}>
                {section.label ? (
                  <Text style={[type.sectionHeader, styles.sectionLabel, { color: native.secondaryLabel }]}>
                    {section.label}
                  </Text>
                ) : null}
                {section.courses.map((course) => {
                  const active = selectedCourse?.id === course.id
                  const showSemester = facultyCourseRowSemesterVisible(course, uniqueCourses, duplicateCodes)
                  return (
                    <FacultyCoursePickerRow
                      key={course.id}
                      course={course}
                      active={active}
                      showSemester={showSemester}
                      onPress={() => void selectCourse(course)}
                    />
                  )
                })}
              </View>
            ))}
          </View>
        )}
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  doneHit: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  subtitle: {
    marginBottom: 4,
  },
  list: {
    gap: 10,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    marginTop: 4,
    textTransform: "none",
  },
  loading: {
    marginTop: 24,
    marginBottom: 16,
  },
  empty: {
    textAlign: "center",
    paddingVertical: 24,
  },
  errorBox: { alignItems: "center", gap: 12, paddingVertical: 20, paddingHorizontal: 8 },
  retryBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
})
