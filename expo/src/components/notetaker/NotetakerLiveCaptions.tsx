import { useEffect, useRef } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

type Props = {
  active: boolean
  finalText: string
  interimText: string
  error: string | null
  listening: boolean
  volume: number
}

export function NotetakerLiveCaptions({
  active,
  finalText,
  interimText,
  error,
  listening,
  volume,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const scrollRef = useRef<ScrollView>(null)
  const pulse = useSharedValue(0.35)

  useEffect(() => {
    pulse.value = active && listening
      ? withRepeat(
          withSequence(
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        )
      : withTiming(0.35, { duration: 200 })
  }, [active, listening, pulse])

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [finalText, interimText, error])

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.85 + pulse.value * 0.35 }],
  }))

  if (!active) return null

  const hasText = Boolean(finalText.trim() || interimText.trim())
  const micHot = listening && volume > 0.04

  return (
    <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
      <View style={[styles.header, { borderBottomColor: native.separator, backgroundColor: tokens.accentSoft }]}>
        <Animated.View style={[styles.liveDot, dotStyle, { backgroundColor: tokens.accent }]} />
        <Text style={[type.caption, styles.headerLabel, { color: tokens.accent }]}>Live text</Text>
        {listening ? (
          <View style={styles.meterTrack}>
            {[0.2, 0.45, 0.7].map((threshold) => (
              <View
                key={threshold}
                style={[
                  styles.meterBar,
                  {
                    backgroundColor: micHot && volume >= threshold ? tokens.success : native.fill,
                    height: 4 + threshold * 10,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <Ionicons name="ellipse-outline" size={12} color={native.tertiaryLabel} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Text style={[type.caption, { color: tokens.danger, lineHeight: 18 }]}>{error}</Text>
        ) : hasText ? (
          <Text style={[type.body, styles.bodyText, { color: native.label }]}>
            {finalText ? <Text>{finalText}</Text> : null}
            {interimText ? (
              <Text style={{ color: tokens.accent }}>
                {finalText ? " " : ""}
                {interimText}
              </Text>
            ) : null}
          </Text>
        ) : listening ? (
          <View style={styles.listeningRow}>
            <Ionicons name="mic-outline" size={16} color={tokens.accent} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Listening… speak clearly toward the mic</Text>
          </View>
        ) : (
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
            Live captions appear here as you speak.
          </Text>
        )}
      </ScrollView>

      <Text style={[type.footnote, styles.footer, { color: native.tertiaryLabel }]}>
        Preview only — after you stop, we run a full AI transcript and summary on the server.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLabel: {
    flex: 1,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  meterTrack: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 14,
  },
  meterBar: {
    width: 3,
    borderRadius: 999,
  },
  scroll: {
    maxHeight: 160,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
  },
  bodyText: {
    lineHeight: 22,
  },
  listeningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footer: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    lineHeight: 16,
  },
})
