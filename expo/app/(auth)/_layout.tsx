import { Redirect, Stack, usePathname } from "expo-router"
import { useSession } from "../../src/context/SessionProvider"
import type { AppSession } from "../../src/lib/session"
import { normalizeRoutePathname } from "../../src/lib/navigation-reset"

const AUTH_ALLOWED_WITH_SESSION = new Set(["/signing-in", "/appearance-setup"])

function authedRedirect(
  pathname: string,
  session: AppSession,
): "/(auth)/signing-in" | "/(app)/dashboard" | "/(auth)/appearance-setup" {
  if (session.portal === "student") {
    return pathname === "/login" ? "/(auth)/signing-in" : "/(app)/dashboard"
  }
  return pathname === "/login" ? "/(auth)/signing-in" : "/(app)/dashboard"
}

export default function AuthLayout() {
  const { session, isLoading } = useSession()
  const pathname = normalizeRoutePathname(usePathname())

  if (!isLoading && session && !AUTH_ALLOWED_WITH_SESSION.has(pathname)) {
    return <Redirect href={authedRedirect(pathname, session)} />
  }

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
}
