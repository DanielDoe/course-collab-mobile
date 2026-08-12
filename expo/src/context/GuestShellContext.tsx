import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

type GuestShellContextValue = {
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

const GuestShellContext = createContext<GuestShellContextValue | null>(null)

export function GuestShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), [])

  const value = useMemo(
    () => ({ drawerOpen, openDrawer, closeDrawer, toggleDrawer }),
    [drawerOpen, openDrawer, closeDrawer, toggleDrawer],
  )

  return <GuestShellContext.Provider value={value}>{children}</GuestShellContext.Provider>
}

export function useGuestShell() {
  const ctx = useContext(GuestShellContext)
  if (!ctx) throw new Error("useGuestShell must be used within GuestShellProvider")
  return ctx
}
