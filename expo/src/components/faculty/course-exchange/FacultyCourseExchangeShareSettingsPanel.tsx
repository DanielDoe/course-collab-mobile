import { useMemo } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import {
  COURSE_EXCHANGE_MODULE_LABELS,
  type AccessLogRow,
  type CourseExchangeLayout,
  EXCHANGE_OWNER_SHARING_NOTE,
  type MyCourseSharing,
} from "../../../lib/course-exchange-shared"
import { FACULTY_COURSE_EXCHANGE_COLOR } from "../../../lib/faculty-course-exchange-theme"
import { FacultyEmptyState } from "../faculty-shared"
import { FacultySheetNotice, FacultySheetSection } from "../faculty-collab-sheet-ui"
import { useFacultyStickyHeaderScrollLayout } from "../faculty-module-shell"
import {
  FacultyCourseExchangeCardGrid,
  FacultyCourseExchangeSharingGridCard,
  FacultyCourseExchangeSharingListCard,
} from "./FacultyCourseExchangeListCards"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { formatFacultyRelativeTime } from "../../../lib/instructor-api"

type Props = {
  courses: MyCourseSharing[]
  totalCourses: number
  accessLog: AccessLogRow[]
  loading: boolean
  layout: CourseExchangeLayout
  onConfigure: (course: MyCourseSharing) => void
}

export function FacultyCourseExchangeShareSettingsPanel({
  courses,
  totalCourses,
  accessLog,
  loading,
  layout,
  onConfigure,
}: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()

  const sharedOnCount = useMemo(
    () => courses.filter((c) => c.sharingMode === "request_only").length,
    [courses],
  )

  if (loading && totalCourses === 0) {
    return <ActivityIndicator color={FACULTY_COURSE_EXCHANGE_COLOR.link} style={{ marginTop: 24 }} />
  }

  if (courses.length === 0) {
    return (
      <FacultyEmptyState
        icon="albums-outline"
        title={totalCourses > 0 ? "No matching courses" : "No courses to share"}
        body={
          totalCourses > 0
            ? "Try a different filter or search term."
            : "Create or get assigned to a course first. Owned courses appear here so you can opt them into Discover."
        }
      />
    )
  }

  return (
    <ScrollView contentContainerStyle={[styles.wrap, listScrollPad]}>
      <Text style={[type.caption, { color: native.secondaryLabel }]}>
        {sharedOnCount} of {courses.length} sharing
      </Text>
      <View style={styles.noticeWrap}>
        <FacultySheetNotice message={EXCHANGE_OWNER_SHARING_NOTE} dismissible autoDismissMs={8000} />
      </View>

      {layout === "grid" ? (
        <FacultyCourseExchangeCardGrid>
          {courses.map((course) => (
            <FacultyCourseExchangeSharingGridCard
              key={course.courseId}
              course={course}
              onPress={() => onConfigure(course)}
            />
          ))}
        </FacultyCourseExchangeCardGrid>
      ) : (
        <View style={styles.list}>
          {courses.map((course) => (
            <FacultyCourseExchangeSharingListCard
              key={course.courseId}
              course={course}
              onPress={() => onConfigure(course)}
            />
          ))}
        </View>
      )}

      {accessLog.length > 0 ? (
        <FacultySheetSection label="Recent sharing events">
          {accessLog.slice(0, 20).map((ev) => (
            <View key={ev.id} style={[styles.logRow, { borderBottomColor: native.separator }]}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>
                {ev.courseCode} · {ev.requesterName}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {ev.eventType.replace(/_/g, " ")}
                {ev.autoApproved ? " · auto" : ""}
                {" · "}
                {formatFacultyRelativeTime(ev.createdAt)}
              </Text>
              {ev.modules.length > 0 ? (
                <Text style={[type.caption, { color: native.tertiaryLabel }]}>
                  {ev.modules.map((m) => COURSE_EXCHANGE_MODULE_LABELS[m]).join(", ")}
                </Text>
              ) : null}
            </View>
          ))}
        </FacultySheetSection>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  noticeWrap: { marginBottom: 4 },
  list: { gap: 10 },
  logRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
})
