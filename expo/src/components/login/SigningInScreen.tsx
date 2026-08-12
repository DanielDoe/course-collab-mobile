import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { FadeIn } from "react-native-reanimated"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { resolveStudentPostLoginRoute } from "../../lib/appearance-setup"
import { bootstrapAfterLogin } from "../../lib/post-login-bootstrap"
import { resolveFacultyPostLoginRoute } from "../../lib/faculty-post-login"
import type { AppSession } from "../../lib/session"
import { useLoginTheme } from "./login-theme"
import { BrandLoadingMark } from "./BrandLoadingMark"
import { resetToAppRoute, replaceAuthRoute, navigatePostSignIn } from "../../lib/navigation-reset"

const STEPS: Record<AppSession["portal"], string[]> = {
  student: ["Signing you in", "Loading your course data", "Preparing your dashboard"],
  faculty: ["Signing you in", "Loading your courses", "Choose your course"],
  guest: ["Signing you in", "Setting up guest access"],
  summer: ["Signing you in", "Loading camp workspace"],
  admin: ["Signing you in", "Loading admin workspace"],
}

export function SigningInScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()
  const tokens = useAppThemeTokens()
  const { LOGIN } = useLoginTheme()
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState("")

  const steps = session ? STEPS[session.portal] : ["Signing you in"]
  const status = steps[Math.min(stepIndex, steps.length - 1)]

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: LOGIN.canvas,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        },
        content: {
          alignItems: "center",
          justifyContent: "center",
        },
        error: {
          marginTop: 8,
          fontSize: 14,
          lineHeight: 20,
          color: tokens.danger,
          textAlign: "center",
        },
        continueBtn: {
          marginTop: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
        continueText: {
          fontSize: 15,
          fontWeight: "600",
          color: LOGIN.purple,
        },
      }),
    [LOGIN, tokens.danger],
  )

  useEffect(() => {
    if (!session) {
      replaceAuthRoute(router, "/login")
      return
    }

    let cancelled = false
    const stepTimer = setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1))
    }, 700)

    void (async () => {
      try {
        await bootstrapAfterLogin(session)
        if (cancelled) return
        if (session.portal === "student") {
          const next = await resolveStudentPostLoginRoute(session)
          navigatePostSignIn(router, next)
          return
        }
        if (session.portal === "faculty") {
          const next = await resolveFacultyPostLoginRoute(session)
          navigatePostSignIn(router, next)
          return
        }
        resetToAppRoute(router, "/dashboard")
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not finish signing in.")
        }
      }
    })()

    return () => {
      cancelled = true
      clearInterval(stepTimer)
    }
  }, [router, session, steps.length])

  return (
    <View
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      accessibilityLabel={status}
    >
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        <BrandLoadingMark color={LOGIN.purple} />
      </Animated.View>

      {error ? (
        <View style={styles.content}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            style={styles.continueBtn}
            onPress={() =>
              resetToAppRoute(
                router,
                session?.portal === "faculty" ? "/faculty-select-course" : "/dashboard",
              )
            }
          >
            <Text style={styles.continueText}>Continue anyway</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
