import { CHROME_CONTENT_TOP_GAP } from "./chrome-inset-layout"

export type ModuleListPagePreset = "compact" | "lecture" | "standard" | "tall"

export const MODULE_LIST_ROW_GAP = 10
export const MODULE_LIST_PAGER_HEIGHT = 48
export const MODULE_LIST_DUAL_PAGER_HEIGHT = 88
/** Fixed footer when only the range label is shown (no Previous / Next). */
export const MODULE_LIST_PAGER_LABEL_HEIGHT = 40
/** Extra scroll breathing room so the pager row stays above the search dock. */
export const MODULE_LIST_VIEWPORT_BUFFER = 16

export function moduleListPagerChromeHeight(total: number, pageCount: number): number {
  if (total <= 0) return 0
  return pageCount > 1 ? MODULE_LIST_DUAL_PAGER_HEIGHT : MODULE_LIST_PAGER_LABEL_HEIGHT
}

export const MODULE_LIST_PAGE_PRESETS = {
  /** Leaderboard / dense rows (~PracticeLeaderboardListCard). */
  compact: { rowHeight: 72, min: 5, max: 14 },
  /** Student lecture lists — dynamic 4–7 rows; keeps Previous/Next for typical courses. */
  lecture: { rowHeight: 88, min: 4, max: 7 },
  /** SignatureListCard / most module lists. */
  standard: { rowHeight: 88, min: 4, max: 12 },
  /** Faculty lecture rows with description + pills. */
  tall: { rowHeight: 104, min: 4, max: 6 },
} as const satisfies Record<ModuleListPagePreset, { rowHeight: number; min: number; max: number }>

/** @deprecated Use MODULE_LIST_PAGE_PRESETS.standard min via resolveModuleListPageSize. */
export const LECTURE_LIST_CARD_HEIGHT = MODULE_LIST_PAGE_PRESETS.standard.rowHeight
export const LECTURE_LIST_ROW_GAP = MODULE_LIST_ROW_GAP
export const LECTURE_LIST_PAGER_HEIGHT = MODULE_LIST_PAGER_HEIGHT
export const LECTURE_LIST_PAGE_SIZE_MIN = MODULE_LIST_PAGE_PRESETS.lecture.min
export const LECTURE_LIST_PAGE_SIZE_MAX = MODULE_LIST_PAGE_PRESETS.lecture.max
export const FACULTY_LECTURE_LIST_CARD_HEIGHT = MODULE_LIST_PAGE_PRESETS.tall.rowHeight
export const FACULTY_LECTURE_LIST_PAGER_HEIGHT = MODULE_LIST_DUAL_PAGER_HEIGHT

export type ModuleListPageSizeOptions = {
  windowHeight: number
  topInset?: number
  bottomInset?: number
  contentTopGap?: number
  preset?: ModuleListPagePreset
  rowHeight?: number
  rowGap?: number
  pagerHeight?: number
  minPageSize?: number
  maxPageSize?: number
  viewportBuffer?: number
}

/** Fit as many list rows as the viewport allows before showing pagination. */
export function resolveModuleListPageSize({
  windowHeight,
  topInset = 0,
  bottomInset = 0,
  contentTopGap = CHROME_CONTENT_TOP_GAP,
  preset = "standard",
  rowHeight,
  rowGap = MODULE_LIST_ROW_GAP,
  pagerHeight = MODULE_LIST_PAGER_HEIGHT,
  minPageSize,
  maxPageSize,
  viewportBuffer = MODULE_LIST_VIEWPORT_BUFFER,
}: ModuleListPageSizeOptions): number {
  const presetConfig = MODULE_LIST_PAGE_PRESETS[preset]
  const resolvedRowHeight = rowHeight ?? presetConfig.rowHeight
  const resolvedMin = minPageSize ?? presetConfig.min
  const resolvedMax = maxPageSize ?? presetConfig.max

  if (!Number.isFinite(windowHeight) || windowHeight <= 0) {
    return resolvedMin
  }

  const reservedTop = topInset > 0 ? topInset + contentTopGap : contentTopGap
  const listViewport = windowHeight - reservedTop - bottomInset - pagerHeight - viewportBuffer
  if (listViewport <= resolvedRowHeight) {
    return resolvedMin
  }

  const raw = Math.floor((listViewport + rowGap) / (resolvedRowHeight + rowGap))
  return Math.min(resolvedMax, Math.max(resolvedMin, raw))
}

/** @deprecated Prefer resolveModuleListPageSize. */
export function resolveLectureListPageSize(options: ModuleListPageSizeOptions): number {
  return resolveModuleListPageSize(options)
}
