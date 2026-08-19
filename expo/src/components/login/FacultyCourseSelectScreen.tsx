import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Redirect } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LoginCanvasBubbles } from "./LoginCanvasBubbles"
import { LoginBrandHeader } from "./LoginBrandHeader"
import { LoginPortalStack, LoginBackLink } from "./login-chrome"
import { ErrorBanner } from "./LoginCard"
import { useLoginTheme } from "./login-theme"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/api"
import { bootstrapFacultyForCourse } from "../../lib/post-login-bootstrap"
import {
  consumeFacultyCoursesForSelection,
  facultyNeedsCourseSelection,
  fetchFacultyCoursesList,
  resolveFacultyCourses,
  stashFacultyCoursesForSelection,
} from "../../lib/faculty-post-login"
import {
  facultyCoursePickerSections,
  facultyCourseRowSemesterVisible,
} from "../../lib/faculty-course-lists"
import { persistFacultyCourse } from "../../hooks/useFacultyShellRefresh"
import type { InstructorCourse } from "../../lib/instructor-api"
import { FacultyCoursePickerRow } from "../faculty/FacultyCollabListCards"
import type { FacultySession } from "../../lib/session"
import { useAuthFlowContentStyle } from "../../lib/responsive-layout"

export function FacultyCourseSelectScreen() {
  const insets = useSafeAreaInsets()
  const { session, signOut } = useSession()
  const { LOGIN, loginType } = useLoginTheme()
  const shellStyle = useAuthFlowContentStyle(440)

  const [courses, setCourses] = useState<InstructorCourse[]>(() => consumeFacultyCoursesForSelection() ?? [])
  const [suggestedCourseId, setSuggestedCourseId] = useState<number | null>(null)
  const [loading, setLoading] = useState(courses.length === 0)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [redirectToDashboard, setRedirectToDashboard] = useState(false)
  const [exitToLogin, setExitToLogin] = useState(false)

  useEffect(() => {
    if (!session || session.portal !== "faculty") return

    let mounted = true
    void (async () => {
      try {
        const list = courses.length > 0 ? courses : await fetchFacultyCoursesList(session)
        if (!mounted) return

        if (!facultyNeedsCourseSelection(list)) {
          setRedirectToDashboard(true)
          return
        }

        setCourses(list)
        stashFacultyCoursesForSelection(list)
        const resolution = await resolveFacultyCourses(session)
        if (mounted && resolution.suggestedCourse) {
          setSuggestedCourseId(resolution.suggestedCourse.id)
        }
      } catch (err) {
        if (!mounted) return
        setError(err instanceof ApiError ? err.message : "Could not load your courses.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [courses.length, session])

  const uniqueCourses = useMemo(
    () => [...new Map(courses.map((course) => [course.id, course])).values()],
    [courses],
  )

  const duplicateCodes = useMemo(() => {
    return new Set(
      uniqueCourses
        .filter((course, index, arr) => arr.findIndex((item) => item.course_code === course.course_code) !== index)
        .map((course) => course.course_code),
    )
  }, [uniqueCourses])

  const sections = useMemo(
    () =>
      facultyCoursePickerSections(uniqueCourses).map((section) => ({
        key: section.key,
        title: section.label ?? "",
        data: section.courses,
      })),
    [uniqueCourses],
  )

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  if (session.portal !== "faculty") {
    return <Redirect href="/(app)/dashboard" />
  }

  if (exitToLogin) {
    return <Redirect href="/(auth)/login" />
  }

  if (redirectToDashboard) {
    return <Redirect href="/(app)/dashboard" />
  }

  const facultySession: FacultySession = session

  async function backToSignIn() {
    await signOut()
    setExitToLogin(true)
  }

  async function selectCourse(course: InstructorCourse) {
    if (course.id <= 0 || submittingId != null) return
    setSubmittingId(course.id)
    setError("")
    try {
      await persistFacultyCourse(facultySession.id, course.id)
      await bootstrapFacultyForCourse(facultySession, course, uniqueCourses)
      setRedirectToDashboard(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open that course.")
      setSubmittingId(null)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: LOGIN.canvas }]}>
      <LoginCanvasBubbles />
      <View
        style={[
          styles.frame,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={[styles.shell, shellStyle]}>
          <LoginPortalStack style={styles.portalStack}>
            <LoginBrandHeader
              title="Select a course"
              subtitle="Choose the course you want to work in before opening your dashboard."
            />

            {error ? <ErrorBanner message={error} /> : null}

            {loading ? (
              <ActivityIndicator color={LOGIN.purple} style={styles.loading} />
            ) : uniqueCourses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[loginType.panelDescription, styles.empty, { color: LOGIN.secondaryLabel }]}>
                  No courses are assigned to this account yet.
                </Text>
                <Pressable
                  onPress={() => setRedirectToDashboard(true)}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                >
                  <Text style={[loginType.link, { color: LOGIN.purpleLight }]}>Continue to dashboard</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.listViewport}>
                <SectionList
                  sections={sections}
                  keyExtractor={(course) => String(course.id)}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator
                  stickySectionHeadersEnabled={false}
                  keyboardShouldPersistTaps="handled"
                  renderSectionHeader={({ section }) =>
                    section.title ? (
                      <Text style={[loginType.fieldLabel, styles.sectionLabel, { color: LOGIN.secondaryLabel }]}>
                        {section.title}
                      </Text>
                    ) : null
                  }
                  renderItem={({ item: course }) => {
                    const showSemester = facultyCourseRowSemesterVisible(course, uniqueCourses, duplicateCodes)
                    const isSuggested = course.id === suggestedCourseId
                    return (
                      <View style={styles.rowWrap}>
                        <FacultyCoursePickerRow
                          course={course}
                          active={isSuggested}
                          showSemester={showSemester}
                          onPress={() => {
                            if (submittingId != null) return
                            void selectCourse(course)
                          }}
                        />
                      </View>
                    )
                  }}
                  ItemSeparatorComponent={() => <View style={styles.rowGap} />}
                  SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
                />
              </View>
            )}

            <LoginBackLink label="Back to sign in" onPress={() => void backToSignIn()} />
          </LoginPortalStack>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: {
    flex: 1,
    paddingHorizontal: 20,
  },
  shell: {
    flex: 1,
    width: "100%",
  },
  portalStack: {
    flex: 1,
    gap: 16,
  },
  listViewport: {
    flex: 1,
    minHeight: 180,
    marginTop: 12,
    borderRadius: 18,
    overflow: "hidden",
  },
  list: { flex: 1 },
  listContent: {
    paddingBottom: 8,
  },
  rowWrap: {},
  rowGap: { height: 10 },
  sectionGap: { height: 6 },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 4,
    fontWeight: "600",
    textTransform: "none",
  },
  loading: { marginVertical: 24 },
  emptyWrap: { gap: 8, paddingVertical: 12 },
  empty: { textAlign: "center" },
  secondaryAction: {
    alignItems: "center",
    paddingVertical: 14,
  },
  pressed: { opacity: 0.7 },
})
