import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { type LoginPortal } from "../../src/components/login/PortalSwitcher"
import { StudentLoginPanel } from "../../src/components/login/StudentLoginPanel"
import { GuestLoginPanel } from "../../src/components/login/GuestLoginPanel"
import { SummerLoginPanel } from "../../src/components/login/SummerLoginPanel"
import { StaffLoginPanel } from "../../src/components/login/StaffLoginPanel"
import { LoginButton } from "../../src/components/login/LoginButton"
import { LoginTypewriter } from "../../src/components/login/LoginTypewriter"
import { DismissKeyboardView, type RegisterAuthPanelBack } from "../../src/components/login/login-chrome"
import { useAuthNestedBack } from "../../src/components/navigation/useAuthNestedBack"
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
import { StudentInviteSignupPanel } from "../../src/components/login/StudentInviteSignupPanel"
import { portalMeta } from "../../src/constants/portals"
import {
  AUTH_FORM_PHONE_MAX_WIDTH,
  useAuthFlowLayout,
} from "../../src/lib/responsive-layout"
import { bootLog, markBootComplete } from "../../src/lib/boot-diagnostics"

function normalizeInviteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? ""
  return typeof value === "string" ? value.trim() : ""
}

type FocusedPortal = Exclude<LoginPortal, "admin">

const SECONDARY_PORTALS = ["faculty", "guest", "summer"] as const satisfies readonly FocusedPortal[]

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [focusedPortal, setFocusedPortal] = useState<FocusedPortal | null>(null)
  const [bootstrappingUniversity, setBootstrappingUniversity] = useState(true)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const authLayout = useAuthFlowLayout({
    keyboardVisible,
    phoneMax: AUTH_FORM_PHONE_MAX_WIDTH,
  })
  const { invite } = useLocalSearchParams<{ invite?: string | string[] }>()
  const inviteToken = normalizeInviteParam(invite)
  const { session, isLoading: sessionLoading } = useSession()
  const { offline } = useNetworkStatus()
  const { LOGIN: themeLogin, loginType: themeType } = useLoginTheme()

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
    bootLog("Login screen mounted")
    markBootComplete("login screen mounted")
  }, [])

  const onLoginLayout = () => {
    void SplashScreen.hideAsync().catch(() => {})
  }

  useEffect(() => {
    if (inviteToken) {
      setBootstrappingUniversity(false)
      return
    }
    let mounted = true
    const failsafe = setTimeout(() => {
      if (mounted) setBootstrappingUniversity(false)
    }, 3000)
    void (async () => {
      try {
        const [lastPortal, university] = await Promise.all([
          readRememberedLoginPortal(),
          readRememberedUniversity(),
        ])
        if (!mounted) return
        if (lastPortal && lastPortal !== "summer") {
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
      clearTimeout(failsafe)
    }
  }, [inviteToken])

  function focusPortal(id: FocusedPortal) {
    setFocusedPortal(id)
    if (id !== "summer") void persistRememberedLoginPortal(id)
  }

  const panelBackRef = useRef<(() => boolean) | null>(null)
  const registerPanelBack = useCallback<RegisterAuthPanelBack>((handler) => {
    panelBackRef.current = handler
  }, [])

  const goWelcome = useCallback(() => {
    setFocusedPortal(null)
    if (inviteToken) {
      router.replace("/login")
    }
  }, [inviteToken, router])

  const nestedBackActive = Boolean(inviteToken || focusedPortal)

  const handleNestedBack = useCallback(() => {
    if (panelBackRef.current?.()) return
    goWelcome()
  }, [goWelcome])

  const nestedBackSwipe = useAuthNestedBack(nestedBackActive, handleNestedBack, insets.top)

  if (!sessionLoading && session) {
    return <Redirect href="/(auth)/signing-in" />
  }

  if (bootstrappingUniversity) {
    return (
      <View style={[styles.root, styles.boot, { backgroundColor: "#582c83" }]}>
        <Text style={styles.bootBrand}>CourseCollab</Text>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: themeLogin.canvas }]} onLayout={onLoginLayout}>
      {nestedBackSwipe}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollOuter,
            {
              minHeight: authLayout.minScrollHeight,
              paddingHorizontal: authLayout.horizontalPadding,
              paddingTop: insets.top + authLayout.verticalPadding,
              paddingBottom: insets.bottom + (keyboardVisible ? 16 : authLayout.verticalPadding),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
          bounces={!keyboardVisible}
        >
          {/*
            Inner flexGrow + justifyContent is the reliable ScrollView centering pattern.
            contentContainerStyle.justifyContent alone is ignored on many iOS builds.
          */}
          <View
            style={[
              styles.scrollInner,
              authLayout.shouldCenterVertically && !keyboardVisible
                ? styles.scrollInnerCentered
                : styles.scrollInnerTop,
            ]}
          >
            <DismissKeyboardView
              style={[
                styles.shellWrap,
                authLayout.shouldCenterVertically && !keyboardVisible && styles.shellWrapCentered,
              ]}
            >
              <View style={[styles.shell, authLayout.contentStyle]}>
                {inviteToken ? (
                  <View key="invite-signup" style={styles.portalBleed}>
                    <StudentInviteSignupPanel
                      token={inviteToken}
                      onBack={goWelcome}
                      registerPanelBack={registerPanelBack}
                    />
                  </View>
                ) : !focusedPortal ? (
                  <View key="welcome" style={[styles.welcome, { gap: authLayout.contentGap }]}>
                    <BrandLogoMark
                      size={authLayout.isCompactHeight ? "compact" : "login"}
                      style={styles.logoTile}
                    />

                    <Text style={[styles.eyebrow, { color: themeLogin.purpleLight }]}>
                      The Modern AI Learning Platform
                    </Text>
                    <LoginTypewriter color={themeLogin.purple} />
                    <Text style={[themeType.heroSubtitle, styles.subtitle]}>
                      Sign in through your university to access courses, assignments, and AI-powered
                      learning tools.
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
                                paddingVertical: authLayout.isCompactHeight ? 11 : 13,
                              },
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                          >
                            <View style={[styles.secondaryIcon, { backgroundColor: thumb.fill }]}>
                              <Ionicons name={meta.icon} size={18} color={thumb.icon} />
                            </View>
                            <View style={styles.secondaryText}>
                              <Text style={[themeType.stepLabel, { color: themeLogin.label }]}>
                                {meta.label}
                              </Text>
                              <Text
                                style={[themeType.info, { color: themeLogin.secondaryLabel }]}
                                numberOfLines={2}
                              >
                                {meta.description}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={themeLogin.purple} />
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                ) : (
                  <View key={`panel-${focusedPortal}`} style={styles.portalBleed}>
                    {focusedPortal === "student" ? (
                      <StudentLoginPanel onBack={goWelcome} registerPanelBack={registerPanelBack} />
                    ) : focusedPortal === "guest" ? (
                      <GuestLoginPanel onBack={goWelcome} registerPanelBack={registerPanelBack} />
                    ) : focusedPortal === "summer" ? (
                      <SummerLoginPanel onBack={goWelcome} registerPanelBack={registerPanelBack} />
                    ) : (
                      <StaffLoginPanel onBack={goWelcome} registerPanelBack={registerPanelBack} />
                    )}
                  </View>
                )}
              </View>
            </DismissKeyboardView>
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
  boot: { alignItems: "center", justifyContent: "center", gap: 14 },
  bootBrand: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  scrollOuter: {
    flexGrow: 1,
  },
  scrollInner: {
    width: "100%",
  },
  scrollInnerCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  scrollInnerTop: {
    flexGrow: 0,
    justifyContent: "flex-start",
  },
  shellWrap: {
    width: "100%",
    alignItems: "center",
  },
  shellWrapCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  shell: { width: "100%" },
  portalBleed: { alignSelf: "stretch", paddingHorizontal: 4 },
  welcome: { alignItems: "stretch" },
  logoTile: { alignSelf: "center", marginBottom: 2 },
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
    marginTop: 8,
    marginBottom: 4,
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
