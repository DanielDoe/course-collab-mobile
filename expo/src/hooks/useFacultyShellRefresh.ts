import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useFocusEffect, router as rootRouter } from "expo-router"
import { getCachedFacultyMembershipTier } from "../lib/faculty-membership-tier-cache"
import { refreshFacultyShellMembership } from "../lib/faculty-shell-refresh"
import { consumeFacultyShellBootstrap } from "../lib/app-bootstrap-cache"
import { ensureAppBootstrap } from "../lib/post-login-bootstrap"
import {
  SHELL_REFRESH_TTL_MS,
  type RefreshFacultyDataOptions,
} from "../lib/faculty-shell-refresh-types"
import { useFacultyShell } from "../context/FacultyShellContext"
import { instructorApi, type InstructorCourse } from "../lib/instructor-api"
import { courseExchangeDrawerBadgeCount } from "../lib/course-exchange-shared"
import { fetchFacultyCoursePickerItems } from "../lib/faculty-course-picker"
import {
  getStoredFacultyCourseId,
  getStoredFacultySessionCode,
  setStoredFacultyCourseId,
  setStoredFacultySessionCode,
} from "../lib/faculty-course-storage"
import {
  facultyNeedsCourseSelection,
  facultyPickerItemMatchesSelection,
  stashFacultyCoursesForSelection,
} from "../lib/faculty-post-login"
import { resolveFacultyStoredCourse } from "../lib/faculty-section-scope"
import type { FacultySession } from "../lib/session"
import { setAppBadgeCount } from "../lib/notifications/notification-service"
import { getQueryClient } from "../lib/query/client"

export function useFacultyShellRefresh(session: FacultySession) {
  const {
    selectedCourse,
    setSelectedCourse,
    setCourses,
    setNotificationCount,
    setBadges,
    setMembershipTier,
    setMembershipTierLoaded,
    registerRefreshFacultyData,
  } = useFacultyShell()

  const [shellLoading, setShellLoading] = useState(true)
  const refreshingRef = useRef(false)
  const lastRefreshAtRef = useRef(0)

  const resolveCourse = useCallback(
    async (nextCourses: InstructorCourse[], courseOverride?: InstructorCourse | null) => {
      let course = courseOverride ?? null

      if (!course || course.id <= 0) {
        const storedId = await getStoredFacultyCourseId(session.id)
        const storedSessionCode =
          storedId != null ? await getStoredFacultySessionCode(session.id, storedId) : null
        if (storedId != null) {
          course = resolveFacultyStoredCourse(nextCourses, storedId, storedSessionCode)
        }
      }

      if (!course || course.id <= 0) {
        if (selectedCourse && selectedCourse.id > 0) {
          course =
            nextCourses.find((item) => facultyPickerItemMatchesSelection(selectedCourse, item)) ??
            null
        }
        if (!course && nextCourses.length === 1) course = nextCourses[0]!
      }

      if (!course || course.id <= 0) return course

      const canonical =
        nextCourses.find((item) => facultyPickerItemMatchesSelection(course, item)) ?? course
      if (!facultyPickerItemMatchesSelection(selectedCourse, canonical)) {
        setSelectedCourse(canonical)
      }
      return canonical
    },
    [selectedCourse, session.id, setSelectedCourse],
  )

  const refreshMembership = useCallback(async () => {
    await refreshFacultyShellMembership(session, {
      setMembershipTier,
      setMembershipTierLoaded,
    })
  }, [session, setMembershipTier, setMembershipTierLoaded])

  const refreshFacultyData = useCallback(
    async (courseOverride?: InstructorCourse | null, options?: RefreshFacultyDataOptions) => {
      const force = options?.force === true || courseOverride != null
      const now = Date.now()

      if (refreshingRef.current && courseOverride == null) return
      if (
        !force &&
        courseOverride == null &&
        lastRefreshAtRef.current > 0 &&
        now - lastRefreshAtRef.current < SHELL_REFRESH_TTL_MS
      ) {
        return
      }

      refreshingRef.current = true
      try {
        const nextCourses = await fetchFacultyCoursePickerItems(session)
        setCourses(nextCourses)

        const previousCourse = selectedCourse
        const course = await resolveCourse(nextCourses, courseOverride)
        await refreshMembership()

        if (!course || course.id <= 0) {
          if (facultyNeedsCourseSelection(nextCourses)) {
            stashFacultyCoursesForSelection(nextCourses)
            rootRouter.replace("/(app)/faculty-select-course" as never)
          }
          return
        }

        const scope = {
          instructorId: session.id,
          courseId: course.id,
          sessionId: course.session_id ?? null,
          sessionCode: course.session_code ?? null,
          academicTermId: course.academic_term_id ?? null,
        }
        const courseChanged =
          courseOverride != null ||
          !facultyPickerItemMatchesSelection(previousCourse, course)
        if (courseChanged) {
          void getQueryClient().invalidateQueries({ queryKey: ["faculty"] })
        }
        const [notifications, pendingPoints, issues, officeHours, exchangeSummary] = await Promise.all([
          instructorApi.getNotifications(session.id).catch(() => ({ unread_count: 0 })),
          instructorApi.getPendingClassroomPoints(scope).catch(() => []),
          instructorApi.getIssues(scope, "open").catch(() => []),
          instructorApi.getOfficeHours(scope).catch(() => []),
          instructorApi.getCourseExchangeSummary(scope).catch(() => ({})),
        ])

        setNotificationCount(notifications.unread_count ?? 0)
        void setAppBadgeCount(notifications.unread_count ?? 0)

        const pendingOfficeHours = officeHours.filter(
          (r) => r.status === "pending" || r.status === "requested",
        ).length

        setBadges({
          pendingPoints: pendingPoints.length,
          pendingIssues: issues.length,
          officeHours: pendingOfficeHours,
          courseExchange: courseExchangeDrawerBadgeCount(exchangeSummary),
        })
        lastRefreshAtRef.current = Date.now()
      } catch (err) {
        console.warn("[useFacultyShellRefresh] refresh failed", err)
        throw err
      } finally {
        refreshingRef.current = false
      }
    },
    [
      refreshMembership,
      resolveCourse,
      selectedCourse,
      session.id,
      setBadges,
      setCourses,
      setNotificationCount,
    ],
  )

  useEffect(() => {
    registerRefreshFacultyData(refreshFacultyData)
    return () => registerRefreshFacultyData(null)
  }, [registerRefreshFacultyData, refreshFacultyData])

  useEffect(() => {
    let mounted = true

    void (async () => {
      await ensureAppBootstrap(session)
      if (!mounted) return

      const cachedShell = consumeFacultyShellBootstrap()
      if (cachedShell && mounted) {
        setCourses(cachedShell.courses)
        const cachedCourse =
          (cachedShell.pickerKey
            ? cachedShell.courses.find((item) => item.picker_key === cachedShell.pickerKey)
            : null) ??
          cachedShell.courses.find((item) => item.id === cachedShell.courseId) ??
          null
        if (cachedCourse) setSelectedCourse(cachedCourse)
        setNotificationCount(cachedShell.notificationCount)
        setBadges(cachedShell.badges)
        if (cachedShell.membershipTier) {
          setMembershipTier(cachedShell.membershipTier)
        }
        setMembershipTierLoaded(true)
        lastRefreshAtRef.current = Date.now()
        setShellLoading(false)
        return
      }

      const cachedTier = await getCachedFacultyMembershipTier(session.id)
      if (!mounted) return
      if (cachedTier) {
        setMembershipTier(cachedTier)
        setMembershipTierLoaded(true)
      } else {
        setMembershipTierLoaded(false)
      }

      setShellLoading(true)
      try {
        await refreshFacultyData(undefined, { force: true })
      } catch {
        try {
          const nextCourses = await fetchFacultyCoursePickerItems(session)
          setCourses(nextCourses)
          await resolveCourse(nextCourses)
          await refreshMembership()
        } catch (err) {
          console.warn("[useFacultyShellRefresh] initial refresh failed", err)
        }
      } finally {
        if (mounted) setShellLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [
    refreshFacultyData,
    refreshMembership,
    resolveCourse,
    session.id,
    setBadges,
    setCourses,
    setMembershipTier,
    setMembershipTierLoaded,
    setNotificationCount,
    setSelectedCourse,
  ])

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void refreshFacultyData()
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => sub.remove()
  }, [refreshFacultyData])

  useFocusEffect(
    useCallback(() => {
      void refreshFacultyData()
    }, [refreshFacultyData]),
  )

  return { refreshFacultyData, shellLoading }
}

export async function persistFacultyCourse(
  instructorId: number,
  courseId: number,
  sessionCode?: string | null,
) {
  if (!Number.isFinite(courseId) || courseId <= 0) return
  await setStoredFacultyCourseId(instructorId, courseId)
  await setStoredFacultySessionCode(instructorId, courseId, sessionCode)
}
