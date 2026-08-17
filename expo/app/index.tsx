import { useCallback, useEffect } from "react"
import { Redirect } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StyleSheet, View } from "react-native"
import { BrandLoadingMark } from "../src/components/login/BrandLoadingMark"
import { useSession } from "../src/context/SessionProvider"
import { sessionNeedsPasswordChange } from "../src/lib/navigation-reset"

export default function Index() {
  const { session, isLoading } = useSession()

  const hideNativeSplash = useCallback(() => {
    void SplashScreen.hideAsync()
  }, [])

  useEffect(() => {
    if (!isLoading) hideNativeSplash()
  }, [hideNativeSplash, isLoading])

  if (isLoading) {
    return (
      <View style={styles.loading} onLayout={hideNativeSplash}>
        <BrandLoadingMark />
      </View>
    )
  }

  if (session) {
    if (sessionNeedsPasswordChange(session)) {
      return <Redirect href="/(auth)/change-password" />
    }
    return <Redirect href="/(app)/dashboard" />
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
