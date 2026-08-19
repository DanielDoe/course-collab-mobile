import { Redirect, Stack, usePathname } from "expo-router"
import { useSession } from "../../src/context/SessionProvider"
import { ONBOARDING_AUTH_ROUTES } from "../../src/lib/onboarding"
import { normalizeRoutePathname } from "../../src/lib/navigation-reset"

const AUTH_ALLOWED_WITH_SESSION = new Set([
  "/signing-in",
  "/appearance-setup",
  "/change-password",
  ...ONBOARDING_AUTH_ROUTES,
])

export default function AuthLayout() {
  const { session, isLoading } = useSession()
  const pathname = normalizeRoutePathname(usePathname())

  if (!isLoading && session && !AUTH_ALLOWED_WITH_SESSION.has(pathname)) {
    return <Redirect href="/(auth)/signing-in" />
  }

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
}
