import { useMemo } from "react"
import { useWindowDimensions, type ViewStyle } from "react-native"

/** Below this logical width, two-column grids stack in a single column. */
export const KPI_GRID_SINGLE_COLUMN_MAX_WIDTH = 340

/** Logical width treated as a compact phone (e.g. iPhone SE). */
export const COMPACT_PHONE_MAX_WIDTH = 375

/** Max content width for dashboard scroll areas on tablet / wide phones. */
export const DASHBOARD_CONTENT_MAX_WIDTH = 720

export function drawerPanelWidth(screenWidth: number): number {
  return Math.min(screenWidth * 0.88, 328)
}

export function coraHistoryPanelWidth(screenWidth: number): number {
  return Math.min(screenWidth * 0.86, 320)
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
  return useMemo(
    () =>
      width < KPI_GRID_SINGLE_COLUMN_MAX_WIDTH
        ? { width: "100%" }
        : { width: twoColumnWidth, flexGrow: 1 },
    [width, twoColumnWidth],
  )
}

/** Alias for {@link useKpiGridCardStyle} — same hook, clearer name at non-KPI grids. */
export const useTwoColumnCardStyle = useKpiGridCardStyle

/** Guest dashboard KPI row — stacks on narrow phones, 2-col mid, 3-col wide. */
export function useGuestKpiCardStyle(): ViewStyle {
  const { width } = useWindowDimensions()
  return useMemo(() => {
    if (width < KPI_GRID_SINGLE_COLUMN_MAX_WIDTH) {
      return { width: "100%" }
    }
    if (width < 400) {
      return { width: "48%", flexGrow: 1 }
    }
    return { flex: 1, minWidth: 0 }
  }, [width])
}

/** Theme picker grid cell width (1 or 2 columns). */
export function useThemeGridCardWidth(contentPad: number, gap: number): number {
  const { width } = useWindowDimensions()
  return useMemo(() => {
    const canvas = Math.min(width, DASHBOARD_CONTENT_MAX_WIDTH)
    const columns = width < KPI_GRID_SINGLE_COLUMN_MAX_WIDTH ? 1 : 2
    const totalGap = gap * Math.max(columns - 1, 0)
    return (canvas - contentPad * 2 - totalGap) / columns
  }, [width, contentPad, gap])
}

export function useDashboardContentStyle(): ViewStyle {
  return useMemo(
    () => ({
      width: "100%",
      maxWidth: DASHBOARD_CONTENT_MAX_WIDTH,
      alignSelf: "center",
    }),
    [],
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
