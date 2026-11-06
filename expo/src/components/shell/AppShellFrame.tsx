import { type ReactNode } from "react"
import { Platform, StyleSheet, View } from "react-native"
import { ChromeInsetProvider } from "../../context/ChromeInsetContext"
import { useSearchDockBottomInset } from "../../context/ModuleSearchDockContext"
import { ModuleSearchDockProvider } from "../../context/ModuleSearchDockProvider"
import { ShellDrawerEdgeCapture } from "../navigation/ShellDrawerEdgeCapture"
import type { DrawerEdgeSwipePortal } from "../navigation/drawer-edge-swipe"
import { useGlassChromeActive } from "../theme/GlassSurface"
import { floatingTopChromeInset, useStableTopSafeInset } from "./shell-shared"

type DrawerEdgeProps = {
  portal: DrawerEdgeSwipePortal
  immersive: boolean
  drawerOpen: boolean
}

type Props = {
  backgroundColor: string
  immersive: boolean
  topBar: ReactNode
  children: ReactNode
  drawerEdge?: DrawerEdgeProps
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
  drawerEdge,
  overlays,
}: Props) {
  return (
    <ModuleSearchDockProvider suppressDock={immersive}>
      <AppShellFrameInner
        backgroundColor={backgroundColor}
        immersive={immersive}
        topBar={topBar}
        drawerEdge={drawerEdge}
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
  drawerEdge,
  overlays,
}: Props) {
  const topSafeInset = useStableTopSafeInset()
  const glassChromeActive = useGlassChromeActive()
  const showTopBar = !immersive
  const floatChrome = showTopBar && glassChromeActive
  const topInset = floatChrome ? floatingTopChromeInset(topSafeInset) : 0
  const searchDockInset = useSearchDockBottomInset()
  const floatSearchDock = searchDockInset > 0
  const body = drawerEdge ? (
    <ShellDrawerEdgeCapture {...drawerEdge}>{children}</ShellDrawerEdgeCapture>
  ) : (
    children
  )

  return (
    <ChromeInsetProvider topInset={topInset} bottomInset={floatSearchDock ? searchDockInset : 0}>
      <View style={[styles.root, { backgroundColor }]}>
        {showTopBar && !floatChrome ? (
          <View style={styles.inlineTopBar} pointerEvents="box-none">
            {topBar}
          </View>
        ) : null}
        {/* Opaque fill — prevents prior stack scenes from showing through translucent chrome. */}
        <View style={[styles.content, { backgroundColor }]}>
          <View style={[styles.contentFill, { backgroundColor }]}>{body}</View>
        </View>
        {showTopBar && floatChrome ? (
          <View style={styles.floatingChrome} pointerEvents="box-none">
            {topBar}
          </View>
        ) : null}
        {overlays ? <View style={styles.overlaysLayer}>{overlays}</View> : null}
      </View>
    </ChromeInsetProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  contentFill: { flex: 1 },
  inlineTopBar: {
    position: "relative",
    zIndex: 25,
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
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
  overlaysLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    pointerEvents: "box-none",
  },
})
