import type { ViewStyle } from "react-native"
import type { EdgeInsets } from "react-native-safe-area-context"
import type { DrawerNavTheme } from "./drawer-nav-theme"

/** Shared panel + scroll insets for all role drawers (student, faculty, guest, summer). */
export type DrawerShellLayout = {
  panel: ViewStyle
  header: ViewStyle
  scrollBackground: string
  scrollContent: ViewStyle
}

export function drawerShellLayout(
  panelWidth: number,
  insets: EdgeInsets,
  theme: DrawerNavTheme,
): DrawerShellLayout {
  return {
    panel: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: panelWidth,
      backgroundColor: theme.panelBg,
      borderRightColor: theme.headerBorder,
    },
    header: {
      paddingTop: insets.top + 12,
    },
    scrollBackground: theme.isGlass ? "transparent" : theme.panelBg,
    scrollContent: {
      paddingBottom: insets.bottom + 16,
    },
  }
}
