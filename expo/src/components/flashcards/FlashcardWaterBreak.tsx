import { useEffect, useState } from "react"
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { AppButton } from "../theme/AppButton"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NativeSelect } from "../NativeSelect"
import { MINUTE_OPTIONS, withCurrentOption } from "../faculty/FacultyNativePickers"

const PRESET_MINUTES = [2, 5, 10] as const
const MAX_CUSTOM_MINUTES = 30

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

/** CSS-inspired drinking glass — liquid drains in a loop. */
function DrinkingGlassLoader({ size = 1 }: { size?: number }) {
  const tokens = useAppThemeTokens()
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    )
  }, [progress])

  const glassW = 35 * size
  const glassH = 80 * size
  const liquidMaxH = glassH - 14 * size

  const liquidStyle = useAnimatedStyle(() => {
    const h = interpolate(progress.value, [0, 1], [liquidMaxH, liquidMaxH * 0.05])
    return {
      height: h,
    }
  })

  const rim = tokens.isDark ? "#9a9488" : "#bbb6aa"
  const glassFill = tokens.isDark ? "#3a3732" : "#e4e0d7"
  const liquid = tokens.isDark ? "#5ec8c8" : "#77d4d4"
  const straw = "#eb6b3e"

  return (
    <View style={{ width: glassW + 16 * size, height: glassH + 22 * size, alignItems: "center" }}>
      {/* Straw */}
      <View
        style={{
          position: "absolute",
          top: 0,
          width: 4 * size,
          height: glassH * 0.55,
          backgroundColor: straw,
          borderRadius: 2 * size,
          transform: [{ rotate: "8deg" }],
          zIndex: 2,
        }}
      />
      <View
        style={{
          marginTop: 18 * size,
          width: glassW,
          height: glassH,
          borderTopWidth: 1 * size,
          borderBottomWidth: 4 * size,
          borderColor: rim,
          backgroundColor: glassFill,
          borderRadius: 4 * size,
          paddingHorizontal: 5 * size,
          paddingVertical: 3 * size,
          overflow: "hidden",
          justifyContent: "flex-end",
        }}
      >
        <Animated.View
          style={[
            {
              width: "100%",
              backgroundColor: liquid,
              borderRadius: 2 * size,
            },
            liquidStyle,
          ]}
        />
      </View>
    </View>
  )
}

type WaterBreakDurationDialogProps = {
  visible: boolean
  onDismiss: () => void
  onStart: (minutes: number) => void
  /** Sheet body copy under the title. */
  description?: string
  skipLabel?: string
}

export function WaterBreakDurationDialog({
  visible,
  onDismiss,
  onStart,
  description = "Step away and hydrate before your batch quiz. You can skip anytime.",
  skipLabel = "Skip break",
}: WaterBreakDurationDialogProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [customMinutes, setCustomMinutes] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<number | "custom" | null>(null)

  useEffect(() => {
    if (!visible) {
      setCustomMinutes("")
      setSelectedPreset(null)
    }
  }, [visible])

  const parsedCustom = Number.parseInt(customMinutes, 10)
  const customValid =
    selectedPreset === "custom" &&
    Number.isFinite(parsedCustom) &&
    parsedCustom >= 1 &&
    parsedCustom <= MAX_CUSTOM_MINUTES
  const canStart = selectedPreset === "custom" ? customValid : selectedPreset != null

  function handleStart() {
    if (selectedPreset === "custom" && customValid) {
      onStart(parsedCustom)
      return
    }
    if (typeof selectedPreset === "number") {
      onStart(selectedPreset)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: native.secondaryGrouped,
              paddingBottom: insets.bottom + 16,
              borderColor: native.separator,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetGlass}>
              <DrinkingGlassLoader size={0.72} />
            </View>
            <View style={styles.sheetCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>Water break</Text>
              <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
                {description}
              </Text>
            </View>
          </View>

          <View style={styles.presetRow}>
            {PRESET_MINUTES.map((mins) => {
              const selected = selectedPreset === mins
              return (
                <Pressable
                  key={mins}
                  onPress={() => setSelectedPreset(mins)}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: selected ? tokens.accent : native.tertiaryGrouped,
                      borderColor: selected ? tokens.accent : native.separator,
                    },
                  ]}
                >
                  <Text style={[type.bodyEmphasis, { color: selected ? "#fff" : native.label }]}>
                    {mins} min
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Pressable
            onPress={() => setSelectedPreset("custom")}
            style={[
              styles.customToggle,
              {
                borderColor: selectedPreset === "custom" ? tokens.accent : native.separator,
                backgroundColor: native.tertiaryGrouped,
              },
            ]}
          >
            <Text style={[type.body, { color: native.label }]}>Custom duration</Text>
          </Pressable>

          {selectedPreset === "custom" ? (
            <View style={styles.customRow}>
              <View style={{ flex: 1 }}>
                <NativeSelect
                  placeholder="Minutes"
                  value={customMinutes}
                  options={withCurrentOption(
                    MINUTE_OPTIONS.filter((option) => Number(option.value) <= MAX_CUSTOM_MINUTES),
                    customMinutes,
                    `${customMinutes} min`,
                  )}
                  onChange={setCustomMinutes}
                />
              </View>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                min (1–{MAX_CUSTOM_MINUTES})
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <AppButton label={skipLabel} onPress={onDismiss} variant="secondary" style={styles.actionFlex} />
            <AppButton
              label="Start break"
              onPress={handleStart}
              variant="primary"
              disabled={!canStart}
              style={styles.actionFlex}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

type WaterBreakOverlayProps = {
  totalSeconds: number
  onResume: () => void
  resumeLabel?: string
  activeHint?: string
  completeHint?: string
  skipEarlyLabel?: string
}

export function WaterBreakOverlay({
  totalSeconds,
  onResume,
  resumeLabel = "Continue to quiz",
  activeHint = "Take a breather — batch quiz questions are up next.",
  completeHint = "Ready for your batch quiz?",
  skipEarlyLabel = "Skip break and start quiz",
}: WaterBreakOverlayProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    setSecondsLeft(totalSeconds)
    setComplete(false)
  }, [totalSeconds])

  useEffect(() => {
    if (complete) return
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setComplete(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [complete, totalSeconds])

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 1
  const waterAccent = tokens.isDark ? "#5ec8c8" : "#0d9488"

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: native.groupedBackground,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 28,
        },
      ]}
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: native.separator,
            shadowColor: tokens.isDark ? "#000" : "#101828",
            shadowOpacity: tokens.isDark ? 0.4 : 0.12,
          },
        ]}
      >
        <DrinkingGlassLoader size={1.15} />
        <Text style={[type.navTitle, { color: native.label, marginTop: 18 }]}>Water break</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center", lineHeight: 20 }]}>
          {complete ? completeHint : activeHint}
        </Text>

        <View style={styles.timerBlock}>
          <Text
            style={[
              styles.timerText,
              { color: native.label },
            ]}
          >
            {formatCountdown(secondsLeft)}
          </Text>
          <View style={[styles.timerTrack, { backgroundColor: hexToRgba(waterAccent, tokens.isDark ? 0.2 : 0.14) }]}>
            <View
              style={[
                styles.timerFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: waterAccent,
                },
              ]}
            />
          </View>
          <Text style={[type.caption, { color: native.tertiaryLabel }]}>
            {complete ? "Break complete" : "Hydrate · stretch · reset"}
          </Text>
        </View>
      </View>

      <AppButton label={resumeLabel} onPress={onResume} variant="primary" style={styles.resumeBtn} />
      {!complete ? (
        <Pressable onPress={onResume} hitSlop={8} accessibilityRole="button">
          <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 12 }]}>
            {skipEarlyLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetHeader: { flexDirection: "row", gap: 14, alignItems: "center" },
  sheetGlass: { width: 48, alignItems: "center" },
  sheetCopy: { flex: 1, gap: 4 },
  presetRow: { flexDirection: "row", gap: 8 },
  presetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  customToggle: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: "center",
  },
  customRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  customInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionFlex: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 20,
  },
  heroCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 4,
  },
  timerBlock: { alignItems: "center", gap: 10, marginTop: 8, width: "100%" },
  timerTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  timerFill: { height: "100%", borderRadius: 999 },
  timerText: {
    fontSize: 44,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  resumeBtn: { marginTop: 22, minWidth: 220 },
})
