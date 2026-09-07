import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Redirect, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError, api, type UniversityStudentLoginResponse } from "../../lib/api"
import { parseAccessLifecyclePayload } from "../../lib/access-governance"
import { formatStudentLoginApiError } from "../../lib/student-login-errors"
import { completeStudentUniversityLogin } from "../../lib/student-login-completion"
import { enrollmentsFromLoginOptions } from "../../lib/student-enrollments-api"
import { stashStudentEnrollments } from "../../lib/student-enrollments-cache"
import { normalizeLoginIdentifier, normalizeLoginPassword } from "../../lib/login-credentials"
import {
  clearPendingStudentCourseLogin,
  peekPendingStudentCourseLogin,
  type PendingStudentCourseLogin,
} from "../../lib/student-login-pending"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"
import { useSession } from "../../context/SessionProvider"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"
import { ErrorBanner } from "./LoginCard"
import { LoginBackLink, LoginPortalStack } from "./login-chrome"
import { useAuthNestedBack } from "../navigation/useAuthNestedBack"
import { useLoginTheme } from "./login-theme"

function isCourseSelectionResponse(
  data: UniversityStudentLoginResponse,
): data is Extract<UniversityStudentLoginResponse, { requiresCourseSelection: true }> {
  return "requiresCourseSelection" in data && data.requiresCourseSelection === true
}

export function StudentCourseSelectScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signIn, session, isLoading: sessionLoading } = useSession()
  const { LOGIN, loginType } = useLoginTheme()
  const linkAccent = LOGIN.purple

  const [pending, setPending] = useState<PendingStudentCourseLogin | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [mfaState, setMfaState] = useState<MfaLoginState | null>(null)
  const [accessStatus, setAccessStatus] = useState<ReturnType<typeof parseAccessLifecyclePayload>>(null)

  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    const data = peekPendingStudentCourseLogin()
    if (!data || data.enrollments.length === 0) {
      router.replace("/(auth)/login")
      return
    }
    setPending(data)
    setBootstrapping(false)
  }, [router])

  function backToLogin() {
    clearPendingStudentCourseLogin()
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/(auth)/login")
  }

  const nestedBackActive = Boolean(mfaState || accessStatus)

  const handleNestedBack = useCallback(() => {
    if (accessStatus) {
      setAccessStatus(null)
      return
    }
    if (mfaState) {
      setMfaState(null)
      setError("")
    }
  }, [accessStatus, mfaState])

  const nestedBackSwipe = useAuthNestedBack(nestedBackActive, handleNestedBack, insets.top)

  if (!sessionLoading && session) {
    return <Redirect href="/(auth)/signing-in" />
  }

  if (bootstrapping || !pending) {
    return (
      <View style={[styles.boot, { backgroundColor: LOGIN.canvas, paddingTop: insets.top }]}>
        <ActivityIndicator color={linkAccent} />
      </View>
    )
  }

  async function finishLogin(data: Extract<UniversityStudentLoginResponse, { student: unknown }>) {
    const loginEnrollments = enrollmentsFromLoginOptions(data.enrollments ?? pending!.enrollments, {
      courseId: data.enrollment?.courseId ?? pending!.enrollments[0]?.courseId,
      courseCode: data.enrollment?.courseCode ?? pending!.enrollments[0]?.courseCode,
      courseTitle: data.enrollment?.courseTitle ?? pending!.enrollments[0]?.courseTitle,
      section: data.enrollment?.section ?? data.student.section ?? pending!.enrollments[0]?.section,
      sessionId: data.enrollment?.sessionId ?? pending!.enrollments[0]?.sessionId,
      studentRowId: data.enrollment?.studentRowId ?? pending!.enrollments[0]?.studentRowId,
    })
    clearPendingStudentCourseLogin()
    await completeStudentUniversityLogin({
      data,
      selectedUniversity: pending!.university,
      identifier: pending!.identifier,
      password: pending!.password,
      rememberMe: pending!.rememberMe,
      signIn,
    })
    if (loginEnrollments.length > 0) {
      stashStudentEnrollments(loginEnrollments)
    }
  }

  async function selectCourse(course: { courseId: number; section?: string }) {
    if (!pending) return
    const id = normalizeLoginIdentifier(pending.identifier)
    const pw = normalizeLoginPassword(pending.password)

    setSubmitting(true)
    setError("")
    try {
      const data = await api.universityStudentLogin({
        universityId: pending.university.id,
        identifier: id,
        password: pw,
        rememberMe: pending.rememberMe,
        courseId: course.courseId,
        section: course.section,
      })

      if (isCourseSelectionResponse(data)) {
        setError("Could not open that course. Try again.")
        return
      }

      const mfa = parseMfaLoginResponse(data as Record<string, unknown>)
      if (mfa) {
        setMfaState(mfa)
        return
      }

      await finishLogin(data)
    } catch (err) {
      if (err instanceof ApiError) {
        const lifecycle = parseAccessLifecyclePayload(err.details)
        if (lifecycle && lifecycle.lifecycle !== "active" && lifecycle.lifecycle !== "not_found") {
          setAccessStatus(lifecycle)
          return
        }
        setError(formatStudentLoginApiError(err.message, err.details))
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMfaComplete(payload: Record<string, unknown>) {
    const normalized = parseMfaCompletePayload(payload)
    if (!normalized || !("student" in normalized) || !normalized.student) {
      throw new ApiError("Login failed after verification.", 500)
    }
    await finishLogin(normalized as Extract<UniversityStudentLoginResponse, { student: unknown }>)
  }

  if (accessStatus) {
    return (
      <View style={[styles.root, { backgroundColor: LOGIN.canvas, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {nestedBackSwipe}
        <AccessRequestStatusScreen
          payload={accessStatus}
          portalLabel={pending.university.short_name ?? "Student"}
          onBack={() => setAccessStatus(null)}
        />
      </View>
    )
  }

  if (mfaState) {
    return (
      <View style={[styles.root, { backgroundColor: LOGIN.canvas, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {nestedBackSwipe}
        <MfaLoginStep
          showChrome={false}
          backLabel="Back to courses"
          state={mfaState}
          university={pending.university}
          portalLabel={pending.university.short_name ?? "CourseCollab"}
          onComplete={(payload) => handleMfaComplete(payload)}
          onBack={() => {
            setMfaState(null)
            setError("")
          }}
        />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: LOGIN.canvas, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <LoginPortalStack>
          <View style={styles.stepHeader}>
            <Text style={loginType.panelTitle}>Select a Course</Text>
            <Text style={loginType.panelDescription}>
              You are enrolled in multiple courses. Choose one to continue.
            </Text>
          </View>

          <View style={styles.uniList}>
            {pending.enrollments.map((course) => (
              <Pressable
                key={`${course.courseId}-${course.section ?? ""}`}
                disabled={submitting}
                onPress={() => void selectCourse({ courseId: course.courseId, section: course.section })}
                style={({ pressed }) => [
                  styles.uniRow,
                  {
                    borderColor: LOGIN.separator,
                    backgroundColor: LOGIN.fill,
                  },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <View style={styles.uniText}>
                  <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>{course.courseTitle}</Text>
                  <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                    {[course.courseCode, course.section].filter(Boolean).join(" • ")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={linkAccent} />
              </Pressable>
            ))}
          </View>

          {error ? <ErrorBanner message={error} /> : null}
          {submitting ? <ActivityIndicator color={linkAccent} /> : null}

          <LoginBackLink label="Back to login" onPress={backToLogin} />
        </LoginPortalStack>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  stepHeader: { gap: 6, marginBottom: 2 },
  uniList: { gap: 10 },
  uniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  uniText: { flex: 1, gap: 2, minWidth: 0 },
  pressed: { opacity: 0.85 },
})
