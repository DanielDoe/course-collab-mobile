import { createContext, useContext, useEffect, useId } from "react"
import { useLocalSearchParams, usePathname } from "expo-router"
import type { ModuleSearchDockEntry } from "./module-search-dock-types"

export type { ModuleSearchDockEntry } from "./module-search-dock-types"

type ModuleSearchDockContextValue = {
  register: (id: string, entry: ModuleSearchDockEntry | null) => void
  bottomInset: number
  setSheetSuppress: (id: string, active: boolean) => void
}

export const ModuleSearchDockContext = createContext<ModuleSearchDockContextValue>({
  register: () => {},
  bottomInset: 0,
  setSheetSuppress: () => {},
})

/**
 * Hide the Liquid Glass search dock while a page-sheet / modal is up so IME and
 * Maestro `inputText` land on the sheet field instead of the dock underneath.
 */
export function useSuppressModuleSearchDock(active: boolean) {
  const id = useId()
  const { setSheetSuppress } = useContext(ModuleSearchDockContext)

  useEffect(() => {
    setSheetSuppress(id, active)
    return () => setSheetSuppress(id, false)
  }, [id, active, setSheetSuppress])
}

/** Space reserved under module scroll areas when the bottom search dock is visible. */
export function useSearchDockBottomInset(): number {
  return useContext(ModuleSearchDockContext).bottomInset
}

export function useModuleSearchDockRegistration(
  id: string,
  entry: ModuleSearchDockEntry | null,
) {
  const pathname = usePathname()
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const moduleId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : ""
  const { register } = useContext(ModuleSearchDockContext)

  useEffect(() => {
    register(id, entry)
    return () => register(id, null)
  }, [id, register, entry, pathname, moduleId])
}
