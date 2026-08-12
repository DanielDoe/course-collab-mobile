import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassSurface } from "../theme/GlassSurface"

type PdfSource = {
  uri: string
  headers?: Record<string, string>
}

type Props = {
  visible: boolean
  pdfSource: PdfSource
  title?: string
  onClose: () => void
  onDownloaded?: () => void
}

export function GuestLetterPdfSheet({
  visible,
  pdfSource,
  title = "Recommendation letter",
  onClose,
  onDownloaded,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (visible) {
      setLoading(true)
      setLoadError("")
    }
  }, [visible, pdfSource.uri])

  const source = useMemo(
    () => ({
      uri: pdfSource.uri,
      headers: pdfSource.headers,
    }),
    [pdfSource.headers, pdfSource.uri],
  )

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const { documentDirectory, downloadAsync } = await import("expo-file-system/legacy")
      if (!documentDirectory) {
        throw new Error("No document directory")
      }
      const filename = `recommendation-letter-${Date.now()}.pdf`
      const target = `${documentDirectory}${filename}`
      const result = await downloadAsync(pdfSource.uri, target, {
        headers: pdfSource.headers,
      })

      if (Platform.OS === "ios" || Platform.OS === "android") {
        await Share.share({
          url: result.uri,
          title: "Recommendation letter",
          message: Platform.OS === "android" ? "Recommendation letter PDF" : undefined,
        })
      }

      onDownloaded?.()
    } catch {
      AppAlert.alert("Download failed", "Could not save the letter PDF. Check your connection and try again.")
    } finally {
      setDownloading(false)
    }
  }, [onDownloaded, pdfSource.headers, pdfSource.uri])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <GlassSurface style={[styles.chrome, { paddingTop: insets.top + 6, borderBottomColor: tokens.border }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: tokens.textMuted, opacity: 0.35 }]} />
          </View>
          <View style={styles.titleRow}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Done</Text>
            </Pressable>
            <Text style={[type.sheetTitle, styles.title, { color: native.label }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              style={[styles.downloadBtn, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}
              onPress={() => void handleDownload()}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={tokens.accent} />
                  <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "700" }]}>Save</Text>
                </>
              )}
            </Pressable>
          </View>
        </GlassSurface>

        <View style={[styles.previewFrame, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={tokens.accent} />
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading letter preview…</Text>
            </View>
          ) : null}
          {loadError ? (
            <View style={styles.loading}>
              <Ionicons name="alert-circle-outline" size={28} color={tokens.danger} />
              <Text style={[type.body, { color: native.label, textAlign: "center" }]}>{loadError}</Text>
            </View>
          ) : null}
          {!loadError ? (
            <WebView
              source={source}
              style={styles.webview}
              originWhitelist={["*"]}
              onLoadEnd={() => setLoading(false)}
              onHttpError={(event) => {
                setLoading(false)
                if (event.nativeEvent.statusCode >= 400) {
                  setLoadError("Could not load the letter preview. Try again or use Download PDF.")
                }
              }}
              onError={() => {
                setLoading(false)
                setLoadError("Could not load the letter preview. Try again or use Download PDF.")
              }}
              startInLoadingState={false}
              scalesPageToFit
              allowsInlineMediaPlayback
            />
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: native.separator }]}>
          <Text style={[type.caption, { color: native.secondaryLabel, flex: 1 }]}>
            Preview your finalized letter. Tap Save to download or share the PDF.
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
            onPress={() => void handleDownload()}
            disabled={downloading}
          >
            <Ionicons name="document-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>{downloading ? "Saving…" : "Download PDF"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { borderBottomWidth: StyleSheet.hairlineWidth },
  handleWrap: { alignItems: "center", paddingBottom: 6 },
  handle: { width: 36, height: 5, borderRadius: 3 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  title: { flex: 1, textAlign: "center" },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 72,
    justifyContent: "center",
  },
  previewFrame: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  webview: { flex: 1, backgroundColor: "transparent" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    zIndex: 2,
    paddingHorizontal: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
})
