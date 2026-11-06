import { Redirect, Stack, usePathname } from "expo-router"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { FacultyAppShellChrome, FacultyShellScope } from "../../src/components/shell/FacultyAppShell"
import { PortalAppShell } from "../../src/components/shell/PortalAppShell"
import { StudentAppShell } from "../../src/components/shell/StudentAppShell"
import { GuestAppShell } from "../../src/components/guest/GuestAppShell"
import { SummerAppShell } from "../../src/components/summer/SummerAppShell"
import { useAppThemeTokens } from "../../src/context/AppearanceProvider"
import { useSession } from "../../src/context/SessionProvider"
import { isPortalSession } from "../../src/lib/portal-shell-utils"
import { isFacultySetupRoute, sessionNeedsPasswordChange } from "../../src/lib/navigation-reset"

export default function AppLayout() {
  const pathname = usePathname()
  const { session, isLoading } = useSession()
  const tokens = useAppThemeTokens()

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: tokens.native.groupedBackground }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  // Cold start / deep links used to land in (app) with Faculty shell + WebView
  // showing the web change-password page. Keep first-login on the native auth screen.
  if (sessionNeedsPasswordChange(session)) {
    return <Redirect href="/(auth)/change-password" />
  }

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        // Edge-only back swipe — full-screen dismiss conflicts with vertical ScrollViews.
        fullScreenGestureEnabled: false,
        animation: "slide_from_right",
        contentStyle: { flex: 1, backgroundColor: tokens.native.groupedBackground },
        // Keep prior scenes from compositing through translucent Liquid Glass chrome.
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="dashboard" options={{ gestureEnabled: false }} />
    </Stack>
  )

  if (session.portal === "student") {
    return <StudentAppShell session={session}>{stack}</StudentAppShell>
  }

  if (session.portal === "faculty") {
    return (
      <FacultyShellScope>
        {isFacultySetupRoute(pathname) ? (
          stack
        ) : (
          <FacultyAppShellChrome session={session}>{stack}</FacultyAppShellChrome>
        )}
      </FacultyShellScope>
    )
  }

  if (session.portal === "summer") {
    return <SummerAppShell session={session}>{stack}</SummerAppShell>
  }

  if (session.portal === "guest") {
    return <GuestAppShell session={session}>{stack}</GuestAppShell>
  }

  if (isPortalSession(session)) {
    return <PortalAppShell session={session}>{stack}</PortalAppShell>
  }

  return stack
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})
