import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { type LoginPortal } from "../../src/components/login/PortalSwitcher"
import { StudentLoginPanel } from "../../src/components/login/StudentLoginPanel"
import { GuestLoginPanel } from "../../src/components/login/GuestLoginPanel"
import { SummerLoginPanel } from "../../src/components/login/SummerLoginPanel"
import { StaffLoginPanel } from "../../src/components/login/StaffLoginPanel"
import { AuthFlowScroll } from "../../src/components/login/AuthFlowScroll"
import { LoginButton } from "../../src/components/login/LoginButton"
import { LoginTypewriter } from "../../src/components/login/LoginTypewriter"
import { type RegisterAuthPanelBack } from "../../src/components/login/login-chrome"
import { useAuthNestedBack } from "../../src/components/navigation/useAuthNestedBack"
import { BrandLogoMark } from "../../src/components/brand/BrandLogoMark"
import { AuthFlowEnterItem, AuthFlowPanelTransition } from "../../src/components/motion/AuthFlowPanelTransition"
import { AuthKeyboardShell } from "../../src/components/motion/AuthKeyboardShell"
import { PressableScale } from "../../src/components/motion/PressableScale"
import { triggerMotionHaptic } from "../../src/lib/motion"
import { ConnectivityOverlay } from "../../src/components/ConnectivityOverlay"
import { useSession } from "../../src/context/SessionProvider"
import { useNetworkStatus } from "../../src/hooks/useNetworkStatus"
import { useLoginTheme } from "../../src/components/login/login-theme"
import { LOGIN_PORTAL_THUMBS } from "../../src/lib/login-color-theme"
import { readRememberedUniversity } from "../../src/lib/remembered-student-auth"
import {
  clearRememberedLoginPortal,
  persistRememberedLoginPortal,
  readRememberedLoginPortal,
} from "../../src/lib/remembered-login-portal"
import { StudentInviteSignupPanel } from "../../src/components/login/StudentInviteSignupPanel"
import { portalMeta } from "../../src/constants/portals"
import {
  AUTH_FORM_PHONE_MAX_WIDTH,
  useAuthFlowLayout,
} from "../../src/lib/responsive-layout"
import { bootLog } from "../../src/lib/boot-diagnostics"
import { hideAppSplashFireAndForget } from "../../src/lib/app-splash"

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
  const authLayout = useAuthFlowLayout({ phoneMax: AUTH_FORM_PHONE_MAX_WIDTH })
  const { invite } = useLocalSearchParams<{ invite?: string | string[] }>()
  const inviteToken = normalizeInviteParam(invite)
  const { session, isLoading: sessionLoading } = useSession()
  const { offline } = useNetworkStatus()
  const { LOGIN: themeLogin, loginType: themeType } = useLoginTheme()

  const bootLoggedRef = useRef(false)

  useEffect(() => {
    if (bootLoggedRef.current) return
    bootLoggedRef.current = true
    bootLog("Login screen mounted")
    hideAppSplashFireAndForget()
  }, [])

  const onLoginLayout = () => {
    hideAppSplashFireAndForget()
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
    triggerMotionHaptic("selection")
    setFocusedPortal(id)
    if (id !== "summer") void persistRememberedLoginPortal(id)
  }

  const panelBackRef = useRef<(() => boolean) | null>(null)
  const registerPanelBack = useCallback<RegisterAuthPanelBack>((handler) => {
    panelBackRef.current = handler
  }, [])

  const goWelcome = useCallback(() => {
    triggerMotionHaptic("selection")
    setFocusedPortal(null)
    void clearRememberedLoginPortal()
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

  const panelKey = inviteToken ? "invite" : !focusedPortal ? "welcome" : focusedPortal

  return (
    <View style={[styles.root, { backgroundColor: themeLogin.canvas }]} onLayout={onLoginLayout}>
      {nestedBackSwipe}
      <AuthKeyboardShell>
        <AuthFlowScroll phoneMax={AUTH_FORM_PHONE_MAX_WIDTH}>
            <View style={styles.shell}>
              <AuthFlowPanelTransition panelKey={panelKey}>
                {inviteToken ? (
                  <View style={styles.portalBleed}>
                    <StudentInviteSignupPanel
                      token={inviteToken}
                      onBack={goWelcome}
                      registerPanelBack={registerPanelBack}
                    />
                  </View>
                ) : !focusedPortal ? (
                  <View style={[styles.welcome, { gap: authLayout.contentGap }]}>
                    <AuthFlowEnterItem index={0}>
                      <BrandLogoMark
                        size={authLayout.isCompactHeight ? "compact" : "login"}
                        style={styles.logoTile}
                      />
                    </AuthFlowEnterItem>

                    <AuthFlowEnterItem index={1}>
                      <Text style={[styles.eyebrow, { color: themeLogin.purpleLight }]}>
                        The Modern AI Learning Platform
                      </Text>
                    </AuthFlowEnterItem>

                    <AuthFlowEnterItem index={2}>
                      <LoginTypewriter color={themeLogin.purple} />
                    </AuthFlowEnterItem>

                    <AuthFlowEnterItem index={3}>
                      <Text style={[themeType.heroSubtitle, styles.subtitle]}>
                        Sign in through your university to access courses, assignments, and AI-powered
                        learning tools.
                      </Text>
                    </AuthFlowEnterItem>

                    <AuthFlowEnterItem index={4}>
                      <LoginButton
                        label="Continue with University"
                        icon="arrow-forward"
                        onPress={() => focusPortal("student")}
                      />
                    </AuthFlowEnterItem>

                    <AuthFlowEnterItem index={5}>
                      <View style={[styles.divider, { backgroundColor: themeLogin.separator }]} />
                    </AuthFlowEnterItem>

                    <AuthFlowEnterItem index={6}>
                      <Text style={[themeType.info, styles.secondaryHeading]}>Other sign-in options</Text>
                    </AuthFlowEnterItem>

                    <View style={styles.secondaryList}>
                      {SECONDARY_PORTALS.map((id, portalIndex) => {
                        const meta = portalMeta(id)
                        const thumb = LOGIN_PORTAL_THUMBS[id]
                        return (
                          <AuthFlowEnterItem key={id} index={7 + portalIndex}>
                            <PressableScale
                              onPress={() => focusPortal(id)}
                              haptic="selection"
                              style={[
                              styles.secondaryRow,
                              {
                                backgroundColor: themeLogin.grouped,
                                borderColor: themeLogin.separator,
                                borderRadius: themeLogin.sectionRadius,
                                paddingVertical: authLayout.isCompactHeight
                                  ? 11
                                  : authLayout.isTallPhone
                                    ? 15
                                    : 13,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={meta.label}
                            testID={`login-portal-${id}`}
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
                          </PressableScale>
                          </AuthFlowEnterItem>
                        )
                      })}
                    </View>
                  </View>
                ) : (
                  <View style={styles.portalBleed}>
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
              </AuthFlowPanelTransition>
            </View>
        </AuthFlowScroll>

        {offline ? <ConnectivityOverlay mode="offline" /> : null}
      </AuthKeyboardShell>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  boot: { alignItems: "center", justifyContent: "center", gap: 14 },
  bootBrand: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
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
})
