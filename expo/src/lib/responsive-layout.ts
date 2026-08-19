import { useMemo } from "react"
import { useWindowDimensions, type ViewStyle } from "react-native"

/** Below this logical width, two-column grids stack in a single column. */
export const KPI_GRID_SINGLE_COLUMN_MAX_WIDTH = 340

/** Logical width treated as a compact phone (e.g. iPhone SE). */
export const COMPACT_PHONE_MAX_WIDTH = 375

/** Max content width for dashboard scroll areas on tablet / wide phones. */
export const DASHBOARD_CONTENT_MAX_WIDTH = 720

/** Max content width for module lists and prose on tablet. */
export const MODULE_CONTENT_MAX_WIDTH = 840

/** Logical width at which auth/onboarding flows expand for tablet. */
export const TABLET_MIN_WIDTH = 768

/** Large tablet breakpoint (e.g. iPad Pro 12.9"/13"). */
export const LARGE_TABLET_MIN_WIDTH = 1024

/** Phone max width for onboarding/legal scroll areas. */
export const AUTH_FLOW_PHONE_MAX_WIDTH = 560

/** Phone max width for login forms and compact auth steps. */
export const AUTH_FORM_PHONE_MAX_WIDTH = 440

/** Upper cap for auth flow content on large tablets (readability). */
export const AUTH_FLOW_TABLET_MAX_WIDTH = 920

/** Modal card width on phone vs tablet. */
export const MODAL_CARD_PHONE_MAX_WIDTH = 360
export const MODAL_CARD_TABLET_MAX_WIDTH = 480

/** Side panel caps — drawer and Cora history. */
export const DRAWER_PANEL_PHONE_MAX_WIDTH = 328
export const DRAWER_PANEL_TABLET_MAX_WIDTH = 400
export const CORA_HISTORY_PHONE_MAX_WIDTH = 320
export const CORA_HISTORY_TABLET_MAX_WIDTH = 380

export function useIsTabletLayout(): boolean {
  const { width } = useWindowDimensions()
  return width >= TABLET_MIN_WIDTH
}

export function moduleContentMaxWidth(screenWidth: number): number {
  if (screenWidth < TABLET_MIN_WIDTH) return screenWidth
  return Math.min(MODULE_CONTENT_MAX_WIDTH, Math.round(screenWidth * 0.88))
}

export function dashboardContentMaxWidth(screenWidth: number): number {
  if (screenWidth < TABLET_MIN_WIDTH) {
    return Math.min(screenWidth, DASHBOARD_CONTENT_MAX_WIDTH)
  }
  return Math.min(MODULE_CONTENT_MAX_WIDTH, Math.round(screenWidth * 0.88))
}

export function authFlowContentMaxWidth(
  screenWidth: number,
  phoneMax: number = AUTH_FLOW_PHONE_MAX_WIDTH,
): number {
  const horizontalPad = 40
  if (screenWidth < TABLET_MIN_WIDTH) {
    return Math.min(screenWidth - horizontalPad, phoneMax)
  }
  const tabletTarget = Math.min(
    AUTH_FLOW_TABLET_MAX_WIDTH,
    Math.round(screenWidth * 0.85),
  )
  return Math.max(phoneMax, tabletTarget)
}

export function useAuthFlowContentStyle(
  phoneMax: number = AUTH_FLOW_PHONE_MAX_WIDTH,
): ViewStyle {
  const { width } = useWindowDimensions()
  return useMemo(
    () => ({
      width: "100%",
      maxWidth: authFlowContentMaxWidth(width, phoneMax),
      alignSelf: "center",
    }),
    [phoneMax, width],
  )
}

export function useModuleContentStyle(): ViewStyle {
  const { width } = useWindowDimensions()
  return useMemo(() => {
    if (width < TABLET_MIN_WIDTH) {
      return { width: "100%" }
    }
    return {
      width: "100%",
      maxWidth: moduleContentMaxWidth(width),
      alignSelf: "center",
    }
  }, [width])
}

export function chartContentWidth(screenWidth: number, horizontalPad = 64): number {
  const capped = dashboardContentMaxWidth(screenWidth)
  return Math.max(260, Math.min(screenWidth - horizontalPad, capped - horizontalPad))
}

export function useChartContentWidth(horizontalPad = 64): number {
  const { width } = useWindowDimensions()
  return useMemo(() => chartContentWidth(width, horizontalPad), [width, horizontalPad])
}

export function modalCardMaxWidth(screenWidth: number, phoneMax = MODAL_CARD_PHONE_MAX_WIDTH): number {
  if (screenWidth < TABLET_MIN_WIDTH) {
    return Math.min(screenWidth - 48, phoneMax)
  }
  return Math.min(screenWidth - 64, MODAL_CARD_TABLET_MAX_WIDTH)
}

export function useModalCardStyle(phoneMax = MODAL_CARD_PHONE_MAX_WIDTH): ViewStyle {
  const { width } = useWindowDimensions()
  return useMemo(
    () => ({
      width: "100%",
      maxWidth: modalCardMaxWidth(width, phoneMax),
      alignSelf: "center",
    }),
    [phoneMax, width],
  )
}

export function useResponsiveGridColumns(options: {
  minColumnWidth: number
  maxColumns?: number
  gap?: number
  horizontalPad?: number
  canvasMax?: number
}): { columns: number; columnWidth: number; canvasWidth: number } {
  const { width } = useWindowDimensions()
  return useMemo(() => {
    const {
      minColumnWidth,
      maxColumns = 4,
      gap = 12,
      horizontalPad = 32,
      canvasMax = moduleContentMaxWidth(width),
    } = options
    const canvasWidth = Math.min(width, canvasMax)
    const available = Math.max(minColumnWidth, canvasWidth - horizontalPad)
    const columns = Math.min(
      maxColumns,
      Math.max(1, Math.floor((available + gap) / (minColumnWidth + gap))),
    )
    const columnWidth = Math.floor((available - gap * Math.max(columns - 1, 0)) / columns)
    return { columns, columnWidth, canvasWidth }
  }, [options.canvasMax, options.gap, options.horizontalPad, options.maxColumns, options.minColumnWidth, width])
}

export function drawerPanelWidth(screenWidth: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) {
    return Math.min(screenWidth * 0.42, DRAWER_PANEL_TABLET_MAX_WIDTH)
  }
  return Math.min(screenWidth * 0.88, DRAWER_PANEL_PHONE_MAX_WIDTH)
}

export function coraHistoryPanelWidth(screenWidth: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) {
    return Math.min(screenWidth * 0.4, CORA_HISTORY_TABLET_MAX_WIDTH)
  }
  return Math.min(screenWidth * 0.86, CORA_HISTORY_PHONE_MAX_WIDTH)
}

export function useDrawerPanelWidth(): number {
  const { width } = useWindowDimensions()
  return drawerPanelWidth(width)
}

export function useCoraHistoryPanelWidth(): number {
  const { width } = useWindowDimensions()
  return coraHistoryPanelWidth(width)
}

/** Two-column flex grid card — full width below {@link KPI_GRID_SINGLE_COLUMN_MAX_WIDTH}. */
export function useKpiGridCardStyle(twoColumnWidth: `${number}%` = "48%"): ViewStyle {
  const { width } = useWindowDimensions()
  return useMemo(() => {
    if (width < KPI_GRID_SINGLE_COLUMN_MAX_WIDTH) {
      return { width: "100%" }
    }
    if (width >= LARGE_TABLET_MIN_WIDTH) {
      return { width: "23%", flexGrow: 1, minWidth: 140 }
    }
    if (width >= TABLET_MIN_WIDTH) {
      return { width: "31%", flexGrow: 1, minWidth: 140 }
    }
    return { width: twoColumnWidth, flexGrow: 1 }
  }, [width, twoColumnWidth])
}

/** Alias for {@link useKpiGridCardStyle} — same hook, clearer name at non-KPI grids. */
export const useTwoColumnCardStyle = useKpiGridCardStyle

/** Guest dashboard KPI row — always 2 columns max so labels stay readable. */
export function useGuestKpiCardStyle(): ViewStyle {
  return useKpiGridCardStyle("48%")
}

/** Theme picker grid cell width — up to 3 columns on tablet for readable previews. */
export function useThemeGridCardWidth(contentPad: number, gap: number): number {
  const { columnWidth } = useResponsiveGridColumns({
    minColumnWidth: 165,
    maxColumns: 3,
    gap,
    horizontalPad: contentPad * 2,
  })
  return columnWidth
}

export function useDashboardContentStyle(): ViewStyle {
  const { width } = useWindowDimensions()
  return useMemo(
    () => ({
      width: "100%",
      maxWidth: dashboardContentMaxWidth(width),
      alignSelf: "center",
    }),
    [width],
  )
}

export function useCompactPhoneLayout(): boolean {
  const { width } = useWindowDimensions()
  return width < COMPACT_PHONE_MAX_WIDTH
}

/** Editor min-height scales down on short phones so the keyboard does not cover Cora/tools. */
export function useCodebenchEditorMinHeight(): number {
  const { height } = useWindowDimensions()
  if (height < 700) return 120
  if (height < 780) return 160
  return 220
}

export function useCodebenchAiPanelMinHeight(): number {
  const { height } = useWindowDimensions()
  if (height < 700) return 140
  if (height < 780) return 170
  return 210
}
