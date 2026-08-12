import { useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { WebView } from "react-native-webview"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { buildAnnouncementHtml } from "../../lib/announcement-content"

type Props = {
  content: string
  accentColor?: string
  paddingHorizontal?: number
}

export function AnnouncementBodyWebView({
  content,
  accentColor,
  paddingHorizontal = 4,
}: Props) {
  const tokens = useAppThemeTokens()
  const resolvedAccent = accentColor ?? tokens.accent
  const html = useMemo(
    () =>
      buildAnnouncementHtml(content, {
        accentColor: resolvedAccent,
        paddingHorizontal,
        tokens,
      }),
    [content, resolvedAccent, paddingHorizontal, tokens],
  )
  const [height, setHeight] = useState(120)
  const [ready, setReady] = useState(false)

  if (!content.trim()) return null

  return (
    <View style={[styles.wrap, { minHeight: height }]}>
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={tokens.accent} />
        </View>
      ) : null}
      <WebView
        key={`${html.length}-${tokens.isDark ? "dark" : "light"}`}
        source={{ html, baseUrl: "about:blank" }}
        style={[styles.webview, { height, opacity: ready ? 1 : 0 }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setReady(true)}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data)
          if (Number.isFinite(next) && next > 0) setHeight(Math.min(Math.max(next + 4, 80), 4000))
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: "100%", position: "relative" },
  webview: { backgroundColor: "transparent" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80}})
