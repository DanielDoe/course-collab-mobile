import { useEffect } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { CachedRemoteImage } from "../../media/CachedRemoteImage"
import { useLoginTheme } from "../login-theme"
import { STUDENT_SIGNUP_PHONE_SHOT } from "./student-signup-artwork"

type Props = {
  caption: string
  accent: string
}

export function StudentSignupFeaturePreview({ caption, accent }: Props) {
  const { LOGIN, loginType } = useLoginTheme()
  const floatY = useSharedValue(0)

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
  }, [floatY])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  return (
    <Animated.View entering={FadeInDown.duration(320).springify()} style={styles.wrap}>
      <View
        style={[
          styles.glow,
          {
            backgroundColor: accent,
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.phoneStack, floatStyle]}>
        <View style={[styles.phoneBezel, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
          <CachedRemoteImage
            uri={STUDENT_SIGNUP_PHONE_SHOT.uri}
            variant="full"
            style={styles.phoneShot}
            contentFit="cover"
            accessibilityLabel={STUDENT_SIGNUP_PHONE_SHOT.accessibilityLabel}
          />
        </View>
        <View style={[styles.badge, { backgroundColor: LOGIN.fill, borderColor: LOGIN.separator }]}>
          <Ionicons name="sparkles" size={12} color={accent} />
          <Text style={[loginType.info, styles.badgeText, { color: LOGIN.label }]}>Cora ready on day one</Text>
        </View>
      </Animated.View>
      <View style={styles.captionRow}>
        <Ionicons name="school-outline" size={15} color={accent} />
        <Text style={[loginType.info, styles.caption, { color: LOGIN.secondaryLabel }]}>{caption}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  glow: {
    position: "absolute",
    top: 12,
    width: "72%",
    height: 140,
    borderRadius: 999,
    opacity: 0.14,
  },
  phoneStack: {
    width: "100%",
    maxWidth: 220,
    alignItems: "center",
  },
  phoneBezel: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 28,
    padding: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  phoneShot: {
    width: "100%",
    aspectRatio: 640 / 1301,
    borderRadius: 22,
  },
  badge: {
    position: "absolute",
    bottom: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontWeight: "600",
  },
  captionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 8,
    maxWidth: 320,
  },
  caption: {
    flex: 1,
    lineHeight: 19,
    textAlign: "center",
  },
})
