import { memo, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { WebView } from "react-native-webview"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import {
  buildMcqReportOptionsHtml,
  buildQuestionHtml,
  hasActiveQuestionMedia,
  needsQuestionRichRender,
  questionPlainText,
  resolveQuestionMediaUrl,
  type McqReportOptionHtmlItem,
  type QuestionMedia,
} from "../../lib/classroom-submission"
import { useRewardsTheme } from "./rewards-shared"

function useQuestionMediaSource(mediaUrl?: string | null) {
  const uri = useMemo(() => resolveQuestionMediaUrl(mediaUrl), [mediaUrl])
  return useMemo(() => (uri ? { uri } : null), [uri])
}

const WEBVIEW_PROPS = {
  scrollEnabled: false,
  showsVerticalScrollIndicator: false,
  originWhitelist: ["*"],
  javaScriptEnabled: true,
  domStorageEnabled: true,
  cacheEnabled: true,
  /** Never expose Safari / Chrome inspector on a release build. */
  webviewDebuggingEnabled: __DEV__,
  /** iOS long-press link preview can surface a share sheet out of the app. */
  allowsLinkPreview: false,
  ...(Platform.OS === "android" ? { cacheMode: "LOAD_DEFAULT" as const } : {}),
}

export const QuestionContentWebView = memo(function QuestionContentWebView({
  text,
  embedded,
  compact,
  chatBubble,
  textColor,
  secure: _secure,
}: {
  text: string
  embedded?: boolean
  compact?: boolean
  /** Immersive chat imported-question bubble — taller cap than composer compact. */
  chatBubble?: boolean
  /** Foreground override when the host row has a solid status fill (report option rows). */
  textColor?: string
  /** Accepted for call sites that mark sensitive question text; rendering is unchanged. */
  secure?: boolean
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const rich = useMemo(() => needsQuestionRichRender(text), [text])
  const plain = useMemo(() => questionPlainText(text), [text])
  const fg = textColor ?? native.label
  const html = useMemo(
    () =>
      buildQuestionHtml(text, {
        compact,
        theme: {
          isDark: tokens.isDark,
          text: fg,
          textSecondary: textColor ?? native.secondaryLabel,
          heading: fg,
        },
      }),
    [text, compact, tokens.isDark, fg, textColor, native.secondaryLabel],
  )
  const maxHeight = chatBubble ? 560 : compact ? 240 : 1200
  const [height, setHeight] = useState(chatBubble ? 72 : compact ? 36 : 80)

  useEffect(() => {
    if (!rich) return
    setHeight(chatBubble ? 72 : compact ? 36 : 80)
  }, [text, compact, chatBubble, tokens.isDark, rich])

  if (!text.trim()) return null

  if (!rich) {
    return (
      <Text
        style={[
          styles.plainText,
          compact && styles.plainTextCompact,
          embedded && styles.plainTextEmbedded,
          { color: fg },
        ]}
      >
        {plain}
      </Text>
    )
  }

  return (
    <View
      style={[
        styles.webWrap,
        embedded && styles.webWrapEmbedded,
        !embedded && { backgroundColor: native.fill, borderColor: native.separator },
        { height },
      ]}
    >
      <WebView
        key={`${compact ? "c" : "f"}:${tokens.isDark ? "d" : "l"}:${text.length}:${text.slice(0, 24)}`}
        source={{ html, baseUrl: "about:blank" }}
        style={[styles.webview, { height, backgroundColor: "transparent" }]}
        {...WEBVIEW_PROPS}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data)
          if (Number.isFinite(next) && next > 0) {
            setHeight(Math.min(Math.max(next + (compact || chatBubble ? 2 : 6), chatBubble ? 48 : compact ? 28 : 40), maxHeight))
          }
        }}
      />
    </View>
  )
})

export const QuestionMcqReportOptionsBlock = memo(function QuestionMcqReportOptionsBlock({
  items,
  compact,
}: {
  items: McqReportOptionHtmlItem[]
  compact?: boolean
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const html = useMemo(
    () =>
      buildMcqReportOptionsHtml(items, {
        compact,
        theme: {
          isDark: tokens.isDark,
          text: native.label,
          textSecondary: native.secondaryLabel,
          heading: native.label,
        },
      }),
    [items, compact, tokens.isDark, native.label, native.secondaryLabel],
  )
  const [height, setHeight] = useState(compact ? 120 : 160)
  const maxHeight = compact ? 720 : 1600

  if (items.length === 0) return null

  return (
    <View style={[styles.webWrap, styles.webWrapEmbedded, { height }]}>
      <WebView
        source={{ html, baseUrl: "about:blank" }}
        style={[styles.webview, { height, backgroundColor: "transparent" }]}
        {...WEBVIEW_PROPS}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data)
          if (Number.isFinite(next) && next > 0) {
            setHeight(Math.min(Math.max(next + 8, 48), maxHeight))
          }
        }}
      />
    </View>
  )
})

export function QuestionMediaView({
  media,
  embedded,
  compact,
}: {
  media?: QuestionMedia | null
  embedded?: boolean
  compact?: boolean
}) {
  const theme = useRewardsTheme()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const [zoomOpen, setZoomOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const imageSource = useQuestionMediaSource(media?.media_url)
  const uri = imageSource?.uri ?? ""
  const displaySource = useMemo(() => {
    if (!imageSource) return null
    if (retryKey === 0) return imageSource
    const sep = imageSource.uri.includes("?") ? "&" : "?"
    return { uri: `${imageSource.uri}${sep}_r=${retryKey}` }
  }, [imageSource, retryKey])

  useEffect(() => {
    setFailed(false)
  }, [uri])

  if (!hasActiveQuestionMedia(media)) return null

  const caption = media?.media_caption ?? media?.media_alt_text
  const isPdf = (media?.media_type ?? "").toLowerCase() === "pdf"

  if (isPdf) {
    return (
      <View
        style={[
          styles.pdfBlock,
          embedded && styles.embeddedBlock,
          { backgroundColor: native.fill, borderColor: native.separator },
        ]}
      >
        <WebView
          source={displaySource ?? { uri }}
          style={[styles.pdfWebView, { backgroundColor: tokens.surface }]}
          originWhitelist={["*"]}
          startInLoadingState
          renderLoading={() => <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />}
        />
        {caption ? (
          compact ? (
            <Text style={[styles.compactCaption, { color: native.secondaryLabel }]} numberOfLines={2}>
              {caption}
            </Text>
          ) : (
            <View style={styles.captionWrap}>
              <QuestionContentWebView text={caption} embedded />
            </View>
          )
        ) : null}
      </View>
    )
  }

  return (
    <>
      <Pressable
        style={[
          styles.mediaBlock,
          embedded && styles.embeddedBlock,
          compact && styles.mediaBlockCompact,
          { backgroundColor: native.fill, borderColor: native.separator },
        ]}
        onPress={() => setZoomOpen(true)}
      >
        {failed ? (
          <Pressable
            style={styles.mediaFallback}
            onPress={() => {
              setFailed(false)
              setRetryKey((k) => k + 1)
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading diagram"
          >
            <Ionicons name="image-outline" size={28} color={native.secondaryLabel} />
            <Text style={[styles.fallbackText, { color: native.secondaryLabel }]}>Diagram unavailable</Text>
            <Text style={[styles.retryText, { color: theme.primary }]}>Tap to retry</Text>
          </Pressable>
        ) : (
          <>
            <Image
              key={`${uri}:${retryKey}`}
              source={displaySource ?? { uri }}
              style={[styles.mediaImage, compact && styles.mediaImageCompact]}
              resizeMode="contain"
              onError={() => setFailed(true)}
            />
            <View style={styles.zoomBadge}>
              <Ionicons name="expand-outline" size={14} color="#ffffff" />
            </View>
          </>
        )}
        {caption ? (
          compact ? (
            <Text style={[styles.compactCaption, { color: native.secondaryLabel }]} numberOfLines={2}>
              {caption}
            </Text>
          ) : (
            <View style={styles.captionWrap}>
              <QuestionContentWebView text={caption} embedded />
            </View>
          )
        ) : null}
      </Pressable>

      <Modal visible={zoomOpen} animationType="fade" transparent onRequestClose={() => setZoomOpen(false)}>
        <View style={styles.zoomBackdrop}>
          <Pressable style={styles.zoomClose} onPress={() => setZoomOpen(false)}>
            <Ionicons name="close" size={28} color="#ffffff" />
          </Pressable>
          {!failed && displaySource ? (
            <Image source={displaySource} style={styles.zoomImage} resizeMode="contain" />
          ) : (
            <ActivityIndicator color="#ffffff" size="large" />
          )}
          {caption ? <Text style={styles.zoomCaption}>{caption}</Text> : null}
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  plainText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  plainTextCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  plainTextEmbedded: {
    width: "100%",
  },
  webWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  webWrapEmbedded: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    width: "100%",
    alignSelf: "stretch",
  },
  webview: { flex: 1 },
  mediaBlock: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaBlockCompact: {
    gap: 4,
    padding: 0,
    borderRadius: 8,
  },
  embeddedBlock: {
    borderWidth: 0,
    borderRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  mediaImage: { width: "100%", height: 200, borderRadius: 8 },
  mediaImageCompact: { height: 148 },
  mediaFallback: { height: 140, alignItems: "center", justifyContent: "center", gap: 8 },
  fallbackText: { fontSize: 13 },
  retryText: { fontSize: 12, fontWeight: "600" },
  captionWrap: { paddingHorizontal: 2 },
  compactCaption: { fontSize: 12, lineHeight: 16, paddingHorizontal: 2 },
  pdfBlock: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  pdfWebView: { width: "100%", height: 280, borderRadius: 8 },
  zoomBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    justifyContent: "center",
    padding: 16,
    gap: 12,
  },
  zoomClose: { alignSelf: "flex-end", padding: 8 },
  zoomImage: { width: "100%", height: "70%" },
  zoomCaption: { color: "#ffffff", fontSize: 13, textAlign: "center", lineHeight: 18 },
})
