import { useCallback, useEffect, useState } from "react"
import { Redirect } from "expo-router"
import Constants from "expo-constants"
import * as SplashScreen from "expo-splash-screen"
import { StyleSheet, Text, View } from "react-native"
import { useSession } from "../src/context/SessionProvider"
import { bootLog, markBootComplete } from "../src/lib/boot-diagnostics"
import { resolvePostLoginRoute } from "../src/lib/onboarding"
import { toAppHref, toAuthHref } from "../src/lib/navigation-reset"
import type { AppSession } from "../src/lib/session"

const STARTUP_ROUTE_TIMEOUT_MS = 6_000
const BOOT_BG = "#582c83"
const BUILD_LABEL = `Build ${Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? "?"}`

try {
  void SplashScreen.preventAutoHideAsync()
} catch {
  /* ignore */
}

function fallbackHrefForSession(session: AppSession): string {
  if (session.portal === "faculty") return toAppHref("/faculty-select-course")
  return toAppHref("/dashboard")
}

function hideSplash() {
  try {
    SplashScreen.hide()
  } catch {
    /* ignore */
  }
  void SplashScreen.hideAsync().catch(() => {})
}

export default function Index() {
  const { session, isLoading } = useSession()
  const [resolvedHref, setResolvedHref] = useState<string | null>(null)

  useEffect(() => {
    bootLog("Index route mounted")
  }, [])

  useEffect(() => {
    bootLog(`Session loading=${isLoading} hasSession=${Boolean(session)}`)
  }, [isLoading, session])

  const onLayout = useCallback(() => {
    hideSplash()
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!session) {
      setResolvedHref("/(auth)/login")
      bootLog("No session — routing to login")
      return
    }

    bootLog("Resolving post-login route")
    let cancelled = false
    const timeout = setTimeout(() => {
      if (cancelled) return
      setResolvedHref(fallbackHrefForSession(session))
    }, STARTUP_ROUTE_TIMEOUT_MS)

    void resolvePostLoginRoute(session)
      .then((route) => {
        if (cancelled) return
        bootLog(`Post-login route resolved: ${route}`)
        const href =
          route === "/dashboard" ||
          route === "/faculty-select-course" ||
          route.startsWith("/module") ||
          route.startsWith("/settings")
            ? toAppHref(route)
            : toAuthHref(route)
        setResolvedHref(href)
      })
      .catch((error) => {
        if (!cancelled) {
          bootLog(
            `Post-login route failed: ${error instanceof Error ? error.message : String(error)}`,
            "warn",
          )
          setResolvedHref(fallbackHrefForSession(session))
        }
      })
      .finally(() => {
        clearTimeout(timeout)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [isLoading, session])

  useEffect(() => {
    if (!resolvedHref) return
    bootLog(`Redirecting to ${resolvedHref}`)
    markBootComplete(`redirect ${resolvedHref}`)
  }, [resolvedHref])

  if (isLoading || (session && !resolvedHref)) {
    return (
      <View style={styles.loading} onLayout={onLayout}>
        <Text style={styles.brand}>CourseCollab</Text>
        <Text style={styles.hint}>Loading…</Text>
        <Text style={styles.build}>{BUILD_LABEL}</Text>
      </View>
    )
  }

  if (resolvedHref) {
    return <Redirect href={resolvedHref as never} />
  }

  return <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BOOT_BG,
    gap: 10,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  hint: {
    color: "#E9D5FF",
    fontSize: 15,
  },
  build: {
    marginTop: 8,
    color: "#C4B5FD",
    fontSize: 13,
    fontWeight: "600",
  },
})
