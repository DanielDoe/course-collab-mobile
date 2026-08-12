import { useCallback, useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FACULTY_ANNOUNCEMENT_COLOR } from "../../lib/faculty-announcement-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"
import { COLOR_HUNT_COOL } from "../../lib/codebench-badge-theme"

type Props = {
  showingCount: number
  totalCount: number
}

const INSIGHT_THUMB = solidListThumbFixed(COLOR_HUNT_COOL.cyan)

export function FacultyAnnouncementsInsight({ showingCount, totalCount }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [mounted, setMounted] = useState(true)
  const progress = useSharedValue(0)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissingRef = useRef(false)

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return
    dismissingRef.current = true
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    progress.value = withTiming(
      0,
      { duration: 380, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setMounted)(false)
      },
    )
  }, [progress])

  useEffect(() => {
    progress.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
    autoDismissRef.current = setTimeout(dismiss, 6000)
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [dismiss, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -14 },
      { scale: 0.97 + progress.value * 0.03 },
    ],
    marginBottom: progress.value * 12,
  }))

  if (!mounted) return null

  return (
    <Animated.View style={[{ borderRadius: 16, overflow: "hidden" }, animatedStyle]}>
      <View
        style={[
          styles.banner,
          tokens.cardShadow,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: tokens.border,
          },
        ]}
      >
        <View style={styles.bannerRow}>
          <SolidListThumbTile thumb={INSIGHT_THUMB} icon="megaphone-outline" size="compact" />
          <View style={styles.bannerCopy}>
            <View style={styles.bannerEyebrow}>
              <Ionicons name="sparkles-outline" size={12} color={FACULTY_ANNOUNCEMENT_COLOR.ai} />
              <Text style={[type.caption, styles.bannerEyebrowText, { color: FACULTY_ANNOUNCEMENT_COLOR.ai }]}>
                Student feed
              </Text>
            </View>
            <Text style={[type.caption, styles.bannerBody, { color: native.secondaryLabel }]}>
              Publish course updates with optional AI summaries — students see these in their announcement feed.
            </Text>
          </View>
          <Pressable
            style={[styles.closeBtn, { backgroundColor: native.fill }]}
            onPress={dismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss student feed info"
          >
            <Ionicons name="close" size={16} color={native.secondaryLabel} />
          </Pressable>
        </View>
        <View style={[styles.bannerFoot, { borderTopColor: native.separator }]}>
          <View style={styles.bannerFootItem}>
            <Ionicons name="eye-outline" size={13} color={native.tertiaryLabel} />
            <Text style={[type.caption, styles.bannerFootText, { color: native.tertiaryLabel }]}>
              {showingCount} showing · {totalCount} total
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  bannerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bannerCopy: { flex: 1, gap: 4 },
  bannerEyebrow: { flexDirection: "row", alignItems: "center", gap: 5 },
  bannerEyebrowText: { letterSpacing: 0.2, fontWeight: "700" },
  bannerBody: { lineHeight: 18, fontWeight: "500" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerFoot: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bannerFootItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  bannerFootText: { fontWeight: "600" },
})
