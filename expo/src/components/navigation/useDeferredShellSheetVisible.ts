import { useEffect, useState } from "react"
import { InteractionManager } from "react-native"
import { useOptionalFacultyShell } from "../../context/FacultyShellContext"
import { useOptionalStudentShell } from "../../context/StudentShellContext"
import { shellOverlaySheetCanPresent } from "./shell-overlay-sheet"

/**
 * Present a shell sheet only after the drawer/profile overlay has dismissed.
 */
export function useDeferredShellSheetVisible(requested: boolean): boolean {
  const faculty = useOptionalFacultyShell()
  const student = useOptionalStudentShell()
  const drawerOpen = faculty?.drawerOpen ?? student?.drawerOpen ?? false
  const canPresent = shellOverlaySheetCanPresent({
    requested,
    drawerModalVisible: drawerOpen,
    profileOpen: faculty?.profileOpen ?? student?.profileOpen ?? false,
    notificationsOpen: faculty?.notificationsOpen ?? student?.notificationsOpen ?? false,
  })
  const [visible, setVisible] = useState(canPresent)

  useEffect(() => {
    if (!canPresent) {
      setVisible(false)
      return
    }
    const task = InteractionManager.runAfterInteractions(() => {
      setVisible(true)
    })
    return () => task.cancel()
  }, [canPresent])

  return requested && visible
}
