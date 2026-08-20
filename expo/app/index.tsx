import { useCallback, useEffect, useState } from "react"
import { Redirect } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StyleSheet, View } from "react-native"
import { BrandLoadingMark } from "../src/components/login/BrandLoadingMark"
import { useSession } from "../src/context/SessionProvider"
import { bootLog, markBootComplete } from "../src/lib/boot-diagnostics"
import { resolvePostLoginRoute } from "../src/lib/onboarding"
import { toAppHref, toAuthHref } from "../src/lib/navigation-reset"
import type { AppSession } from "../src/lib/session"

const STARTUP_ROUTE_TIMEOUT_MS = 12_000

function fallbackHrefForSession(session: AppSession): string {
  if (session.portal === "faculty") return toAppHref("/faculty-select-course")
  return toAppHref("/dashboard")
}

export default function Index() {
  const { session, isLoading } = useSession()
  const [resolvedHref, setResolvedHref] = useState<string | null>(null)

  useEffect(() => {
    bootLog("Index route mounted")
    void SplashScreen.hideAsync().catch(() => {})
  }, [])

  useEffect(() => {
    bootLog(`Session loading=${isLoading} hasSession=${Boolean(session)}`)
  }, [isLoading, session])

  const hideNativeSplash = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {})
  }, [])

  useEffect(() => {
    if (!isLoading) hideNativeSplash()
  }, [hideNativeSplash, isLoading])

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
      <View style={styles.loading} onLayout={hideNativeSplash}>
        <BrandLoadingMark color="#FFFFFF" />
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
    backgroundColor: "#582c83",
  },
})
