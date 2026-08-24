import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { InstructorCourse } from "../lib/instructor-api"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { RefreshFacultyDataFn } from "../lib/faculty-shell-refresh-types"
import { setFacultyQueryCourseId } from "../lib/query/faculty-course"

export type FacultyBadges = {
  pendingPoints: number
  pendingIssues: number
  officeHours: number
  courseExchange: number
}

type FacultyShellContextValue = {
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  profileOpen: boolean
  openProfile: () => void
  closeProfile: () => void
  toggleProfile: () => void
  notificationsOpen: boolean
  openNotifications: () => void
  closeNotifications: () => void
  toggleNotifications: () => void
  coursePickerOpen: boolean
  openCoursePicker: () => void
  closeCoursePicker: () => void
  selectedCourse: InstructorCourse | null
  setSelectedCourse: (course: InstructorCourse | null) => void
  courses: InstructorCourse[]
  setCourses: (courses: InstructorCourse[]) => void
  notificationCount: number
  setNotificationCount: (count: number) => void
  badges: FacultyBadges
  setBadges: (badges: Partial<FacultyBadges>) => void
  membershipTier: FacultyMembershipTier
  membershipTierLoaded: boolean
  setMembershipTier: (tier: FacultyMembershipTier) => void
  setMembershipTierLoaded: (loaded: boolean) => void
  refreshFacultyData: RefreshFacultyDataFn | null
  registerRefreshFacultyData: (fn: RefreshFacultyDataFn | null) => void
}

const FacultyShellContext = createContext<FacultyShellContextValue | null>(null)

export { FacultyShellContext }

export function FacultyShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [coursePickerOpen, setCoursePickerOpen] = useState(false)
  const [selectedCourse, setSelectedCourseState] = useState<InstructorCourse | null>(null)
  const setSelectedCourse = useCallback((course: InstructorCourse | null) => {
    setSelectedCourseState(course)
    setFacultyQueryCourseId(course?.id ?? null)
  }, [])
  const [courses, setCourses] = useState<InstructorCourse[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [badges, setBadgesState] = useState<FacultyBadges>({
    pendingPoints: 0,
    pendingIssues: 0,
    officeHours: 0,
    courseExchange: 0,
  })
  const [membershipTier, setMembershipTier] = useState<FacultyMembershipTier>("Free")
  const [membershipTierLoaded, setMembershipTierLoaded] = useState(false)
  const [refreshFacultyData, setRefreshFacultyDataState] = useState<RefreshFacultyDataFn | null>(null)

  const registerRefreshFacultyData = useCallback((fn: RefreshFacultyDataFn | null) => {
    setRefreshFacultyDataState(() => fn)
  }, [])

  const setBadges = useCallback((partial: Partial<FacultyBadges>) => {
    setBadgesState((prev) => ({ ...prev, ...partial }))
  }, [])

  const closeOverlays = useCallback(() => {
    setProfileOpen(false)
    setNotificationsOpen(false)
    setCoursePickerOpen(false)
  }, [])

  const openDrawer = useCallback(() => {
    closeOverlays()
    setDrawerOpen(true)
  }, [closeOverlays])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((v) => {
      if (!v) closeOverlays()
      return !v
    })
  }, [closeOverlays])

  const openProfile = useCallback(() => {
    setDrawerOpen(false)
    setNotificationsOpen(false)
    setCoursePickerOpen(false)
    setProfileOpen(true)
  }, [])

  const closeProfile = useCallback(() => setProfileOpen(false), [])

  const toggleProfile = useCallback(() => {
    setProfileOpen((v) => {
      if (!v) {
        setDrawerOpen(false)
        setNotificationsOpen(false)
        setCoursePickerOpen(false)
      }
      return !v
    })
  }, [])

  const openNotifications = useCallback(() => {
    setDrawerOpen(false)
    setProfileOpen(false)
    setCoursePickerOpen(false)
    setNotificationsOpen(true)
  }, [])

  const closeNotifications = useCallback(() => setNotificationsOpen(false), [])

  const toggleNotifications = useCallback(() => {
    setNotificationsOpen((v) => {
      if (!v) {
        setDrawerOpen(false)
        setProfileOpen(false)
        setCoursePickerOpen(false)
      }
      return !v
    })
  }, [])

  const openCoursePicker = useCallback(() => {
    setDrawerOpen(false)
    setProfileOpen(false)
    setNotificationsOpen(false)
    setCoursePickerOpen(true)
  }, [])

  const closeCoursePicker = useCallback(() => setCoursePickerOpen(false), [])

  const value = useMemo(
    () => ({
      drawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      profileOpen,
      openProfile,
      closeProfile,
      toggleProfile,
      notificationsOpen,
      openNotifications,
      closeNotifications,
      toggleNotifications,
      coursePickerOpen,
      openCoursePicker,
      closeCoursePicker,
      selectedCourse,
      setSelectedCourse,
      courses,
      setCourses,
      notificationCount,
      setNotificationCount,
      badges,
      setBadges,
      membershipTier,
      membershipTierLoaded,
      setMembershipTier,
      setMembershipTierLoaded,
      refreshFacultyData,
      registerRefreshFacultyData}),
    [
      drawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      profileOpen,
      openProfile,
      closeProfile,
      toggleProfile,
      notificationsOpen,
      openNotifications,
      closeNotifications,
      toggleNotifications,
      coursePickerOpen,
      openCoursePicker,
      closeCoursePicker,
      selectedCourse,
      courses,
      notificationCount,
      badges,
      membershipTier,
      membershipTierLoaded,
      refreshFacultyData,
      registerRefreshFacultyData,
    ],
  )

  return <FacultyShellContext.Provider value={value}>{children}</FacultyShellContext.Provider>
}

export function useFacultyShell() {
  const ctx = useContext(FacultyShellContext)
  if (!ctx) throw new Error("useFacultyShell must be used within FacultyShellProvider")
  return ctx
}

export function useOptionalFacultyShell() {
  return useContext(FacultyShellContext)
}
