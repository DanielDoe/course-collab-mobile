import { useEffect, useMemo, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { GestureDetector } from "react-native-gesture-handler"
import { useSharedValue } from "react-native-reanimated"
import { usePathname } from "expo-router"
import {
  shouldEnableDrawerEdgeSwipe,
  type DrawerEdgeSwipePortal,
} from "./drawer-edge-swipe"
import { buildDrawerEdgeOpenGesture } from "./drawer-edge-open-gesture"
import { shellShowsBack } from "./student-shell-back"
import { useOptionalShellDrawerMotion } from "./ShellDrawerMotionProvider"
import { useStackHasHistory } from "./useStackHasHistory"
import { floatingTopChromeInset, useStableTopSafeInset } from "../shell/shell-shared"

/** Matches NotetakerScreenHeader bar (safe inset + padding + row). */
const IMMERSIVE_BACK_HEADER_HEIGHT = 54

type Props = {
  portal: DrawerEdgeSwipePortal
  immersive: boolean
  drawerOpen: boolean
  children: ReactNode
}

/**
 * Wraps shell content so a left-edge pan can open the drawer without fighting
 * ScrollViews (overlay strips lose the gesture arena to native scroll).
 */
export function ShellDrawerEdgeCapture({ portal, immersive, drawerOpen, children }: Props) {
  const pathname = usePathname()
  const stackHasHistory = useStackHasHistory()
  const motion = useOptionalShellDrawerMotion()
  const topSafeInset = useStableTopSafeInset()
  const edgeTopInset = immersive
    ? topSafeInset + IMMERSIVE_BACK_HEADER_HEIGHT
    : floatingTopChromeInset(topSafeInset)
  const edgeTopInsetSv = useSharedValue(edgeTopInset)

  useEffect(() => {
    edgeTopInsetSv.value = edgeTopInset
  }, [edgeTopInset, edgeTopInsetSv])

  const drawerBlocksEdge = drawerOpen || (motion?.modalVisible ?? false)

  const active = useMemo(
    () =>
      drawerBlocksEdge
        ? false
        : shouldEnableDrawerEdgeSwipe({
            immersive,
            drawerOpen,
            stackShowsBack: shellShowsBack(pathname, stackHasHistory),
            pathname,
            portal,
          }),
    [drawerBlocksEdge, drawerOpen, immersive, pathname, portal, stackHasHistory],
  )

  const edgeOpenGesture = useMemo(
    () => (motion ? buildDrawerEdgeOpenGesture(motion.openDrawer, edgeTopInsetSv) : null),
    [edgeTopInsetSv, motion],
  )

  if (!active || !edgeOpenGesture) {
    return <>{children}</>
  }

  return (
    <GestureDetector gesture={edgeOpenGesture}>
      <View style={styles.root} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
