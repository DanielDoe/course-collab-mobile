import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { WebView } from "react-native-webview"
import { useRouter } from "expo-router"
import { useChromeTopInset, useModuleContentTopPadding } from "../../context/ChromeInsetContext"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { API_BASE_URL } from "../../constants"
import { hexToRgba } from "../../constants/app-themes"
import { nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { appendNativeQuery, isAssessmentTakeWebPath } from "../../constants/module-web-paths"
import { ASSESSMENT_WEBVIEW_HARDENING_SCRIPT } from "../../lib/assessment-webview-hardening"
import { tryOpenNativeAssessmentResultsFromUrl } from "../assessments/assessment-navigation"
import { buildNativeWebThemeInjectScript } from "../../lib/native-web-theme-inject"
import {
  buildFacultyWebSessionInjectScript,
  buildGuestWebSessionInjectScript,
  buildSummerWebSessionInjectScript,
  buildWebSessionInjectScript,
  NATIVE_APP_UA_SUFFIX} from "../../lib/web-session-inject"
import { useSession } from "../../context/SessionProvider"
import { useOptionalStudentShell } from "../../context/StudentShellContext"
import { useOptionalFacultyShell } from "../../context/FacultyShellContext"
import { notificationModulesFromWebPath } from "../../lib/notifications/module-notification-registry"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { tryHandleMembershipWebNavigation } from "../../lib/membership-navigation"
import { tryHandleFacultyMembershipWebNavigation } from "../../lib/faculty-membership-navigation"
import { isWebChangePasswordUrl, replaceAuthRoute } from "../../lib/navigation-reset"
import type { FacultySession, GuestSession, StudentSession, SummerSession } from "../../lib/session"
import {
  getAllowedWebViewOriginPrefixes,
  isAllowedWebViewHost,
  sanitizeNativeNavigateRoute,
} from "../../lib/trusted-origins"

/** Scheme + host of a URL, lowercased; "" when it has no origin (about:, data:). */
function urlOrigin(url: string): string {
  const match = /^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)/i.exec(url.trim())
  return match ? match[1].toLowerCase() : ""
}

type Props = {
  webPath: string
  title?: string
  /** When embedding faculty web views, pass selected course for session inject. */
  facultyCourse?: { id: number; course_code: string; course_title: string } | null
  /** Hide web dashboard chrome; content respects device safe areas. */
  immersive?: boolean
  /** Student lecture slide viewer — strip dashboard chrome inside the WebView. */
  immersiveLecture?: boolean
  /** Summer camper dashboard-v2 modules. */
  summerPortal?: boolean
  /** Stripe membership checkout, billing, success, or cancel flows. */
  membershipFlow?: boolean
  /** Optional hook for membership URL interception (used by dedicated flow screens). */
  onMembershipNavigation?: (url: string) => void
  /** Apply top safe-area inset on the WebView container (default true when immersive). */
  insetTop?: boolean
  /** Extra JS injected after session bootstrap (e.g. open a lecture tool panel). */
  extraInjectScript?: string
}

export function WebModuleScreen({
  webPath,
  facultyCourse = null,
  immersive = false,
  immersiveLecture = false,
  summerPortal = false,
  membershipFlow = false,
  onMembershipNavigation,
  insetTop,
  extraInjectScript,
}: Props) {
  const insets = useSafeAreaInsets()
  const chromeTop = useChromeTopInset()
  const moduleTopPad = useModuleContentTopPadding()
  const router = useRouter()
  const { session } = useSession()
  const studentShell = useOptionalStudentShell()
  const facultyShell = useOptionalFacultyShell()
  const refreshStudentData = studentShell?.refreshStudentData ?? null
  const refreshFacultyData = facultyShell?.refreshFacultyData ?? null
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const webRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const injectScript = useMemo(() => {
    if (session?.portal === "summer" || summerPortal) {
      if (session?.portal !== "summer") return "true;"
      return buildSummerWebSessionInjectScript(session as SummerSession, { theme: tokens })
    }
    if (session?.portal === "guest") {
      return buildGuestWebSessionInjectScript(session as GuestSession, { theme: tokens })
    }
    if (session?.portal === "student") {
      return buildWebSessionInjectScript(session as StudentSession, {
        immersiveLecture: immersiveLecture || immersive,
        theme: tokens,
      })
    }
    if (session?.portal === "faculty") {
      return buildFacultyWebSessionInjectScript(session as FacultySession, facultyCourse, {
        immersiveLecture: immersive})
    }
    return "true;"
  }, [session, facultyCourse, immersive, immersiveLecture, summerPortal, tokens])

  const themeInjectScript = useMemo(() => buildNativeWebThemeInjectScript(tokens), [tokens])

  /** Live quiz / homework / exam page — apply anti-cheat WebView hardening. */
  const isAssessmentTake = useMemo(() => isAssessmentTakeWebPath(webPath), [webPath])
  const appOrigin = useMemo(() => urlOrigin(API_BASE_URL), [])
  const webViewOrigins = useMemo(
    () => getAllowedWebViewOriginPrefixes({ membershipFlow }),
    [membershipFlow],
  )

  const combinedInjectScript = useMemo(() => {
    const parts = [injectScript]
    if (extraInjectScript?.trim()) parts.push(extraInjectScript)
    if (isAssessmentTake) parts.push(ASSESSMENT_WEBVIEW_HARDENING_SCRIPT)
    return parts.join("\n")
  }, [injectScript, extraInjectScript, isAssessmentTake])

  const uri = `${API_BASE_URL}${appendNativeQuery(webPath)}`

  const onRefresh = useCallback(() => {
    setError("")
    setLoading(true)
    webRef.current?.reload()
  }, [])

  const notificationModules = useMemo(() => notificationModulesFromWebPath(webPath), [webPath])
  useNotificationModuleRefresh(notificationModules, onRefresh)

  useEffect(() => {
    setLoading(true)
    setError("")
  }, [webPath])

  useEffect(() => {
    webRef.current?.injectJavaScript(themeInjectScript)
  }, [themeInjectScript])

  if (!session || (session.portal !== "student" && session.portal !== "faculty" && session.portal !== "summer" && session.portal !== "guest")) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>A signed-in session is required.</Text>
      </View>
    )
  }

  const applyTopInset = insetTop ?? (immersive && !immersiveLecture)

  return (
    <View
      style={[
        styles.root,
        immersiveLecture
          ? { backgroundColor: tokens.surface }
          : { backgroundColor: native.groupedBackground },
        applyTopInset ? { paddingTop: chromeTop > 0 ? moduleTopPad : insets.top } : null,
        immersiveLecture ? null : { paddingBottom: insets.bottom },
      ]}
    >
      {loading ? (
        <View
          style={[
            styles.loadingOverlay,
            { backgroundColor: hexToRgba(tokens.background, 0.92) },
          ]}
        >
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[styles.loadingText, { color: native.secondaryLabel }]}>Loading…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRefresh}>
            <Text style={[styles.retry, { color: tokens.accent }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <WebView
        key={
          session?.portal === "student"
            ? `student-${session.courseId ?? "none"}-${session.section || "none"}`
            : session?.portal === "faculty"
              ? `faculty-${facultyCourse?.id ?? "none"}`
              : session?.portal ?? "web"
        }
        ref={webRef}
        source={{ uri }}
        injectedJavaScriptBeforeContentLoaded={combinedInjectScript}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false)
          webRef.current?.injectJavaScript(combinedInjectScript)
          webRef.current?.injectJavaScript(themeInjectScript)
        }}
        onNavigationStateChange={(nav) => {
          if (nav.url && isWebChangePasswordUrl(nav.url)) {
            replaceAuthRoute(router, "/change-password")
            return
          }
          if (session?.portal === "student" && nav.url) {
            if (tryOpenNativeAssessmentResultsFromUrl(router, nav.url)) {
              webRef.current?.injectJavaScript(themeInjectScript)
              return
            }
            if (membershipFlow || /\/student\/(?:dashboard-v2\/)?membership\//i.test(nav.url)) {
              if (onMembershipNavigation) {
                onMembershipNavigation(nav.url)
              } else if (
                tryHandleMembershipWebNavigation(router, nav.url, refreshStudentData)
              ) {
                webRef.current?.injectJavaScript(themeInjectScript)
                return
              }
            }
          }
          if (session?.portal === "faculty" && nav.url) {
            if (membershipFlow || /\/instructor\/(?:dashboard-v2\/)?membership\//i.test(nav.url)) {
              if (onMembershipNavigation) {
                onMembershipNavigation(nav.url)
              } else if (
                tryHandleFacultyMembershipWebNavigation(router, nav.url, refreshFacultyData)
              ) {
                webRef.current?.injectJavaScript(themeInjectScript)
                return
              }
            }
          }
          webRef.current?.injectJavaScript(themeInjectScript)
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as {
              type?: string
              route?: string
            }
            if (data.type === "NOTETAKER_READY") {
              setLoading(false)
              return
            }
            if (data.type === "REFRESH_STUDENT_DATA") {
              void refreshStudentData?.({ force: true })
              return
            }
            if (data.type === "NATIVE_NAVIGATE" && typeof data.route === "string") {
              const route = sanitizeNativeNavigateRoute(data.route)
              if (route) router.replace(route as never)
            }
          } catch {
            /* ignore */
          }
        }}
        onHttpError={(event) => {
          const status = event.nativeEvent.statusCode
          if (status >= 400) {
            setLoading(false)
            setError(
              status === 404
                ? "This page was not found. Swipe from the left edge to go back and try again."
                : `Could not load this module (HTTP ${status}). Check your connection and try again.`,
            )
          }
        }}
        onError={() => {
          setLoading(false)
          setError("Could not load this module. Check your connection and try again.")
        }}
        originWhitelist={webViewOrigins}
        applicationNameForUserAgent={NATIVE_APP_UA_SUFFIX}
        sharedCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        allowsBackForwardNavigationGestures={false}
        /** Safari / Chrome remote inspection must never be reachable in a release build. */
        webviewDebuggingEnabled={__DEV__}
        /** iOS long-press link preview opens a share sheet out of the assessment. */
        allowsLinkPreview={!isAssessmentTake}
        onShouldStartLoadWithRequest={(request) => {
          if (request.isTopFrame === false) return true
          const raw = request.url?.trim() ?? ""
          if (!raw || raw === "about:blank") return true
          if (/^(javascript|data|file|blob):/i.test(raw)) return false
          const target = urlOrigin(raw)
          if (!target) return false
          try {
            const host = new URL(raw).hostname
            if (isAssessmentTake) return target === appOrigin
            return isAllowedWebViewHost(host, { membershipFlow })
          } catch {
            return false
          }
        }}
        style={styles.webview}
        setSupportMultipleWindows={false}
        contentInsetAdjustmentBehavior={immersiveLecture ? "never" : "automatic"}
        automaticallyAdjustContentInsets={!immersiveLecture}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 2},
  loadingText: { fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorBox: { padding: 16, gap: 8, zIndex: 3 },
  errorText: { color: "#b91c1c", fontSize: 14, lineHeight: 20 },
  retry: { fontWeight: "600" },
})
