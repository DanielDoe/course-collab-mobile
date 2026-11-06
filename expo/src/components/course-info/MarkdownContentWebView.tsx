import { useMemo, useState } from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { WebView } from "react-native-webview"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { needsMarkdownRichRender, prepareMessageRichContent } from "../../lib/assessment-report-markdown"
import { buildMarkdownHtml, type MarkdownHtmlVariant } from "../../lib/markdown-html"

type Props = {
  markdown: string
  /** @deprecated Prefer `variant="embedded"` */
  embedded?: boolean
  variant?: MarkdownHtmlVariant | "embedded"
}

const WEBVIEW_PROPS = {
  scrollEnabled: false,
  showsVerticalScrollIndicator: false,
  originWhitelist: ["*"],
  javaScriptEnabled: true,
  domStorageEnabled: true,
  cacheEnabled: true,
  ...(Platform.OS === "android" ? { cacheMode: "LOAD_DEFAULT" as const } : {}),
}

export function MarkdownContentWebView({ markdown, embedded, variant }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const resolvedVariant: MarkdownHtmlVariant | "embedded" =
    variant ?? (embedded ? "embedded" : "default")
  const prepared = useMemo(() => prepareMessageRichContent(markdown), [markdown])
  const rich = useMemo(() => needsMarkdownRichRender(prepared || markdown), [markdown, prepared])
  const html = useMemo(
    () =>
      buildMarkdownHtml(
        prepared,
        resolvedVariant === "embedded" ? "reading" : resolvedVariant,
        {
          accent: tokens.accent,
          accentSoft: tokens.accentSoft,
          text: tokens.text,
          textSecondary: tokens.textSecondary,
          heading: tokens.text,
          border: tokens.border,
          isDark: tokens.isDark,
        },
      ),
    [
      prepared,
      resolvedVariant,
      tokens.accent,
      tokens.accentSoft,
      tokens.text,
      tokens.textSecondary,
      tokens.border,
      tokens.isDark,
    ],
  )
  const [height, setHeight] = useState(resolvedVariant === "reading" ? 120 : 80)

  if (!markdown.trim()) return null

  if (!rich) {
    return (
      <Text
        style={[
          styles.plain,
          resolvedVariant === "embedded" && styles.plainEmbedded,
          { color: native.label },
        ]}
      >
        {markdown.trim()}
      </Text>
    )
  }

  return (
    <View
      style={[
        styles.wrap,
        resolvedVariant === "embedded" && styles.wrapEmbedded,
        resolvedVariant === "reading" && [
          styles.wrapReading,
          { backgroundColor: tokens.elevatedSurface ?? tokens.surface, borderColor: tokens.border },
        ],
        resolvedVariant === "default" && {
          borderColor: tokens.border,
          backgroundColor: tokens.elevatedSurface ?? tokens.surface,
        },
        { minHeight: height },
      ]}
    >
      <WebView
        source={{ html, baseUrl: "about:blank" }}
        style={[styles.webview, { height }]}
        {...WEBVIEW_PROPS}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data)
          if (Number.isFinite(next) && next > 0) setHeight(Math.min(Math.max(next + 6, 40), 4000))
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  plain: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
  plainEmbedded: { width: "100%" },
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  wrapReading: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
  },
  wrapEmbedded: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  webview: { flex: 1, backgroundColor: "transparent" },
})
