import { useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { CoraScopeFeedbackState } from "../../lib/cora/scope/types"

type Props = {
  feedback: CoraScopeFeedbackState
  /** Soft wording — studies for students, teaching for faculty. */
  promptLabel?: string
  submitting?: boolean
  onRelated: (note: string | null) => void
  onNotRelated: () => void
}

/**
 * Subtle Yes/No under a scope-redirect bubble.
 * Do not show scores, classification labels, or alarm-red deny chrome.
 */
export function CoraScopeFeedbackBar({
  feedback,
  promptLabel = "Was this actually related to your studies?",
  submitting = false,
  onRelated,
  onNotRelated,
}: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [noteMode, setNoteMode] = useState(false)
  const [note, setNote] = useState("")

  if (noteMode) {
    return (
      <View style={[styles.wrap, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
        <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 18 }]}>
          Optional: briefly how this relates to your academic work
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. senior design presentation poster"
          placeholderTextColor={native.tertiaryLabel}
          style={[
            styles.input,
            type.body,
            { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground },
          ]}
          editable={!submitting}
          autoFocus
          maxLength={200}
        />
        <View style={styles.row}>
          <Pressable
            disabled={submitting}
            onPress={() => {
              setNoteMode(false)
              setNote("")
            }}
            style={({ pressed }) => [styles.btnGhost, { opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
          >
            <Text style={[type.caption, { color: SN.secondaryLabel, fontWeight: "600" }]}>Back</Text>
          </Pressable>
          <Pressable
            disabled={submitting}
            onPress={() => onRelated(note.trim() || null)}
            style={({ pressed }) => [
              styles.btnPrimary,
              {
                backgroundColor: hexToRgba(SN.accent, 0.14),
                borderColor: hexToRgba(SN.accent, 0.28),
                opacity: pressed || submitting ? NATIVE.pressedOpacity : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={SN.accent} />
            ) : (
              <Text style={[type.caption, { color: SN.accent, fontWeight: "700" }]}>Continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
      <Text style={[type.caption, styles.prompt, { color: SN.secondaryLabel }]}>{promptLabel}</Text>
      <View style={styles.row}>
        <Pressable
          disabled={submitting}
          onPress={() => setNoteMode(true)}
          style={({ pressed }) => [
            styles.btnPrimary,
            {
              backgroundColor: hexToRgba(SN.accent, 0.12),
              borderColor: hexToRgba(SN.accent, 0.25),
              opacity: pressed || submitting ? NATIVE.pressedOpacity : 1,
            },
          ]}
          accessibilityLabel={`Yes — ${feedback.originalMessage.slice(0, 40)}`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={SN.accent} />
          ) : (
            <Text style={[type.caption, { color: SN.accent, fontWeight: "700" }]}>Yes</Text>
          )}
        </Pressable>
        <Pressable
          disabled={submitting}
          onPress={onNotRelated}
          style={({ pressed }) => [styles.btnGhost, { opacity: pressed || submitting ? NATIVE.pressedOpacity : 1 }]}
        >
          <Text style={[type.caption, { color: SN.secondaryLabel, fontWeight: "600" }]}>No</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  prompt: { lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 64,
    alignItems: "center",
  },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
})
