import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

type SummerShellContextValue = {
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

const SummerShellContext = createContext<SummerShellContextValue | null>(null)

export function SummerShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), [])

  const value = useMemo(
    () => ({ drawerOpen, openDrawer, closeDrawer, toggleDrawer }),
    [drawerOpen, openDrawer, closeDrawer, toggleDrawer],
  )

  return <SummerShellContext.Provider value={value}>{children}</SummerShellContext.Provider>
}

export function useSummerShell() {
  const ctx = useContext(SummerShellContext)
  if (!ctx) throw new Error("useSummerShell must be used within SummerShellProvider")
  return ctx
}
