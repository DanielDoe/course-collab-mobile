import { type ReactNode } from "react"
import { Platform, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ChromeInsetProvider } from "../../context/ChromeInsetContext"
import { useSearchDockBottomInset } from "../../context/ModuleSearchDockContext"
import { ModuleSearchDockProvider } from "../../context/ModuleSearchDockProvider"
import { useGlassChromeActive } from "../theme/GlassSurface"
import { NATIVE_HEADER_BAR_HEIGHT } from "./shell-shared"

type Props = {
  backgroundColor: string
  immersive: boolean
  topBar: ReactNode
  children: ReactNode
  overlays?: ReactNode
}

/**
 * Stacks or floats the top chrome bar. Floating mode lets scroll content pass
 * under native Liquid Glass / blur so the material is visible.
 *
 * Nav chrome is always shown when `immersive` is false — independent of sheet
 * theming (`useThemedGlassSheets` in faculty-collab-sheet-ui only).
 */
export function AppShellFrame({
  backgroundColor,
  immersive,
  topBar,
  children,
  overlays,
}: Props) {
  return (
    <ModuleSearchDockProvider suppressDock={immersive}>
      <AppShellFrameInner
        backgroundColor={backgroundColor}
        immersive={immersive}
        topBar={topBar}
        overlays={overlays}
      >
        {children}
      </AppShellFrameInner>
    </ModuleSearchDockProvider>
  )
}

function AppShellFrameInner({
  backgroundColor,
  immersive,
  topBar,
  children,
  overlays,
}: Props) {
  const insets = useSafeAreaInsets()
  const glassChromeActive = useGlassChromeActive()
  const showTopBar = !immersive
  const floatChrome = showTopBar && glassChromeActive
  const topInset = floatChrome ? insets.top + NATIVE_HEADER_BAR_HEIGHT : 0
  const searchDockInset = useSearchDockBottomInset()
  const floatSearchDock = searchDockInset > 0

  return (
    <ChromeInsetProvider topInset={topInset} bottomInset={floatSearchDock ? searchDockInset : 0}>
      <View style={[styles.root, { backgroundColor }]}>
        {showTopBar && !floatChrome ? topBar : null}
        {/* Opaque fill — prevents prior stack scenes from showing through translucent chrome. */}
        <View style={[styles.content, { backgroundColor }]}>
          <View style={[styles.contentFill, { backgroundColor }]}>{children}</View>
        </View>
        {showTopBar && floatChrome ? (
          <View style={styles.floatingChrome} pointerEvents="box-none">
            {topBar}
          </View>
        ) : null}
        {overlays}
      </View>
    </ChromeInsetProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  contentFill: { flex: 1 },
  floatingChrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
})
