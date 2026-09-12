import { useEffect, useMemo, useState } from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { WebView } from "react-native-webview"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { needsMarkdownRichRender, prepareMessageRichContent } from "../../lib/assessment-report-markdown"
import { buildMarkdownHtml } from "../../lib/markdown-html"

const MARKDOWN_HEIGHT_CACHE = new Map<string, number>()
const MARKDOWN_HEIGHT_CACHE_LIMIT = 256

function readCachedMarkdownHeight(messageId?: string): number | undefined {
  if (!messageId) return undefined
  return MARKDOWN_HEIGHT_CACHE.get(messageId)
}

function writeCachedMarkdownHeight(messageId: string, height: number) {
  MARKDOWN_HEIGHT_CACHE.set(messageId, height)
  if (MARKDOWN_HEIGHT_CACHE.size <= MARKDOWN_HEIGHT_CACHE_LIMIT) return
  const oldest = MARKDOWN_HEIGHT_CACHE.keys().next().value
  if (oldest) MARKDOWN_HEIGHT_CACHE.delete(oldest)
}

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
  /** Drop the chat WebView's extra body padding when the bubble already insets. */
  compact?: boolean
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
  compact = false,
}: Props) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const prepared = useMemo(() => prepareMessageRichContent(markdown), [markdown])
  const rendered = useDebouncedValue(prepared, streaming ? 160 : 0)
  const cachedHeight = readCachedMarkdownHeight(messageId)
  const [height, setHeight] = useState(cachedHeight ?? 96)
  const [paintReady, setPaintReady] = useState(Boolean(streaming || cachedHeight))
  const rich = useMemo(() => needsMarkdownRichRender(prepared || markdown), [markdown, prepared])

  const html = useMemo(
    () =>
      buildMarkdownHtml(
        rendered,
        "chat",
        {
          accent: onAccentSurface ? "#FFFFFF" : tokens.accent,
          accentSoft: onAccentSurface ? "rgba(255,255,255,0.16)" : tokens.accentSoft,
          text: onAccentSurface ? "#FFFFFF" : tokens.text,
          textSecondary: onAccentSurface ? "rgba(255,255,255,0.82)" : tokens.textSecondary,
          heading: onAccentSurface ? "#FFFFFF" : tokens.text,
          border: onAccentSurface ? "rgba(255,255,255,0.28)" : tokens.border,
          isDark: onAccentSurface ? true : tokens.isDark,
        },
        { compact },
      ),
    [
      rendered,
      onAccentSurface,
      tokens.accent,
      tokens.accentSoft,
      tokens.text,
      tokens.textSecondary,
      tokens.border,
      tokens.isDark,
      compact,
    ],
  )

  useEffect(() => {
    if (streaming) {
      setPaintReady(true)
      return
    }

    const nextCached = readCachedMarkdownHeight(messageId)
    setHeight(nextCached ?? 96)
    setPaintReady(Boolean(nextCached))
  }, [messageId, markdown, streaming])

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
    <View style={[styles.wrap, { minHeight: height }]}>
      <WebView
        key={webViewKey}
        source={{ html, baseUrl: "about:blank" }}
        style={{
          width: "100%",
          height,
          backgroundColor: "transparent",
          opacity: paintReady ? 1 : 0,
        }}
        {...WEBVIEW_PROPS}
        onLoadEnd={() => setPaintReady(true)}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data)
          if (!Number.isFinite(next) || next <= 0) return
          const clamped = Math.min(Math.max(next + 2, 48), 8000)
          setHeight((prev) => {
            if (Math.abs(clamped - prev) <= 2) return prev
            if (messageId) writeCachedMarkdownHeight(messageId, clamped)
            return clamped
          })
        }}
      />
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
})
