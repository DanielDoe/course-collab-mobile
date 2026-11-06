import { useCallback, useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { courseInfoApi, type CoursePolicies } from "../../lib/course-info-api"
import { COURSE_INFO_POLICIES } from "../../lib/course-info-color-theme"
import { InfoSectionCard, useCourseInfoTheme } from "./course-info-shared"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useModulePageLayout } from "../../lib/responsive-layout"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function PoliciesScreen() {
  const session = useStudentSession()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const page = useModulePageLayout()
  const [policies, setPolicies] = useState<CoursePolicies | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await courseInfoApi.getPolicies(session)
      setPolicies(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load policies.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const sourceLabel = policies?.source_label ?? "Instructor controlled only"
  const isInstructorOnly = sourceLabel === "Instructor controlled only"
  const displayLabel = isInstructorOnly ? "Instructor Controlled Assessment Policies" : sourceLabel

  return (
    <ModuleScreen
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load().finally(() => setRefreshing(false))
      }}
      contentStyle={{
        paddingHorizontal: page.horizontalPadding,
        gap: page.stackGap,
      }}
    >
      <View style={[styles.stack, { gap: page.stackGap }]}>
        <InfoSectionCard
          title="Assessment Governance"
          icon="shield-checkmark-outline"
          iconThumb={COURSE_INFO_POLICIES.governance}
          theme={theme}
          contentPadding={page.cardPadding}
        >
          <View
            style={[
              styles.highlight,
              {
                backgroundColor: native.fill,
                borderColor: native.separator,
                padding: page.cardPadding,
              },
            ]}
          >
            <Text style={[type.caption, styles.highlightLabel, { color: theme.primary }]}>This course uses</Text>
            <Text style={[type.bodyEmphasis, styles.highlightValue]}>{displayLabel}</Text>
          </View>
          <Text style={[type.secondary, styles.body]}>
            {isInstructorOnly
              ? "Assessment attempts, retakes, deadlines, and grading policies are managed by the instructor and not by CourseCollab membership status."
              : "Assessment attempts, retakes, deadlines, and grading policies are managed by the instructor unless your instructor has enabled membership-based assessment benefits for this course."}
          </Text>
        </InfoSectionCard>

        <View
          style={[
            styles.notice,
            {
              backgroundColor: native.secondaryGrouped,
              borderColor: native.separator,
              padding: page.cardPadding,
              gap: page.cardGap + 2,
            },
          ]}
        >
          <SolidListThumbTile
            thumb={COURSE_INFO_POLICIES.notice}
            icon="information-circle-outline"
            size="compact"
          />
          <View style={styles.noticeBody}>
            <Text style={[type.bodyEmphasis, styles.noticeTitle]}>Course Policy Notice</Text>
            <Text style={[type.secondary, styles.body]}>
              Assessment privileges — attempts, deadlines, retakes, extensions, grading, and accommodations — are set by
              your instructor, not by your membership tier.
            </Text>
            <Text style={[type.secondary, styles.body, styles.noticeSpaced]}>
              No student receives extra assessment opportunities through CourseCollab membership unless your instructor has
              enabled that for the entire course.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.membershipNote,
            {
              backgroundColor: native.fill,
              borderColor: native.separator,
              padding: page.cardPadding,
              gap: page.cardGap,
            },
          ]}
        >
          <SolidListThumbTile
            thumb={COURSE_INFO_POLICIES.membership}
            icon="book-outline"
            size="compact"
            style={styles.membershipIcon}
          />
          <Text style={[type.caption, styles.membershipText]}>
            View membership plans for learning tools and platform perks — course assessment rules stay on this page.
          </Text>
        </View>
      </View>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  stack: {
    width: "100%",
  },
  highlight: {
    borderRadius: 12,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  highlightLabel: {
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  highlightValue: {},
  body: { lineHeight: 22 },
  notice: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  membershipIcon: { marginTop: 1 },
  noticeBody: { flex: 1, gap: 8, minWidth: 0, paddingTop: 1 },
  noticeTitle: {},
  noticeSpaced: { marginTop: 2 },
  membershipNote: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  membershipText: { flex: 1, lineHeight: 20, minWidth: 0, paddingTop: 1 },
})
