import { useEffect, useMemo, useState } from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { WebView } from "react-native-webview"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { needsMarkdownRichRender } from "../../lib/assessment-report-markdown"
import { buildMarkdownHtml } from "../../lib/markdown-html"

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value)
      return
    }
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return delayMs <= 0 ? value : debounced
}

type Props = {
  markdown: string
  streaming?: boolean
  /** Stable id — keeps WebView mounted while content streams. */
  messageId?: string
  /** Light text + borders for markdown on solid accent chat bubbles. */
  onAccentSurface?: boolean
}

const WEBVIEW_PROPS = {
  scrollEnabled: false,
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  originWhitelist: ["*"],
  javaScriptEnabled: true,
  domStorageEnabled: true,
  cacheEnabled: true,
  automaticallyAdjustContentInsets: false,
  setBuiltInZoomControls: false,
  scalesPageToFit: false,
  ...(Platform.OS === "android" ? { cacheMode: "LOAD_DEFAULT" as const } : {}),
}

/** Renders AI Tutor replies with markdown + KaTeX inside the chat bubble. */
export function AiTutorMessageMarkdown({
  markdown,
  streaming = false,
  messageId,
  onAccentSurface = false,
}: Props) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const rendered = useDebouncedValue(markdown, streaming ? 160 : 0)
  const [layoutWidth, setLayoutWidth] = useState(0)
  const [height, setHeight] = useState(72)
  const rich = useMemo(() => needsMarkdownRichRender(markdown), [markdown])

  const html = useMemo(
    () =>
      buildMarkdownHtml(rendered, "chat", {
        accent: onAccentSurface ? "#FFFFFF" : tokens.accent,
        accentSoft: onAccentSurface ? "rgba(255,255,255,0.16)" : tokens.accentSoft,
        text: onAccentSurface ? "#FFFFFF" : tokens.text,
        textSecondary: onAccentSurface ? "rgba(255,255,255,0.82)" : tokens.textSecondary,
        heading: onAccentSurface ? "#FFFFFF" : tokens.text,
        border: onAccentSurface ? "rgba(255,255,255,0.28)" : tokens.border,
        isDark: onAccentSurface ? true : tokens.isDark,
      }),
    [
      rendered,
      onAccentSurface,
      tokens.accent,
      tokens.accentSoft,
      tokens.text,
      tokens.textSecondary,
      tokens.border,
      tokens.isDark,
    ],
  )

  if (!markdown.trim()) return null

  if (!rich) {
    return (
      <Text
        style={[
          type.body,
          styles.plain,
          { color: onAccentSurface ? "#FFFFFF" : tokens.text },
        ]}
      >
        {markdown.trim()}
      </Text>
    )
  }

  const webViewKey = messageId ?? "markdown"

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width)
        if (next > 0 && next !== layoutWidth) setLayoutWidth(next)
      }}
    >
      {layoutWidth > 0 ? (
        <WebView
          key={webViewKey}
          source={{ html, baseUrl: "about:blank" }}
          style={{ width: layoutWidth, height, backgroundColor: "transparent" }}
          {...WEBVIEW_PROPS}
          onMessage={(event) => {
            const next = Number(event.nativeEvent.data)
            if (Number.isFinite(next) && next > 0) {
              setHeight((prev) => {
                const clamped = Math.min(Math.max(next + 2, 48), 8000)
                return Math.abs(clamped - prev) > 2 ? clamped : prev
              })
            }
          }}
        />
      ) : (
        <View style={styles.measurePlaceholder} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    width: "100%",
  },
  plain: {
    alignSelf: "stretch",
  },
  measurePlaceholder: {
    alignSelf: "stretch",
    width: "100%",
    minHeight: 48,
  },
})
