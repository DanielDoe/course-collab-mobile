import { memo, useEffect, useMemo, useState } from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { WebView } from "react-native-webview"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import {
  buildFlashcardContentHtml,
  flashcardContentNeedsRichRender,
  flashcardPlainText,
  prepareFlashcardContentForRender,
} from "../../lib/flashcard-display"

const WEBVIEW_PROPS = {
  scrollEnabled: false,
  showsVerticalScrollIndicator: false,
  originWhitelist: ["*"],
  javaScriptEnabled: true,
  domStorageEnabled: true,
  cacheEnabled: true,
  webviewDebuggingEnabled: __DEV__,
  allowsLinkPreview: false,
  pointerEvents: "none" as const,
  ...(Platform.OS === "android" ? { cacheMode: "LOAD_DEFAULT" as const } : {}),
}

type Props = {
  text: string
  textColor: string
  placeholder?: string
  large?: boolean
  /** Always render via WebView — avoids iOS Text culling on flashcard overlays. */
  preferWebView?: boolean
}

/** KaTeX/markdown renderer for flashcard faces — does not intercept card taps. */
export const FlashcardContentWebView = memo(function FlashcardContentWebView({
  text,
  textColor,
  placeholder = "No content",
  large,
  preferWebView = false,
}: Props) {
  const tokens = useAppThemeTokens()
  const prepared = useMemo(() => prepareFlashcardContentForRender(text), [text])
  const rich = useMemo(() => flashcardContentNeedsRichRender(text), [text])
  const plain = useMemo(() => flashcardPlainText(text), [text])
  const html = useMemo(
    () =>
      buildFlashcardContentHtml(prepared, {
        theme: {
          isDark: tokens.isDark,
          text: textColor,
          textSecondary: textColor,
          heading: textColor,
        },
      }),
    [prepared, textColor, tokens.isDark],
  )

  const maxHeight = large ? 280 : 200
  const [height, setHeight] = useState(large ? 72 : 56)

  useEffect(() => {
    setHeight(large ? 72 : 56)
  }, [prepared, large, textColor])

  if (!text.trim()) {
    return (
      <Text style={[styles.plain, large && styles.plainLarge, { color: textColor }]}>
        {placeholder}
      </Text>
    )
  }

  if (!rich && !preferWebView) {
    return (
      <Text style={[styles.plain, large && styles.plainLarge, { color: textColor }]}>
        {plain || placeholder}
      </Text>
    )
  }

  return (
    <View
      style={[styles.wrap, { height, minHeight: large ? 56 : 48 }]}
      pointerEvents="none"
    >
      <WebView
        key={`fc:${tokens.isDark ? "d" : "l"}:${prepared.length}:${prepared.slice(0, 24)}`}
        source={{ html, baseUrl: "about:blank" }}
        style={[styles.webview, { height, backgroundColor: "transparent" }]}
        {...WEBVIEW_PROPS}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data)
          if (Number.isFinite(next) && next > 0) {
            setHeight(Math.min(Math.max(next + 4, large ? 56 : 48), maxHeight))
          }
        }}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
  },
  webview: {
    backgroundColor: "transparent",
  },
  plain: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  plainLarge: {
    fontSize: 19,
    lineHeight: 28,
  },
})
