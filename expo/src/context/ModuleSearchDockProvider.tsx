import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useLocalSearchParams, usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  GlassBottomSearchDock,
  LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP,
  LIQUID_GLASS_SEARCH_DOCK_PILL_HEIGHT,
} from "../components/theme/GlassBottomSearchDock"
import {
  FacultyModuleSearchInner,
  FacultySearchToolbarInner,
} from "../components/faculty/faculty-module-shell"
import { StudentSearchToolbarInner } from "../components/student/student-search-toolbar"
import type { ModuleSearchDockEntry } from "./module-search-dock-types"
import { ModuleSearchDockContext } from "./ModuleSearchDockContext"

export const MODULE_SEARCH_DOCK_BODY_HEIGHT = LIQUID_GLASS_SEARCH_DOCK_PILL_HEIGHT

/** Guest letter dock: pill + chip row. */
export const MODULE_SEARCH_DOCK_CUSTOM_HEIGHT = LIQUID_GLASS_SEARCH_DOCK_PILL_HEIGHT + 36

/** Stack screens stay mounted — hide the dock on routes that never host module search. */
function shouldHideSearchDock(pathname: string): boolean {
  if (/^\/messages\//.test(pathname)) return true
  if (pathname === "/dashboard") return true
  if (pathname === "/membership") return true
  if (pathname.startsWith("/settings")) return true
  if (pathname.startsWith("/assessment/")) return true
  if (pathname.startsWith("/(auth)/") || pathname.startsWith("/auth/")) return true
  if (
    pathname === "/login" ||
    pathname === "/signing-in" ||
    pathname === "/appearance-setup" ||
    pathname === "/change-password" ||
    pathname.startsWith("/onboarding-")
  ) {
    return true
  }
  if (pathname.startsWith("/collaboration/")) return true
  if (pathname.startsWith("/notes/")) return true
  if (pathname.startsWith("/flashcards/")) return true
  if (pathname === "/module/ai-tutor" || pathname.startsWith("/module/ai-tutor/")) return true
  if (pathname.startsWith("/practice/")) return true
  if (pathname.startsWith("/codebench/")) return true
  if (pathname.startsWith("/notetaker/")) return true
  if (pathname.startsWith("/lecture/")) return true
  if (pathname.startsWith("/faculty/lecture/")) return true
  if (pathname.startsWith("/announcements/")) return true
  if (pathname === "/web") return true
  return false
}

function computeBottomInset(entry: ModuleSearchDockEntry | null, bottomSafeArea: number): number {
  if (!entry) return 0
  const bodyHeight =
    entry.kind === "custom" ? MODULE_SEARCH_DOCK_CUSTOM_HEIGHT : MODULE_SEARCH_DOCK_BODY_HEIGHT
  return bodyHeight + LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP + Math.max(bottomSafeArea, 10)
}

export function ModuleSearchDockProvider({
  children,
  suppressDock = false,
}: {
  children: ReactNode
  suppressDock?: boolean
}) {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const moduleId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : ""
  const dockScope = `${pathname}:${moduleId}`
  const [sheetSuppressIds, setSheetSuppressIds] = useState<Set<string>>(new Set())
  const hideDock = suppressDock || shouldHideSearchDock(pathname) || sheetSuppressIds.size > 0
  const [entries, setEntries] = useState<Map<string, ModuleSearchDockEntry>>(new Map())

  useEffect(() => {
    // Drop leaked sheet suppress from the previous module. Do not wipe
    // registrations here — that races the child register effect and hides the dock.
    setSheetSuppressIds(new Set())
  }, [dockScope])

  const register = useCallback((id: string, entry: ModuleSearchDockEntry | null) => {
    setEntries((prev) => {
      const next = new Map(prev)
      if (entry) next.set(id, entry)
      else next.delete(id)
      return next
    })
  }, [])

  const setSheetSuppress = useCallback((id: string, active: boolean) => {
    setSheetSuppressIds((prev) => {
      const has = prev.has(id)
      if (active && has) return prev
      if (!active && !has) return prev
      const next = new Set(prev)
      if (active) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const activeEntry = useMemo(() => {
    const values = Array.from(entries.values())
    return values.length > 0 ? values[values.length - 1]! : null
  }, [entries])

  const bottomInset = hideDock ? 0 : computeBottomInset(activeEntry, insets.bottom)

  const value = useMemo(
    () => ({ register, bottomInset, setSheetSuppress }),
    [register, bottomInset, setSheetSuppress],
  )

  return (
    <ModuleSearchDockContext.Provider value={value}>
      <View style={styles.providerRoot}>
        {children}
        {activeEntry && !hideDock ? (
          <GlassBottomSearchDock key={dockScope}>
            {activeEntry.kind === "student" ? (
              <StudentSearchToolbarInner {...activeEntry.props} embedded />
            ) : activeEntry.kind === "faculty-toolbar" ? (
              <FacultySearchToolbarInner {...activeEntry.props} embedded />
            ) : activeEntry.kind === "faculty-search" ? (
              <FacultyModuleSearchInner {...activeEntry.props} embedded />
            ) : (
              activeEntry.node
            )}
          </GlassBottomSearchDock>
        ) : null}
      </View>
    </ModuleSearchDockContext.Provider>
  )
}

const styles = StyleSheet.create({
  providerRoot: { flex: 1 },
})
