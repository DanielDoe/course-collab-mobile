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
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

export type FlashInfoHint = {
  id: string
  icon: keyof typeof Ionicons.glyphMap
  message: string
}

const BANNER_MAX_HEIGHT = 120

type ToastProps = FlashInfoHint & {
  onDismiss: () => void
  durationMs?: number
}

function FlashInfoToast({ icon, message, onDismiss, durationMs = 3800 }: ToastProps) {
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
        if (finished) {
          runOnJS(setMounted)(false)
          runOnJS(onDismiss)()
        }
      },
    )
  }, [onDismiss, progress])

  useEffect(() => {
    progress.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
    autoDismissRef.current = setTimeout(dismiss, durationMs)
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [dismiss, durationMs, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxHeight: progress.value * BANNER_MAX_HEIGHT,
    marginBottom: progress.value * 12,
    transform: [
      { translateY: (1 - progress.value) * -12 },
      { scale: 0.98 + progress.value * 0.02 },
    ],
  }))

  if (!mounted) return null

  return (
    <Animated.View style={[styles.bannerWrap, animatedStyle]}>
      <View
        style={[
          styles.banner,
          { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
        ]}
      >
        <View style={[styles.iconTile, { backgroundColor: native.fill }]}>
          <Ionicons name={icon} size={16} color={native.secondaryLabel} />
        </View>
        <Text style={[type.caption, styles.bannerText, { color: native.secondaryLabel }]}>{message}</Text>
        <Pressable
          onPress={dismiss}
          hitSlop={8}
          style={[styles.closeBtn, { backgroundColor: native.fill }]}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss: ${message}`}
        >
          <Ionicons name="close" size={14} color={native.secondaryLabel} />
        </Pressable>
      </View>
    </Animated.View>
  )
}

/** Inline hints — push scroll content down, then collapse on dismiss (academic terms pattern). */
export function FlashInfoHintQueue({ hints }: { hints: FlashInfoHint[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [hints])

  if (hints.length === 0 || index >= hints.length) return null

  const current = hints[index]!

  return (
    <FlashInfoToast
      key={current.id}
      {...current}
      onDismiss={() => setIndex((prev) => prev + 1)}
    />
  )
}

const styles = StyleSheet.create({
  bannerWrap: {
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  bannerText: { flex: 1, lineHeight: 18 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
})
