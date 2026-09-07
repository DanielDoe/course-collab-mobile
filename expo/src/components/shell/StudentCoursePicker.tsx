import { useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useStudentShell } from "../../context/StudentShellContext"
import { useStudentActiveCourse } from "../../context/StudentActiveCourseContext"
import {
  isActiveStudentEnrollment,
  studentEnrollmentCodeLabel,
  studentEnrollmentMatches,
  studentEnrollmentPickerLabel,
  type StudentEnrollment,
} from "../../lib/student-enrollment"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { useDeferredShellSheetVisible } from "../navigation/useDeferredShellSheetVisible"

export function StudentCoursePicker() {
  const insets = useSafeAreaInsets()
  const { tokens, native, type } = useModuleTheme()
  const { coursePickerOpen, closeCoursePicker } = useStudentShell()
  const pickerVisible = useDeferredShellSheetVisible(coursePickerOpen)
  const { activeCourse, enrolledCourses, setActiveCourse, reloadEnrollments, isLoading } =
    useStudentActiveCourse()
  const [switchingKey, setSwitchingKey] = useState<string | null>(null)

  const { activeRows, pastRows } = useMemo(() => {
    const active: StudentEnrollment[] = []
    const past: StudentEnrollment[] = []
    for (const course of enrolledCourses) {
      if (isActiveStudentEnrollment(course)) active.push(course)
      else past.push(course)
    }
    return { activeRows: active, pastRows: past }
  }, [enrolledCourses])

  async function selectCourse(course: StudentEnrollment) {
    if (studentEnrollmentMatches(activeCourse, course)) {
      closeCoursePicker()
      return
    }
    setSwitchingKey(course.pickerKey)
    const ok = await setActiveCourse(course)
    setSwitchingKey(null)
    if (ok) closeCoursePicker()
  }

  return (
    <GlassBottomSheetModal
      visible={pickerVisible}
      onClose={closeCoursePicker}
      accessibilityLabel="Close course picker"
      maxHeight="88%"
      scrollable
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <GlassSheetHandle />
        <View style={styles.head}>
          <Text style={[type.sheetTitle, { color: native.label, flex: 1 }]}>My Courses</Text>
          <Pressable
            onPress={closeCoursePicker}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close course picker"
            style={styles.doneHit}
          >
            <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Done</Text>
          </Pressable>
        </View>
        <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]}>
          Switch the active course. Lectures, Cora, grades, and every course module follow this selection.
        </Text>

        {isLoading && enrolledCourses.length === 0 ? (
          <ActivityIndicator color={tokens.accent} style={styles.loading} />
        ) : enrolledCourses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[type.secondary, { color: native.secondaryLabel, textAlign: "center" }]}>
              No active enrollments for this account.
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: tokens.accent }]}
              onPress={() => void reloadEnrollments()}
            >
              <Text style={[type.bodyEmphasis, { color: "#fff" }]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            <CourseGroup
              courses={activeRows}
              selected={activeCourse}
              switchingKey={switchingKey}
              onSelect={(course) => void selectCourse(course)}
            />
            {pastRows.length > 0 ? (
              <View style={styles.section}>
                <Text style={[type.sectionHeader, styles.sectionLabel, { color: native.secondaryLabel }]}>
                  Past courses
                </Text>
                <CourseGroup
                  courses={pastRows}
                  selected={activeCourse}
                  switchingKey={switchingKey}
                  onSelect={(course) => void selectCourse(course)}
                />
              </View>
            ) : null}
          </View>
        )}
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

function CourseGroup({
  courses,
  selected,
  switchingKey,
  onSelect,
}: {
  courses: StudentEnrollment[]
  selected: StudentEnrollment | null
  switchingKey: string | null
  onSelect: (course: StudentEnrollment) => void
}) {
  const { tokens, native, type } = useModuleTheme()
  return (
    <View style={styles.section}>
      {courses.map((course) => {
        const active = studentEnrollmentMatches(selected, course)
        const busy = switchingKey === course.pickerKey
        return (
          <Pressable
            key={course.pickerKey}
            onPress={() => onSelect(course)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={studentEnrollmentPickerLabel(course)}
            style={[
              styles.row,
              {
                backgroundColor: active ? tokens.accentSoft : native.secondaryGrouped,
                borderColor: active ? tokens.accent : tokens.border,
              },
            ]}
          >
            <View style={styles.checkSlot}>
              {busy ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : active ? (
                <Ionicons name="checkmark" size={18} color={tokens.accent} />
              ) : null}
            </View>
            <View style={styles.rowCopy}>
              <View style={styles.rowTitle}>
                <Text style={[type.bodyEmphasis, { color: native.label, flex: 1 }]} numberOfLines={1}>
                  {studentEnrollmentCodeLabel(course)}
                </Text>
                {active ? (
                  <Text style={[type.footnote, styles.current, { color: tokens.accent }]}>Current</Text>
                ) : null}
              </View>
              {course.courseTitle ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                  {course.courseTitle}
                </Text>
              ) : null}
              {course.section || course.academicTermLabel ? (
                <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={1}>
                  {[course.section.trim(), course.academicTermLabel?.trim()].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              {course.instructorName?.trim() ? (
                <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={1}>
                  {course.instructorName.trim()}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </View>
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
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    marginTop: 4,
    textTransform: "none",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
  },
  checkSlot: {
    width: 22,
    alignItems: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  current: {
    fontWeight: "700",
  },
  loading: {
    marginTop: 24,
    marginBottom: 16,
  },
  emptyBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  retryBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
})
