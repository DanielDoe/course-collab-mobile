import { useEffect } from "react"
import { usePathname } from "expo-router"
import { installMobileErrorCapture, updateMobileLogContext } from "../lib/system-log-client"
import { useSession } from "../context/SessionProvider"

/** Sync route/session into mobile log context and install global error capture once. */
export function SystemErrorCapture() {
  const pathname = usePathname()
  const { session } = useSession()

  useEffect(() => {
    installMobileErrorCapture()
  }, [])

  useEffect(() => {
    updateMobileLogContext({ route: pathname, session })
  }, [pathname, session])

  return null
}
