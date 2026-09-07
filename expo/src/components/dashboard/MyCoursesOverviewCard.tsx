import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useStudentActiveCourse } from "../../context/StudentActiveCourseContext"
import { useStudentShell } from "../../context/StudentShellContext"
import { useThemedNative, useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  isActiveStudentEnrollment,
  studentEnrollmentMatches,
  studentEnrollmentPickerLabel,
} from "../../lib/student-enrollment"
import { ModuleSectionHeader } from "../modules/ModuleScreen"

export function MyCoursesOverviewCard() {
  const { enrolledCourses, activeCourse, setActiveCourse } = useStudentActiveCourse()
  const { openCoursePicker } = useStudentShell()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const active = enrolledCourses.filter(isActiveStudentEnrollment)
  if (active.length < 2) return null

  return (
    <View style={styles.section}>
      <ModuleSectionHeader
        title="My Courses"
        action={
          <Pressable onPress={openCoursePicker} hitSlop={8} accessibilityRole="button">
            <Text style={[type.caption, { color: native.tint, fontWeight: "600" }]}>View all</Text>
          </Pressable>
        }
      />
      <View style={styles.list}>
        {active.map((course) => {
          const selected = studentEnrollmentMatches(activeCourse, course)
          return (
            <Pressable
              key={course.pickerKey}
              onPress={() => {
                if (!selected) void setActiveCourse(course)
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.row,
                tokens.cardShadow,
                {
                  backgroundColor: native.secondaryGrouped,
                  borderColor: selected ? tokens.accent : tokens.border,
                },
              ]}
            >
              {selected ? (
                <Ionicons name="checkmark-circle" size={18} color={tokens.accent} />
              ) : (
                <Ionicons name="school-outline" size={18} color={native.secondaryLabel} />
              )}
              <Text
                style={[type.bodyEmphasis, styles.label, { color: native.label }]}
                numberOfLines={1}
              >
                {studentEnrollmentPickerLabel(course)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  label: { flex: 1, minWidth: 0 },
})
