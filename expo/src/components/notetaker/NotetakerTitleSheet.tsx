import { useEffect, useState } from "react"
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  visible: boolean
  initialTitle: string
  subtitle?: string
  saving?: boolean
  onCancel: () => void
  onSave: (title: string) => void
}

export function NotetakerTitleSheet({
  visible,
  initialTitle,
  subtitle = "We'll transcribe the audio and generate structured notes.",
  saving,
  onCancel,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const [title, setTitle] = useState(initialTitle)

  useEffect(() => {
    if (visible) setTitle(initialTitle)
  }, [visible, initialTitle])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={saving ? undefined : onCancel}>
        <Pressable
          style={[
            styles.sheet,
            tokens.cardShadow,
            { backgroundColor: native.secondaryGrouped, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[type.bodyEmphasis, styles.heading]}>Name this note</Text>
          <Text style={[type.caption, styles.subtitle]}>{subtitle}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            placeholderTextColor={native.tertiaryLabel}
            style={[
              styles.input,
              type.body,
              { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground },
            ]}
            autoFocus
            editable={!saving}
            returnKeyType="done"
            onSubmitEditing={() => title.trim() && onSave(title.trim())}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={saving}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: NATIVE.pressedOpacity }]}
            >
              <Text style={[type.body, { color: native.secondaryLabel }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => title.trim() && onSave(title.trim())}
              disabled={saving || !title.trim()}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: tokens.accent, opacity: saving || !title.trim() ? 0.6 : pressed ? 0.9 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color="#ffffff" />
                  <Text style={styles.primaryText}>Transcribe & summarize</Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 10,
  },
  heading: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
})
