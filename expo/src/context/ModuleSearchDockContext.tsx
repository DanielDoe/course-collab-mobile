import { createContext, useContext, useEffect, useId, useRef } from "react"
import { usePathname } from "expo-router"
import type { ModuleSearchDockEntry } from "./module-search-dock-types"
import { moduleDockScope } from "./module-search-dock-equals"

export type { ModuleSearchDockEntry } from "./module-search-dock-types"

type ModuleSearchDockContextValue = {
  register: (id: string, entry: ModuleSearchDockEntry | null, ownerScope?: string) => void
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
  const currentScope = moduleDockScope(pathname)
  // Capture the route this screen was mounted for. A kept-alive previous module
  // must not re-register onto the next route (that leaked Projects search onto Calendar).
  const ownerScopeRef = useRef(currentScope)
  const { register } = useContext(ModuleSearchDockContext)

  useEffect(() => {
    // Always keep this screen's entry tagged with the route it was mounted for.
    // Frozen previous modules will not re-run this effect — the provider
    // ignores entries whose scope is not the live route.
    register(id, entry, ownerScopeRef.current)
    return () => register(id, null, ownerScopeRef.current)
  }, [id, register, entry, currentScope])
}
