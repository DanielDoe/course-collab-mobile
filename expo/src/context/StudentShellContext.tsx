import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { MembershipTier } from "../types/dashboard"
import type { RefreshStudentDataFn } from "../lib/faculty-shell-refresh-types"
import {
  EMPTY_STUDENT_BADGES,
  type StudentBadges,
} from "../lib/module-nav-badges"

type StudentShellContextValue = {
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
  membershipTier: MembershipTier
  membershipTierLoaded: boolean
  setMembershipTier: (tier: MembershipTier) => void
  setMembershipTierLoaded: (loaded: boolean) => void
  classroomPoints: number
  setClassroomPoints: (points: number) => void
  notificationCount: number
  setNotificationCount: (count: number) => void
  unreadMessagesCount: number
  setUnreadMessagesCount: (count: number) => void
  badges: StudentBadges
  setBadges: (partial: Partial<StudentBadges>) => void
  refreshStudentData: RefreshStudentDataFn | null
  registerRefreshStudentData: (fn: RefreshStudentDataFn | null) => void
}

const StudentShellContext = createContext<StudentShellContextValue | null>(null)

export { StudentShellContext }

export function StudentShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [coursePickerOpen, setCoursePickerOpen] = useState(false)
  const [membershipTier, setMembershipTier] = useState<MembershipTier>("Scholar")
  const [membershipTierLoaded, setMembershipTierLoaded] = useState(false)
  const [classroomPoints, setClassroomPoints] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [badges, setBadgesState] = useState<StudentBadges>(EMPTY_STUDENT_BADGES)
  const [refreshStudentData, setRefreshStudentDataState] = useState<RefreshStudentDataFn | null>(null)

  const setBadges = useCallback((partial: Partial<StudentBadges>) => {
    setBadgesState((prev) => {
      let changed = false
      for (const key of Object.keys(partial) as (keyof StudentBadges)[]) {
        if (prev[key] !== partial[key]) {
          changed = true
          break
        }
      }
      if (!changed) return prev
      return { ...prev, ...partial }
    })
  }, [])

  const registerRefreshStudentData = useCallback((fn: RefreshStudentDataFn | null) => {
    setRefreshStudentDataState(() => fn)
  }, [])

  const openDrawer = useCallback(() => {
    setProfileOpen(false)
    setNotificationsOpen(false)
    setCoursePickerOpen(false)
    setDrawerOpen(true)
  }, [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => {
    setDrawerOpen((v) => {
      if (!v) {
        setProfileOpen(false)
        setNotificationsOpen(false)
        setCoursePickerOpen(false)
      }
      return !v
    })
  }, [])

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
      membershipTier,
      membershipTierLoaded,
      setMembershipTier,
      setMembershipTierLoaded,
      classroomPoints,
      setClassroomPoints,
      notificationCount,
      setNotificationCount,
      unreadMessagesCount,
      setUnreadMessagesCount,
      badges,
      setBadges,
      refreshStudentData,
      registerRefreshStudentData}),
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
      membershipTier,
      membershipTierLoaded,
      classroomPoints,
      notificationCount,
      unreadMessagesCount,
      badges,
      setBadges,
      refreshStudentData,
      registerRefreshStudentData,
    ],
  )

  return <StudentShellContext.Provider value={value}>{children}</StudentShellContext.Provider>
}

export function useStudentShell() {
  const ctx = useContext(StudentShellContext)
  if (!ctx) throw new Error("useStudentShell must be used within StudentShellProvider")
  return ctx
}

export function useOptionalStudentShell() {
  return useContext(StudentShellContext)
}
