import { useState } from "react"
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { WebView } from "react-native-webview"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { resolveProofUrl } from "../../lib/course-evaluation-api"
import {
  FACULTY_EVALUATIONS_COLOR,
  facultyEvaluationProofSolid,
} from "../../lib/faculty-course-evaluations-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Props = {
  url: string
  fileName?: string | null
  mime?: string | null
}

function inferProofMime(url: string, mime?: string | null): string {
  const normalized = (mime ?? "").trim().toLowerCase()
  if (normalized) return normalized
  const lower = url.toLowerCase()
  if (/\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/.test(lower)) return "image/jpeg"
  if (/\.pdf(\?|$)/.test(lower)) return "application/pdf"
  return "application/octet-stream"
}

export function FacultyEvaluationProofPreview({ url, fileName, mime }: Props) {
  const { native, tokens, type } = useModuleTheme()
  const themedNative = useThemedNative()
  const [zoomOpen, setZoomOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  const uri = resolveProofUrl(url)
  const resolvedMime = inferProofMime(url, mime)
  const isImage = resolvedMime.startsWith("image/")
  const isPdf = resolvedMime.includes("pdf")
  const label = fileName?.trim() || "Canvas proof"
  const proofSolid = facultyEvaluationProofSolid()

  if (isImage) {
    return (
      <>
        <Pressable
          style={[
            styles.previewCard,
            tokens.cardShadow,
            { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
          ]}
          onPress={() => setZoomOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`View ${label}`}
        >
          {failed ? (
            <View style={[styles.fallback, { backgroundColor: native.fill }]}>
              <Ionicons name="image-outline" size={28} color={native.tertiaryLabel} />
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                Image unavailable
              </Text>
              <Pressable onPress={() => void Linking.openURL(uri)} hitSlop={8}>
                <Text style={[type.caption, { color: FACULTY_EVALUATIONS_COLOR.link, fontWeight: "700" }]}>
                  Open in browser
                </Text>
              </Pressable>
            </View>
          ) : (
            <Image
              source={{ uri }}
              style={[styles.image, { backgroundColor: native.fill }]}
              resizeMode="contain"
              onError={() => setFailed(true)}
            />
          )}
          <View style={styles.previewFooter}>
            <View style={styles.previewFooterCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                {label}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                Tap to zoom
              </Text>
            </View>
            <Pressable onPress={() => void Linking.openURL(uri)} hitSlop={8}>
              <Ionicons name="open-outline" size={18} color={FACULTY_EVALUATIONS_COLOR.link} />
            </Pressable>
          </View>
        </Pressable>

        <Modal visible={zoomOpen} animationType="fade" transparent onRequestClose={() => setZoomOpen(false)}>
          <View style={styles.zoomBackdrop}>
            <Pressable style={styles.zoomClose} onPress={() => setZoomOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            {!failed ? (
              <Image source={{ uri }} style={styles.zoomImage} resizeMode="contain" />
            ) : null}
            <Text style={[type.caption, styles.zoomCaption]} numberOfLines={2}>
              {label}
            </Text>
          </View>
        </Modal>
      </>
    )
  }

  if (isPdf) {
    return (
      <View
        style={[
          styles.previewCard,
          tokens.cardShadow,
          { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
        ]}
      >
        <WebView
          source={{ uri }}
          style={[styles.pdfWebView, { backgroundColor: themedNative.fill }]}
          originWhitelist={["*"]}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator color={FACULTY_EVALUATIONS_COLOR.link} style={styles.pdfLoader} />
          )}
        />
        <View style={styles.previewFooter}>
          <View style={styles.previewFooterCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
              {label}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
              PDF preview
            </Text>
          </View>
          <Pressable onPress={() => void Linking.openURL(uri)} hitSlop={8}>
            <Ionicons name="open-outline" size={18} color={FACULTY_EVALUATIONS_COLOR.link} />
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <Pressable
      style={[
        styles.fileRow,
        { borderColor: native.separator, backgroundColor: native.secondaryGrouped },
      ]}
      onPress={() => void Linking.openURL(uri)}
    >
      <View style={[styles.fileIcon, { backgroundColor: proofSolid.fill }]}>
        <Ionicons name="document-text-outline" size={18} color={proofSolid.icon} />
      </View>
      <View style={styles.previewFooterCopy}>
        <Text style={[type.body, { color: native.label }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
          Tap to open file
        </Text>
      </View>
      <Ionicons name="open-outline" size={16} color={FACULTY_EVALUATIONS_COLOR.link} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 240,
  },
  fallback: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  pdfWebView: {
    width: "100%",
    height: 320,
  },
  pdfLoader: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
  },
  previewFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewFooterCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.94)",
    justifyContent: "center",
    padding: 16,
  },
  zoomClose: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 8,
  },
  zoomImage: {
    width: "100%",
    height: "72%",
  },
  zoomCaption: {
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 12,
    opacity: NATIVE.pressedOpacity,
  },
})
