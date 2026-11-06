import {
  COMPACT_PHONE_MAX_WIDTH,
  KPI_GRID_SINGLE_COLUMN_MAX_WIDTH,
  LARGE_TABLET_MIN_WIDTH,
  TABLET_MIN_WIDTH,
} from "./responsive-layout-breakpoints"

/** Horizontal gutter for module scroll pages — wider than 16pt on modern phones. */
export function modulePageHorizontalPadding(screenWidth: number): number {
  if (screenWidth >= LARGE_TABLET_MIN_WIDTH) return 32
  if (screenWidth >= TABLET_MIN_WIDTH) return 24
  if (screenWidth <= COMPACT_PHONE_MAX_WIDTH) return 16
  return 20
}

export function modulePageStackGap(screenWidth: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) return 16
  return 14
}

export function modulePageCardPadding(screenWidth: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) return 20
  if (screenWidth <= COMPACT_PHONE_MAX_WIDTH) return 14
  return 18
}

export type ModulePageLayout = {
  width: number
  height: number
  horizontalPadding: number
  stackGap: number
  cardPadding: number
  cardGap: number
  isCompactPhone: boolean
  isTablet: boolean
  isWidePhone: boolean
  stackStats: boolean
  joinActionsHorizontal: boolean
}

export function modulePageLayout(width: number, height: number): ModulePageLayout {
  return {
    width,
    height,
    horizontalPadding: modulePageHorizontalPadding(width),
    stackGap: modulePageStackGap(width),
    cardPadding: modulePageCardPadding(width),
    cardGap: width >= TABLET_MIN_WIDTH ? 14 : 12,
    isCompactPhone: width < COMPACT_PHONE_MAX_WIDTH,
    isTablet: width >= TABLET_MIN_WIDTH,
    isWidePhone: width >= 400,
    stackStats: width < KPI_GRID_SINGLE_COLUMN_MAX_WIDTH,
    joinActionsHorizontal: width >= 400,
  }
}
