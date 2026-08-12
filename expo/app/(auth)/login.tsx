import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated"
import { Redirect } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { type LoginPortal } from "../../src/components/login/PortalSwitcher"
import { StudentLoginPanel } from "../../src/components/login/StudentLoginPanel"
import { GuestLoginPanel } from "../../src/components/login/GuestLoginPanel"
import { SummerLoginPanel } from "../../src/components/login/SummerLoginPanel"
import { StaffLoginPanel } from "../../src/components/login/StaffLoginPanel"
import { LoginButton } from "../../src/components/login/LoginButton"
import { LoginCanvasBubbles } from "../../src/components/login/LoginCanvasBubbles"
import { LoginTypewriter } from "../../src/components/login/LoginTypewriter"
import { BrandLogoMark } from "../../src/components/brand/BrandLogoMark"
import { ConnectivityOverlay } from "../../src/components/ConnectivityOverlay"
import { useSession } from "../../src/context/SessionProvider"
import { useNetworkStatus } from "../../src/hooks/useNetworkStatus"
import { useLoginTheme } from "../../src/components/login/login-theme"
import { LOGIN_PORTAL_THUMBS } from "../../src/lib/login-color-theme"
import { readRememberedUniversity } from "../../src/lib/remembered-student-auth"
import {
  persistRememberedLoginPortal,
  readRememberedLoginPortal,
} from "../../src/lib/remembered-login-portal"
import { portalMeta } from "../../src/constants/portals"

type FocusedPortal = Exclude<LoginPortal, "admin">

const SECONDARY_PORTALS = ["faculty", "guest", "summer"] as const satisfies readonly FocusedPortal[]

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const { session, isLoading: sessionLoading } = useSession()
  const { offline } = useNetworkStatus()
  const { LOGIN: themeLogin, loginType: themeType } = useLoginTheme()
  const [focusedPortal, setFocusedPortal] = useState<FocusedPortal | null>(null)
  const [bootstrappingUniversity, setBootstrappingUniversity] = useState(true)
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    if (!focusedPortal) setKeyboardVisible(false)
  }, [focusedPortal])

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const [lastPortal, university] = await Promise.all([
          readRememberedLoginPortal(),
          readRememberedUniversity(),
        ])
        if (!mounted) return
        if (lastPortal) {
          setFocusedPortal(lastPortal)
        } else if (university) {
          setFocusedPortal("student")
        }
      } finally {
        if (mounted) setBootstrappingUniversity(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  function focusPortal(id: FocusedPortal) {
    setFocusedPortal(id)
    void persistRememberedLoginPortal(id)
  }

  if (!sessionLoading && session) {
    return <Redirect href="/(auth)/signing-in" />
  }

  function goWelcome() {
    setFocusedPortal(null)
  }

  const scrollMinHeight = windowHeight - insets.top - insets.bottom
  const portalFocused = focusedPortal != null
  const welcomeVerticalPad = Math.max(20, Math.round(windowHeight * 0.04))
  const portalVerticallyCentered = portalFocused && !keyboardVisible

  if (bootstrappingUniversity) {
    return (
      <View style={[styles.root, styles.boot, { backgroundColor: themeLogin.canvas }]}>
        <LoginCanvasBubbles />
        <ActivityIndicator color={themeLogin.cta} />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: themeLogin.canvas }]}>
      <LoginCanvasBubbles />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          portalFocused ? styles.scrollPortal : styles.scrollWelcome,
          portalVerticallyCentered ? styles.scrollPortalCentered : null,
          { minHeight: scrollMinHeight },
          portalFocused
            ? {
                paddingTop: keyboardVisible ? insets.top + 16 : insets.top + welcomeVerticalPad,
                paddingBottom: keyboardVisible ? insets.bottom + 28 : insets.bottom + welcomeVerticalPad,
              }
            : {
                paddingTop: insets.top + welcomeVerticalPad,
                paddingBottom: insets.bottom + welcomeVerticalPad,
              },
        ]}
        keyboardShouldPersistTaps="always"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shell}>
          {!focusedPortal ? (
            <Animated.View
              key="welcome"
              entering={FadeIn.duration(380)}
              exiting={FadeOut.duration(240)}
              style={styles.welcome}
            >
              <BrandLogoMark size="login" style={styles.logoTile} />

              <Text style={[styles.eyebrow, { color: themeLogin.purpleLight }]}>
                The Modern AI Learning Platform
              </Text>
              <LoginTypewriter color={themeLogin.purple} />
              <Text style={[themeType.heroSubtitle, styles.subtitle]}>
                Sign in through your university to access courses, assignments, and AI-powered learning
                tools.
              </Text>

              <LoginButton
                label="Continue with University"
                icon="arrow-forward"
                onPress={() => focusPortal("student")}
              />

              <View style={[styles.divider, { backgroundColor: themeLogin.separator }]} />

              <Text style={[themeType.info, styles.secondaryHeading]}>Other sign-in options</Text>

              <View style={styles.secondaryList}>
                {SECONDARY_PORTALS.map((id) => {
                  const meta = portalMeta(id)
                  const thumb = LOGIN_PORTAL_THUMBS[id]
                  return (
                    <Pressable
                      key={id}
                      onPress={() => focusPortal(id)}
                      style={({ pressed }) => [
                        styles.secondaryRow,
                        {
                          backgroundColor: themeLogin.grouped,
                          borderColor: themeLogin.separator,
                          borderRadius: themeLogin.sectionRadius,
                        },
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <View
                        style={[
                          styles.secondaryIcon,
                          { backgroundColor: thumb.fill },
                        ]}
                      >
                        <Ionicons
                          name={meta.icon}
                          size={18}
                          color={thumb.icon}
                        />
                      </View>
                      <View style={styles.secondaryText}>
                        <Text style={[themeType.stepLabel, { color: themeLogin.label }]}>
                          {meta.label}
                        </Text>
                        <Text style={[themeType.info, { color: themeLogin.secondaryLabel }]} numberOfLines={2}>
                          {meta.description}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={themeLogin.purple} />
                    </Pressable>
                  )
                })}
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              key={`panel-${focusedPortal}`}
              entering={FadeInDown.duration(420)}
              exiting={FadeOut.duration(220)}
              style={styles.portalBleed}
            >
              {focusedPortal === "student" ? (
                <StudentLoginPanel onBack={goWelcome} />
              ) : focusedPortal === "guest" ? (
                <GuestLoginPanel onBack={goWelcome} />
              ) : focusedPortal === "summer" ? (
                <SummerLoginPanel onBack={goWelcome} />
              ) : (
                <StaffLoginPanel onBack={goWelcome} />
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {offline ? <ConnectivityOverlay mode="offline" /> : null}
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  boot: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20 },
  scrollWelcome: {
    flexGrow: 1,
    justifyContent: "center",
  },
  scrollPortal: {
    flexGrow: 1,
  },
  scrollPortalCentered: {
    justifyContent: "center",
  },
  shell: { width: "100%", maxWidth: 440, alignSelf: "center" },
  portalBleed: { alignSelf: "stretch", paddingHorizontal: 4 },
  welcome: { gap: 14, alignItems: "stretch" },
  logoTile: { alignSelf: "center", marginBottom: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 6,
    marginBottom: 2,
  },
  secondaryHeading: {
    textAlign: "center",
    fontWeight: "600",
  },
  secondaryList: { gap: 10 },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { flex: 1, gap: 2, minWidth: 0 },
  pressed: { opacity: 0.86 },
})
