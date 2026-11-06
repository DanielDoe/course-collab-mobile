/**
 * Dock registration equality that ignores callback identity.
 *
 * Screens commonly pass inline `onPress` / `onChange` / `onOpenFilter`.
 * Comparing those by reference makes `setEntries` fire every render and
 * can produce "Maximum update depth exceeded".
 */

type TrailingVisual = {
  accessibilityLabel?: string
  icon?: string
  badgeCount?: number
} | null | undefined

type StudentDockProps = {
  value?: string
  placeholder?: string
  placement?: string
  showFilter?: boolean
  showSearch?: boolean
  filterActive?: boolean
  filterLabel?: string
  trailingAction?: TrailingVisual
  onChange?: unknown
  onOpenFilter?: unknown
}

type PersistRailVisual = {
  statusLabel?: string
  dirty?: boolean
  saving?: boolean
  saveLabel?: string
  publishLabel?: string
} | null | undefined

type FacultyToolbarProps = {
  value?: string
  placeholder?: string
  placement?: string
  showFilter?: boolean
  showSearch?: boolean
  filterActive?: boolean
  filterLabel?: string
  trailingAction?: TrailingVisual
  persistRail?: PersistRailVisual
  onChange?: unknown
  onOpenFilter?: unknown
}

export type DockEntryLike =
  | { kind: "student"; props: StudentDockProps }
  | { kind: "faculty-toolbar"; props: FacultyToolbarProps }
  | { kind: "faculty-search"; props: { value?: string; placeholder?: string; onChange?: unknown } }
  | { kind: "custom"; node: unknown }

function trailingVisualEqual(a: TrailingVisual, b: TrailingVisual): boolean {
  return (
    a?.accessibilityLabel === b?.accessibilityLabel &&
    a?.icon === b?.icon &&
    a?.badgeCount === b?.badgeCount
  )
}

function persistRailVisualEqual(a: PersistRailVisual, b: PersistRailVisual): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return (
    a.statusLabel === b.statusLabel &&
    a.dirty === b.dirty &&
    a.saving === b.saving &&
    a.saveLabel === b.saveLabel &&
    a.publishLabel === b.publishLabel
  )
}

export function dockEntryEquals(a: DockEntryLike, b: DockEntryLike): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === "custom" && b.kind === "custom") return a.node === b.node
  if (a.kind === "student" && b.kind === "student") {
    const ap = a.props
    const bp = b.props
    return (
      ap.value === bp.value &&
      ap.placeholder === bp.placeholder &&
      ap.placement === bp.placement &&
      ap.showFilter === bp.showFilter &&
      ap.showSearch === bp.showSearch &&
      ap.filterActive === bp.filterActive &&
      ap.filterLabel === bp.filterLabel &&
      trailingVisualEqual(ap.trailingAction, bp.trailingAction)
    )
  }
  if (a.kind === "faculty-toolbar" && b.kind === "faculty-toolbar") {
    const ap = a.props
    const bp = b.props
    return (
      ap.value === bp.value &&
      ap.placeholder === bp.placeholder &&
      ap.placement === bp.placement &&
      ap.showFilter === bp.showFilter &&
      ap.showSearch === bp.showSearch &&
      ap.filterActive === bp.filterActive &&
      ap.filterLabel === bp.filterLabel &&
      trailingVisualEqual(ap.trailingAction, bp.trailingAction) &&
      persistRailVisualEqual(ap.persistRail, bp.persistRail)
    )
  }
  if (a.kind === "faculty-search" && b.kind === "faculty-search") {
    return a.props.value === b.props.value && a.props.placeholder === b.props.placeholder
  }
  return false
}

/** Keep the stored dock entry pointing at the latest handlers without a state update. */
export function patchDockEntryCallbacks(target: DockEntryLike, source: DockEntryLike): void {
  if (target.kind !== source.kind) return
  if (target.kind === "student" && source.kind === "student") {
    target.props.onChange = source.props.onChange
    target.props.onOpenFilter = source.props.onOpenFilter
    if (target.props.trailingAction && source.props.trailingAction) {
      ;(target.props.trailingAction as { onPress?: unknown }).onPress = (
        source.props.trailingAction as { onPress?: unknown }
      ).onPress
    }
    return
  }
  if (target.kind === "faculty-toolbar" && source.kind === "faculty-toolbar") {
    target.props.onChange = source.props.onChange
    target.props.onOpenFilter = source.props.onOpenFilter
    if (target.props.trailingAction && source.props.trailingAction) {
      ;(target.props.trailingAction as { onPress?: unknown }).onPress = (
        source.props.trailingAction as { onPress?: unknown }
      ).onPress
    }
    const targetRail = target.props.persistRail as { onSaveDraft?: unknown; onPublish?: unknown } | undefined
    const sourceRail = source.props.persistRail as { onSaveDraft?: unknown; onPublish?: unknown } | undefined
    if (targetRail && sourceRail) {
      targetRail.onSaveDraft = sourceRail.onSaveDraft
      targetRail.onPublish = sourceRail.onPublish
    }
    return
  }
  if (target.kind === "faculty-search" && source.kind === "faculty-search") {
    target.props.onChange = source.props.onChange
  }
}

export type ScopedDockRegistration<T> = { scope: string; entry: T }

/** Pathname-only. The shell cannot see `/module/[id]`, so `:moduleId` never matched. */
export function moduleDockScope(pathname: string): string {
  const path = pathname.replace(/\/+$/, "")
  return path || "/"
}

export function dockScopesMatch(ownerScope: string, liveScope: string): boolean {
  if (ownerScope === liveScope) return true
  return moduleDockScope(ownerScope.split(":")[0] ?? "") === moduleDockScope(liveScope.split(":")[0] ?? "")
}

/**
 * Stack screens stay mounted (`freezeOnBlur`). A previous module's dock must
 * not win just because it registered last — only the current route's entry.
 */
export function pickActiveDockEntry<T>(
  registrations: Iterable<ScopedDockRegistration<T>>,
  dockScope: string,
): T | null {
  let last: T | null = null
  for (const item of registrations) {
    if (dockScopesMatch(item.scope, dockScope)) last = item.entry
  }
  return last
}
