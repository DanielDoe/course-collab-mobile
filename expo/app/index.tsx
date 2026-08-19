import { useCallback, useEffect, useState } from "react"
import { Redirect } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StyleSheet, View } from "react-native"
import { BrandLoadingMark } from "../src/components/login/BrandLoadingMark"
import { useSession } from "../src/context/SessionProvider"
import { resolvePostLoginRoute } from "../src/lib/onboarding"
import { toAppHref, toAuthHref } from "../src/lib/navigation-reset"

export default function Index() {
  const { session, isLoading } = useSession()
  const [resolvedHref, setResolvedHref] = useState<string | null>(null)

  const hideNativeSplash = useCallback(() => {
    void SplashScreen.hideAsync()
  }, [])

  useEffect(() => {
    if (!isLoading) hideNativeSplash()
  }, [hideNativeSplash, isLoading])

  useEffect(() => {
    if (isLoading) return
    if (!session) {
      setResolvedHref("/(auth)/login")
      return
    }

    let cancelled = false
    void resolvePostLoginRoute(session).then((route) => {
      if (cancelled) return
      const href =
        route === "/dashboard" ||
        route === "/faculty-select-course" ||
        route.startsWith("/module") ||
        route.startsWith("/settings")
          ? toAppHref(route)
          : toAuthHref(route)
      setResolvedHref(href)
    })

    return () => {
      cancelled = true
    }
  }, [isLoading, session])

  if (isLoading || (session && !resolvedHref)) {
    return (
      <View style={styles.loading} onLayout={hideNativeSplash}>
        <BrandLoadingMark />
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
    backgroundColor: "#F8FAFC",
  },
})
