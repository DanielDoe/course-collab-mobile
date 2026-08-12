import { useEffect } from "react"
import { Modal, StyleSheet, Text, View } from "react-native"
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

export type NotetakerProcessingStep = "upload" | "transcribe" | "summarize"

type Props = {
  visible: boolean
  label: string
  step?: NotetakerProcessingStep
}

const STEPS: { id: NotetakerProcessingStep; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "upload", title: "Upload", icon: "cloud-upload-outline" },
  { id: "transcribe", title: "Transcribe", icon: "text-outline" },
  { id: "summarize", title: "Summarize", icon: "sparkles-outline" },
]

function stepIndex(step: NotetakerProcessingStep): number {
  return STEPS.findIndex((s) => s.id === step)
}

export function NotetakerProcessingOverlay({ visible, label, step = "transcribe" }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const pulse = useSharedValue(0)
  const activeStep = stepIndex(step)

  useEffect(() => {
    if (!visible) return
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
  }, [visible, pulse])

  const orbStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 0.92 + pulse.value * 0.12 }],
  }))

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
          <Animated.View style={[styles.orb, orbStyle, { backgroundColor: tokens.accentSoft }]}>
            <Ionicons name="sparkles" size={28} color={tokens.accent} />
          </Animated.View>

          <Text style={[type.bodyEmphasis, styles.title]}>{label || "Working…"}</Text>
          <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]}>
            Cora is turning your audio into structured notes.
          </Text>

          <View style={styles.stepsRow}>
            {STEPS.map((item, index) => {
              const done = index < activeStep
              const current = index === activeStep
              const color = done ? tokens.success : current ? tokens.accent : native.tertiaryLabel
              return (
                <View key={item.id} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepIcon,
                      {
                        backgroundColor: done
                          ? `${tokens.success}18`
                          : current
                            ? tokens.accentSoft
                            : native.fill,
                      },
                    ]}
                  >
                    <Ionicons
                      name={done ? "checkmark" : item.icon}
                      size={16}
                      color={color}
                    />
                  </View>
                  <Text style={[type.caption, styles.stepLabel, { color }]}>{item.title}</Text>
                </View>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
    gap: 10,
  },
  orb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    textAlign: "center",
    marginTop: 4,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
})
