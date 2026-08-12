import { useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { WebView } from "react-native-webview"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { buildMarkdownHtml } from "../../lib/markdown-html"
import { sanitizeMarkdownNoteBody } from "../../lib/markdown-note-content"

type Props = {
  markdown: string
  paddingHorizontal?: number
  minHeight?: number
}

/** Renders note markdown with KaTeX (Cora exports, study notes). */
export function MarkdownNotePreview({
  markdown,
  paddingHorizontal = 14,
  minHeight = 120,
}: Props) {
  const tokens = useAppThemeTokens()
  const [layoutWidth, setLayoutWidth] = useState(0)
  const [height, setHeight] = useState(minHeight)
  const [ready, setReady] = useState(false)

  const sanitized = useMemo(() => sanitizeMarkdownNoteBody(markdown), [markdown])

  const html = useMemo(
    () =>
      buildMarkdownHtml(sanitized, "reading", {
        accent: tokens.accent,
        accentSoft: tokens.accentSoft,
        text: tokens.text,
        textSecondary: tokens.textSecondary,
        border: tokens.border,
        isDark: tokens.isDark,
      }),
    [
      sanitized,
      tokens.accent,
      tokens.accentSoft,
      tokens.text,
      tokens.textSecondary,
      tokens.border,
      tokens.isDark,
    ],
  )

  if (!sanitized.trim()) return null

  return (
    <View
      style={[styles.wrap, { minHeight: height, paddingHorizontal }]}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width)
        if (next > 0 && next !== layoutWidth) setLayoutWidth(next)
      }}
    >
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={tokens.accent} />
        </View>
      ) : null}
      {layoutWidth > 0 ? (
        <WebView
          key={`${html.length}-${tokens.isDark ? "dark" : "light"}`}
          source={{ html, baseUrl: "about:blank" }}
          style={[
            styles.webview,
            {
              width: Math.max(layoutWidth - paddingHorizontal * 2, 1),
              height,
              opacity: ready ? 1 : 0,
            },
          ]}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => setReady(true)}
          onMessage={(event) => {
            const next = Number(event.nativeEvent.data)
            if (Number.isFinite(next) && next > 0) {
              setHeight((prev) => {
                const clamped = Math.min(Math.max(next + 8, minHeight), 12000)
                return Math.abs(clamped - prev) > 2 ? clamped : prev
              })
            }
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    position: "relative",
    paddingVertical: 6,
  },
  webview: {
    backgroundColor: "transparent",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
})
