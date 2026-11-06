import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { WebView } from "react-native-webview"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { API_BASE_URL } from "../../constants"
import { appendNativeQuery } from "../../constants/module-web-paths"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  clearActivePracticeSession,
  getActivePracticeSession,
  hydrateActivePracticeSession,
  shouldClearPracticeSessionOnWebNav,
  type PracticeSessionData,
} from "../../lib/practice-session"
import { buildPracticeQuizInjectScript } from "../../lib/practice-web-inject"
import { NATIVE_APP_UA_SUFFIX } from "../../lib/web-session-inject"

const QUIZ_PATH = "/student/dashboard-v2/practice/quiz"

export function PracticeQuizWebScreen() {
  const { session } = useSession()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const webRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [hydrating, setHydrating] = useState(() => getActivePracticeSession() == null)
  const [practiceSession, setPracticeSession] = useState<PracticeSessionData | null>(() => getActivePracticeSession())

  useEffect(() => {
    if (practiceSession) {
      setHydrating(false)
      return
    }
    let cancelled = false
    void hydrateActivePracticeSession().then((stored) => {
      if (cancelled) return
      if (stored) setPracticeSession(stored)
      setHydrating(false)
    })
    return () => {
      cancelled = true
    }
  }, [practiceSession])

  if (!session || session.portal !== "student") {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        <Text style={[styles.error, { color: SN.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  if (hydrating) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
      </View>
    )
  }

  if (!practiceSession) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        <Text style={[styles.error, { color: SN.secondaryLabel }]}>Practice session not found.</Text>
        <Pressable onPress={() => router.replace("/module/practice" as never)}>
          <Text style={[styles.link, { color: tokens.accent }]}>Back to Practice Hub</Text>
        </Pressable>
      </View>
    )
  }

  const injectScript = buildPracticeQuizInjectScript(
    session,
    practiceSession.attemptId,
    practiceSession.questions,
    tokens,
    practiceSession.reviewOnly === true,
  )
  const uri = `${API_BASE_URL}${appendNativeQuery(QUIZ_PATH)}`

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: tokens.background }]}>
      <View style={[styles.bar, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <Pressable
          onPress={() => {
            void clearActivePracticeSession()
            router.back()
          }}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={tokens.accent} />
        </Pressable>
        <Text style={styles.barTitle}>Practice quiz</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={[styles.loading, { backgroundColor: `${tokens.background}e6` }]}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      ) : null}

      <WebView
        ref={webRef}
        source={{ uri }}
        injectedJavaScriptBeforeContentLoaded={injectScript}
        onLoadEnd={() => {
          setLoading(false)
          webRef.current?.injectJavaScript(injectScript)
        }}
        onNavigationStateChange={(nav) => {
          if (shouldClearPracticeSessionOnWebNav(nav.url)) {
            void clearActivePracticeSession()
          }
        }}
        applicationNameForUserAgent={NATIVE_APP_UA_SUFFIX}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { fontSize: 15 },
  link: { fontWeight: "700" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  barTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "600", color: "#0f172a" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  webview: { flex: 1 },
})
