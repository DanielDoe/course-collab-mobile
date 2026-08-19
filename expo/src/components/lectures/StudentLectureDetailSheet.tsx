import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"
import type { LectureItem } from "../../lib/student-api"
import { MarkdownContentWebView } from "../course-info/MarkdownContentWebView"

type Props = {
  visible: boolean
  lecture: LectureItem | null
  onClose: () => void
  onViewSlides: (lecture: LectureItem) => void
}

function formatLectureStatus(status?: string): string {
  if (!status) return "Available"
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function StudentLectureDetailSheet({ visible, lecture, onClose, onViewSlides }: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  if (!lecture) return null

  const progress = lecture.progress_percentage ?? 0
  const description =
    lecture.description?.trim() ||
    "No description has been posted for this lecture yet. Open the slides to follow along with the deck."

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close lecture details" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: native.secondaryGrouped,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: native.tertiaryLabel }]} />
          </View>

          <View style={styles.header}>
            <View style={[styles.iconTile, { backgroundColor: tokens.accentSoftStrong }]}>
              <Ionicons name="easel-outline" size={20} color={tokens.accent} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: native.label }]} numberOfLines={3}>
                {lecture.title}
              </Text>
              <Text style={[styles.subtitle, { color: native.secondaryLabel }]}>
                Week {lecture.week} · {formatLectureStatus(lecture.status)} · {progress}% viewed
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionLabel, { color: native.secondaryLabel }]}>ABOUT THIS LECTURE</Text>
            <MarkdownContentWebView markdown={description} embedded />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
              onPress={() => onViewSlides(lecture)}
            >
              <Ionicons name="play-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>View slides</Text>
            </Pressable>
            <Pressable
              style={[styles.cancelBtn, { borderColor: tokens.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: native.label }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "88%",
    paddingHorizontal: 16,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
    }),
  },
  handleWrap: { alignItems: "center", paddingBottom: 12 },
  handle: { width: 36, height: 5, borderRadius: 3 },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 16 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 4, minWidth: 0 },
  title: { ...nativeType.bodyEmphasis, fontSize: 17, lineHeight: 22 },
  subtitle: { ...nativeType.caption, lineHeight: 18 },
  scroll: { flexGrow: 0, maxHeight: 220 },
  scrollContent: { paddingBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  description: { fontSize: 15, lineHeight: 22 },
  actions: { gap: 10, marginTop: 16 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 13,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
})
