import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useSession } from "../context/SessionProvider"
import { useOptionalStudentShell } from "../context/StudentShellContext"
import { useOptionalFacultyShell } from "../context/FacultyShellContext"
import { useGuestEntitlements } from "../context/GuestEntitlementsProvider"
import { useGuestCheckoutReturnRefresh } from "../lib/use-guest-checkout-return"

/**
 * Refreshes membership, credits, and entitlements when the app returns to foreground
 * after the user completes a purchase in Safari.
 */
export function usePurchaseReturnRefresh() {
  const { session } = useSession()
  const studentShell = useOptionalStudentShell()
  const facultyShell = useOptionalFacultyShell()
  const { refresh: refreshGuestEntitlements } = useGuestEntitlements()

  useGuestCheckoutReturnRefresh(session?.portal === "guest" ? session : null)

  useEffect(() => {
    if (session?.portal !== "student") return
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void studentShell?.refreshStudentData?.({ force: true })
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => sub.remove()
  }, [session, studentShell])

  useEffect(() => {
    if (session?.portal !== "faculty") return
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void facultyShell?.refreshFacultyData?.(undefined, { force: true })
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => sub.remove()
  }, [session, facultyShell])

  useEffect(() => {
    if (session?.portal !== "guest") return
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void refreshGuestEntitlements()
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => sub.remove()
  }, [refreshGuestEntitlements, session])
}
