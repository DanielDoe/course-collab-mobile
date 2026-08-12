import { useEffect, useState } from "react"
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppButton } from "../theme/AppButton"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

const PRESET_MINUTES = [2, 5, 10] as const
const MAX_CUSTOM_MINUTES = 30

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

type WaterBreakDurationDialogProps = {
  visible: boolean
  onDismiss: () => void
  onStart: (minutes: number) => void
}

export function WaterBreakDurationDialog({ visible, onDismiss, onStart }: WaterBreakDurationDialogProps) {
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
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.iconBox, { backgroundColor: tokens.accentSoft }]}>
              <Ionicons name="water-outline" size={22} color={tokens.accent} />
            </View>
            <View style={styles.sheetCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>Water break</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                Step away and hydrate before your batch quiz.
              </Text>
            </View>
          </View>

          <View style={styles.presetRow}>
            {PRESET_MINUTES.map((mins) => (
              <Pressable
                key={mins}
                onPress={() => setSelectedPreset(mins)}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: selectedPreset === mins ? tokens.accent : native.tertiaryGrouped,
                    borderColor: selectedPreset === mins ? tokens.accent : native.separator,
                  },
                ]}
              >
                <Text
                  style={[
                    type.bodyEmphasis,
                    { color: selectedPreset === mins ? "#fff" : native.label },
                  ]}
                >
                  {mins} min
                </Text>
              </Pressable>
            ))}
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
              <TextInput
                value={customMinutes}
                onChangeText={setCustomMinutes}
                keyboardType="number-pad"
                placeholder="Minutes"
                placeholderTextColor={native.tertiaryLabel}
                style={[
                  styles.customInput,
                  type.body,
                  { color: native.label, borderColor: native.separator },
                ]}
              />
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                min (1–{MAX_CUSTOM_MINUTES})
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <AppButton label="Skip break" onPress={onDismiss} variant="secondary" style={styles.actionFlex} />
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
}

export function WaterBreakOverlay({
  totalSeconds,
  onResume,
  resumeLabel = "Continue to quiz",
  activeHint = "Take a breather — batch quiz questions are up next.",
  completeHint = "Ready for your batch quiz?",
}: WaterBreakOverlayProps) {
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

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Ionicons name="water" size={56} color="#7dd3fc" />
      <Text style={[type.bodyEmphasis, styles.overlayTitle]}>Water break</Text>
      <Text style={[type.caption, styles.overlayHint]}>{complete ? completeHint : activeHint}</Text>
      <View style={styles.timerRing}>
        <View style={[styles.timerTrack, { opacity: 0.25 }]}>
          <View
            style={[
              styles.timerFill,
              {
                width: `${Math.round(progress * 100)}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.timerText}>{formatCountdown(secondsLeft)}</Text>
      </View>
      <AppButton label={resumeLabel} onPress={onResume} variant="primary" />
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
  },
  sheetHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconBox: { borderRadius: 12, padding: 10 },
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
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
    zIndex: 20,
  },
  overlayTitle: { color: "#fff", fontSize: 24 },
  overlayHint: { color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 20 },
  timerRing: { alignItems: "center", gap: 8, marginVertical: 16, width: "100%" },
  timerTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#334155",
    overflow: "hidden",
  },
  timerFill: { height: "100%", backgroundColor: "#38bdf8", borderRadius: 999 },
  timerText: { color: "#fff", fontSize: 40, fontWeight: "700", fontVariant: ["tabular-nums"] },
})
