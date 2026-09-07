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
