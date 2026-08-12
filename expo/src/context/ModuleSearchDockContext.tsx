import { createContext, useContext, useEffect } from "react"
import { usePathname } from "expo-router"
import type { ModuleSearchDockEntry } from "./module-search-dock-types"

export type { ModuleSearchDockEntry } from "./module-search-dock-types"

type ModuleSearchDockContextValue = {
  register: (id: string, entry: ModuleSearchDockEntry | null) => void
  bottomInset: number
}

export const ModuleSearchDockContext = createContext<ModuleSearchDockContextValue>({
  register: () => {},
  bottomInset: 0,
})

/** Space reserved under module scroll areas when the bottom search dock is visible. */
export function useSearchDockBottomInset(): number {
  return useContext(ModuleSearchDockContext).bottomInset
}

export function useModuleSearchDockRegistration(
  id: string,
  entry: ModuleSearchDockEntry | null,
) {
  const pathname = usePathname()
  const { register } = useContext(ModuleSearchDockContext)

  useEffect(() => {
    register(id, entry)
    return () => register(id, null)
  }, [id, register, entry, pathname])
}
