import { durationOrInstant, timing } from "../../lib/motion"

/** Wait for GlassBottomSheetModal exit before opening another RN Modal (iOS blocks overlap). */
export function shellSheetModalDismissDelayMs(reduceMotion: boolean): number {
  const backdropMs = durationOrInstant(timing.backdropOut.duration, reduceMotion)
  const sheetMs = durationOrInstant(timing.sheetOut.duration, reduceMotion)
  return Math.max(backdropMs, sheetMs) + 16
}

/** True when a shell sheet can present without fighting the drawer/profile Modal. */
export function shellOverlaySheetCanPresent(input: {
  requested: boolean
  drawerModalVisible: boolean
  profileOpen: boolean
  notificationsOpen: boolean
}): boolean {
  return (
    input.requested &&
    !input.drawerModalVisible &&
    !input.profileOpen &&
    !input.notificationsOpen
  )
}
