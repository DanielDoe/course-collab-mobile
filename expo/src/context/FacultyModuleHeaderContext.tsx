import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname } from "expo-router"

export type FacultyModuleNestedHeader = {
  title: string
  onBack: () => void
}

type FacultyModuleHeaderContextValue = {
  nestedHeader: FacultyModuleNestedHeader | null
  setNestedHeader: (header: FacultyModuleNestedHeader | null) => void
}

const FacultyModuleHeaderContext = createContext<FacultyModuleHeaderContextValue | null>(null)

export function FacultyModuleHeaderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [nestedHeader, setNestedHeaderState] = useState<FacultyModuleNestedHeader | null>(null)

  useEffect(() => {
    setNestedHeaderState(null)
  }, [pathname])

  const setNestedHeader = useCallback((header: FacultyModuleNestedHeader | null) => {
    setNestedHeaderState(header)
  }, [])

  const value = useMemo(
    () => ({ nestedHeader, setNestedHeader }),
    [nestedHeader, setNestedHeader],
  )

  return <FacultyModuleHeaderContext.Provider value={value}>{children}</FacultyModuleHeaderContext.Provider>
}

export function useFacultyModuleHeader() {
  const ctx = useContext(FacultyModuleHeaderContext)
  if (!ctx) throw new Error("useFacultyModuleHeader must be used within FacultyModuleHeaderProvider")
  return ctx
}

/** Optional read for shell chrome that may render outside the provider in tests. */
export function useFacultyModuleHeaderOptional() {
  return useContext(FacultyModuleHeaderContext)
}

/** Push a nested module title + back action into the faculty top bar (replaces menu + module name). */
export function useFacultyModuleNestedHeader({
  active,
  title,
  onBack,
}: {
  active: boolean
  title: string
  onBack: () => void
}) {
  const { setNestedHeader } = useFacultyModuleHeader()

  useEffect(() => {
    if (!active) {
      setNestedHeader(null)
      return
    }
    setNestedHeader({ title, onBack })
    return () => setNestedHeader(null)
  }, [active, title, onBack, setNestedHeader])
}
