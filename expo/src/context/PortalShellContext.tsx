import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

type PortalShellContextValue = {
  profileOpen: boolean
  openProfile: () => void
  closeProfile: () => void
  toggleProfile: () => void
  notificationsOpen: boolean
  openNotifications: () => void
  closeNotifications: () => void
  notificationCount: number
  setNotificationCount: (count: number) => void
}

const PortalShellContext = createContext<PortalShellContextValue | null>(null)

export function PortalShellProvider({ children }: { children: ReactNode }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  const openProfile = useCallback(() => setProfileOpen(true), [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  const toggleProfile = useCallback(() => setProfileOpen((v) => !v), [])
  const openNotifications = useCallback(() => setNotificationsOpen(true), [])
  const closeNotifications = useCallback(() => setNotificationsOpen(false), [])

  const value = useMemo(
    () => ({
      profileOpen,
      openProfile,
      closeProfile,
      toggleProfile,
      notificationsOpen,
      openNotifications,
      closeNotifications,
      notificationCount,
      setNotificationCount,
    }),
    [
      profileOpen,
      openProfile,
      closeProfile,
      toggleProfile,
      notificationsOpen,
      openNotifications,
      closeNotifications,
      notificationCount,
    ],
  )

  return <PortalShellContext.Provider value={value}>{children}</PortalShellContext.Provider>
}

export function usePortalShell() {
  const ctx = useContext(PortalShellContext)
  if (!ctx) throw new Error("usePortalShell must be used within PortalShellProvider")
  return ctx
}
