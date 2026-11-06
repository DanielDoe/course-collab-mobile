import { Platform } from "react-native"
import { Redirect, Stack, usePathname } from "expo-router"
import { useSession } from "../../src/context/SessionProvider"
import { normalizeRoutePathname } from "../../src/lib/navigation-reset"
import { motion } from "../../src/lib/motion"

const AUTH_BLOCKED_WITH_SESSION = new Set(["/login"])

export default function AuthLayout() {
  const { session, isLoading } = useSession()
  const pathname = normalizeRoutePathname(usePathname())

  // Only bounce authenticated users off the login screen — not every auth route.
  // A blanket allow-list redirect fired during stack transitions (pathname briefly "/")
  // and caused signing-in ↔ appearance-setup navigation loops.
  if (!isLoading && session && AUTH_BLOCKED_WITH_SESSION.has(pathname)) {
    return <Redirect href="/(auth)/signing-in" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
        animationDuration: motion.slow,
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === "ios",
      }}
    />
  )
}
