import { useMemo } from "react"
import { usePathname } from "expo-router"
import { floatingTopChromeInset, useStableTopSafeInset } from "../shell/shell-shared"
import { DrawerEdgeSwipe } from "./DrawerEdgeSwipe"
import {
  shouldEnableDrawerEdgeSwipe,
  type DrawerEdgeSwipePortal,
} from "./drawer-edge-swipe"
import { shellShowsBack } from "./student-shell-back"
import { useOptionalShellDrawerMotion } from "./ShellDrawerMotionProvider"
import { useStackHasHistory } from "./useStackHasHistory"

type Props = {
  portal: DrawerEdgeSwipePortal
  immersive: boolean
  drawerOpen: boolean
  onOpen?: () => void
}

export function ShellDrawerEdgeSwipe({ portal, immersive, drawerOpen, onOpen }: Props) {
  const pathname = usePathname()
  const topSafeInset = useStableTopSafeInset()
  const edgeTopInset = immersive ? topSafeInset : floatingTopChromeInset(topSafeInset)
  const stackHasHistory = useStackHasHistory()
  const motion = useOptionalShellDrawerMotion()

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

  return (
    <DrawerEdgeSwipe
      active={active}
      topInset={edgeTopInset}
      onOpen={motion?.openDrawer ?? onOpen}
    />
  )
}
