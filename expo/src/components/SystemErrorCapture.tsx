import { useEffect } from "react"
import { installMobileErrorCapture, updateMobileLogContext } from "../lib/system-log-client"
import { useSession } from "../context/SessionProvider"

/**
 * Sync session into mobile log context and install global error capture once.
 * Avoid usePathname/useRouter here — this component mounts above the Stack and
 * those hooks can leave a blank tree on Release/iOS 26 when navigation is not ready.
 */
export function SystemErrorCapture() {
  const { session } = useSession()

  useEffect(() => {
    installMobileErrorCapture()
  }, [])

  useEffect(() => {
    updateMobileLogContext({ session })
  }, [session])

  return null
}
