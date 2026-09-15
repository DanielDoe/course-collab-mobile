import { useEffect, useRef, useState } from "react"
import { InteractionManager } from "react-native"
import { useOptionalFacultyShell } from "../../context/FacultyShellContext"
import { useOptionalStudentShell } from "../../context/StudentShellContext"
import {
  shellOverlaySheetCanPresent,
  shellSheetModalDismissDelayMs,
} from "./shell-overlay-sheet"
import { useAppReducedMotion } from "../../lib/motion"

/**
 * Present a shell sheet only after the drawer/profile overlay has dismissed.
 */
export function useDeferredShellSheetVisible(requested: boolean): boolean {
  const reduceMotion = useAppReducedMotion()
  const faculty = useOptionalFacultyShell()
  const student = useOptionalStudentShell()
  const drawerOpen = faculty?.drawerOpen ?? student?.drawerOpen ?? false
  const profileOpen = faculty?.profileOpen ?? student?.profileOpen ?? false
  const notificationsOpen = faculty?.notificationsOpen ?? student?.notificationsOpen ?? false
  const canPresent = shellOverlaySheetCanPresent({
    requested,
    drawerModalVisible: drawerOpen,
    profileOpen,
    notificationsOpen,
  })
  const [visible, setVisible] = useState(false)
  const hadBlockingShellSheet = useRef(false)

  useEffect(() => {
    if (profileOpen || notificationsOpen) {
      hadBlockingShellSheet.current = true
      return
    }
    if (!requested) {
      hadBlockingShellSheet.current = false
    }
  }, [profileOpen, notificationsOpen, requested])

  useEffect(() => {
    if (!canPresent) {
      setVisible(false)
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const reveal = () => {
      if (!cancelled) setVisible(true)
    }

    const dismissDelayMs = hadBlockingShellSheet.current
      ? shellSheetModalDismissDelayMs(reduceMotion)
      : 0
    if (dismissDelayMs > 0) {
      hadBlockingShellSheet.current = false
    }

    const task = InteractionManager.runAfterInteractions(() => {
      if (dismissDelayMs > 0) {
        timeoutId = setTimeout(reveal, dismissDelayMs)
      } else {
        reveal()
      }
    })

    return () => {
      cancelled = true
      task.cancel()
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [canPresent, reduceMotion])

  return requested && visible
}
