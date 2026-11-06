import { useMemo } from "react"
import { useWindowDimensions, type ViewStyle } from "react-native"
import { modulePageLayout } from "./module-page-layout"
import {
  AUTH_COMPACT_HEIGHT_MAX,
  AUTH_FLOW_PHONE_MAX_WIDTH,
  AUTH_FORM_PHONE_MAX_WIDTH,
  authFlowContentGap,
  authFlowContentMaxWidth,
  authFlowHorizontalPadding,
  authFlowIsTallPhone,
  authFlowOnboardingContentMaxWidth,
  authFlowOnboardingHorizontalPadding,
  authFlowShouldCenterVertically,
  authFlowStackGap,
  authFlowTypeScale,
  authFlowVerticalPadding,
} from "./auth-flow-layout"
import {
  COMPACT_PHONE_MAX_WIDTH,
  KPI_GRID_SINGLE_COLUMN_MAX_WIDTH,
  LARGE_TABLET_MIN_WIDTH,
  TABLET_MIN_WIDTH,
} from "./responsive-layout-breakpoints"

export {
  AUTH_COMPACT_HEIGHT_MAX,
  AUTH_FLOW_PHONE_MAX_WIDTH,
  AUTH_FLOW_TABLET_MAX_WIDTH,
  AUTH_FLOW_VERTICAL_PADDING,
  AUTH_FORM_PHONE_MAX_WIDTH,
  AUTH_MIN_CENTER_HEIGHT,
  AUTH_TALL_PHONE_MIN_HEIGHT,
  authFlowCenterSlack,
  authFlowContentGap,
  authFlowContentMaxWidth,
  authFlowHorizontalPadding,
  authFlowIsTallPhone,
  authFlowOnboardingContentMaxWidth,
  authFlowOnboardingHorizontalPadding,
  authFlowShouldCenterVertically,
  authFlowStackGap,
  authFlowTypeScale,
  authFlowVerticalPadding,
} from "./auth-flow-layout"
export {
  COMPACT_PHONE_MAX_WIDTH,
  KPI_GRID_SINGLE_COLUMN_MAX_WIDTH,
  LARGE_TABLET_MIN_WIDTH,
  TABLET_MIN_WIDTH,
} from "./responsive-layout-breakpoints"
export {
  modulePageCardPadding,
  modulePageHorizontalPadding,
  modulePageLayout,
  modulePageStackGap,
  type ModulePageLayout,
} from "./module-page-layout"

/** Max content width for dashboard scroll areas on tablet / wide phones. */
export const DASHBOARD_CONTENT_MAX_WIDTH = 720

/** Max content width for module lists and prose on tablet. */
export const MODULE_CONTENT_MAX_WIDTH = 840

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

export type AuthFlowLayout = {
  width: number
  height: number
  contentStyle: ViewStyle
  horizontalPadding: number
  verticalPadding: number
  contentGap: number
  stackGap: number
  shouldCenterVertically: boolean
  minScrollHeight: number
  isCompactPhone: boolean
  isCompactHeight: boolean
  isTallPhone: boolean
  isShortLandscape: boolean
  isTablet: boolean
  isLandscape: boolean
  typeScale: number
}

export function useAuthFlowLayout(options?: {
  keyboardVisible?: boolean
  phoneMax?: number
}): AuthFlowLayout {
  const { width, height } = useWindowDimensions()
  const keyboardVisible = options?.keyboardVisible ?? false
  const phoneMax = options?.phoneMax ?? AUTH_FORM_PHONE_MAX_WIDTH
  const isLandscape = width > height
  const contentStyle = useAuthFlowContentStyle(phoneMax)

  return useMemo(() => {
    const isCompactPhone = width < COMPACT_PHONE_MAX_WIDTH
    const isCompactHeight = height < AUTH_COMPACT_HEIGHT_MAX
    const isTallPhone = authFlowIsTallPhone(width, height)
    const isTablet = width >= TABLET_MIN_WIDTH

    return {
      width,
      height,
      contentStyle,
      horizontalPadding: authFlowHorizontalPadding(width),
      verticalPadding: authFlowVerticalPadding(height, keyboardVisible, isLandscape),
      contentGap: authFlowContentGap(width, height),
      stackGap: authFlowStackGap(width, height),
      shouldCenterVertically: authFlowShouldCenterVertically(height, keyboardVisible, isLandscape),
      minScrollHeight: height,
      isCompactPhone,
      isCompactHeight,
      isTallPhone,
      isShortLandscape: isLandscape && height < 500,
      isTablet,
      isLandscape,
      typeScale: authFlowTypeScale(width, height),
    }
  }, [contentStyle, width, height, keyboardVisible, isLandscape])
}

export function useOnboardingFlowLayout(): AuthFlowLayout {
  const { width, height } = useWindowDimensions()
  const isLandscape = width > height
  const contentStyle = useMemo(
    () => ({
      width: "100%" as const,
      maxWidth: authFlowOnboardingContentMaxWidth(width),
      alignSelf: "center" as const,
    }),
    [width],
  )

  return useMemo(() => {
    const isCompactPhone = width < COMPACT_PHONE_MAX_WIDTH
    const isCompactHeight = height < AUTH_COMPACT_HEIGHT_MAX
    const isTallPhone = authFlowIsTallPhone(width, height)
    const isTablet = width >= TABLET_MIN_WIDTH

    return {
      width,
      height,
      contentStyle,
      horizontalPadding: authFlowOnboardingHorizontalPadding(width),
      verticalPadding: authFlowVerticalPadding(height, false, isLandscape),
      contentGap: authFlowContentGap(width, height),
      stackGap: authFlowStackGap(width, height),
      shouldCenterVertically: authFlowShouldCenterVertically(height, false, isLandscape),
      minScrollHeight: height,
      isCompactPhone,
      isCompactHeight,
      isTallPhone,
      isShortLandscape: isLandscape && height < 500,
      isTablet,
      isLandscape,
      typeScale: authFlowTypeScale(width, height),
    }
  }, [contentStyle, width, height, isLandscape])
}

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

export function useModulePageLayout() {
  const { width, height } = useWindowDimensions()
  return useMemo(() => modulePageLayout(width, height), [width, height])
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
