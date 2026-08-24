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
  facultyPickerItemMatchesSelection,
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
import { AUTH_FORM_PHONE_MAX_WIDTH, useAuthFlowLayout } from "../../lib/responsive-layout"

export function FacultyCourseSelectScreen() {
  const insets = useSafeAreaInsets()
  const { session, signOut } = useSession()
  const { LOGIN, loginType } = useLoginTheme()
  const authLayout = useAuthFlowLayout({ phoneMax: AUTH_FORM_PHONE_MAX_WIDTH })

  const [courses, setCourses] = useState<InstructorCourse[]>([])
  const [suggestedCourse, setSuggestedCourse] = useState<InstructorCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [redirectToDashboard, setRedirectToDashboard] = useState(false)
  const [exitToLogin, setExitToLogin] = useState(false)

  useEffect(() => {
    if (!session || session.portal !== "faculty") return

    let mounted = true
    void (async () => {
      try {
        consumeFacultyCoursesForSelection()
        const list = await fetchFacultyCoursesList(session)
        if (!mounted) return

        if (!facultyNeedsCourseSelection(list)) {
          setRedirectToDashboard(true)
          return
        }

        setCourses(list)
        stashFacultyCoursesForSelection(list)
        const resolution = await resolveFacultyCourses(session)
        if (mounted && resolution.suggestedCourse) {
          setSuggestedCourse(resolution.suggestedCourse)
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
  }, [session])

  const uniqueCourses = useMemo(() => courses, [courses])

  const duplicateCodes = useMemo(() => {
    return new Set(
      uniqueCourses
        .filter(
          (course, index, arr) =>
            arr.findIndex((item) => (item.picker_key ?? String(item.id)) === (course.picker_key ?? String(course.id))) !==
            index,
        )
        .map((course) => course.picker_key ?? String(course.id)),
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
    const rowKey = course.picker_key ?? String(course.id)
    if (course.id <= 0 || submittingKey != null) return
    setSubmittingKey(rowKey)
    setError("")
    try {
      await persistFacultyCourse(facultySession.id, course.id, course.session_code)
      await bootstrapFacultyForCourse(facultySession, course, uniqueCourses)
      setRedirectToDashboard(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open that course.")
      setSubmittingKey(null)
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
            paddingHorizontal: authLayout.horizontalPadding,
          },
        ]}
      >
        <View style={[styles.shell, authLayout.contentStyle]}>
          <LoginPortalStack style={styles.portalStack}>
            <LoginBrandHeader
              title="Select a course"
              subtitle="Choose the course you want to work in before opening your dashboard."
              style={styles.brandHeader}
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
                  keyExtractor={(course) => course.picker_key ?? String(course.id)}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator
                  stickySectionHeadersEnabled={false}
                  keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
                  renderSectionHeader={({ section }) =>
                    section.title ? (
                      <Text style={[loginType.fieldLabel, styles.sectionLabel, { color: LOGIN.secondaryLabel }]}>
                        {section.title}
                      </Text>
                    ) : null
                  }
                  renderItem={({ item: course }) => {
                    const showSemester = facultyCourseRowSemesterVisible(course, uniqueCourses, duplicateCodes)
                    const isSuggested = facultyPickerItemMatchesSelection(suggestedCourse, course)
                    return (
                      <View style={styles.rowWrap}>
                        <FacultyCoursePickerRow
                          course={course}
                          active={isSuggested}
                          showSemester={showSemester}
                          onPress={() => {
                            if (submittingKey != null) return
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
  },
  shell: {
    flex: 1,
    width: "100%",
  },
  portalStack: {
    flex: 1,
    gap: 16,
  },
  brandHeader: {
    zIndex: 2,
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
