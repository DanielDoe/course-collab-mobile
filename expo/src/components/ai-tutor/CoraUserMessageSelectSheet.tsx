import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { BlurView } from "expo-blur"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import { getUserPromptBubbleColors } from "./cora-chat-bubble-theme"

type Props = {
  visible: boolean
  content: string
  onClose: () => void
}

export function CoraUserMessageSelectSheet({ visible, content, onClose }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const colors = getUserPromptBubbleColors(tokens.isDark, native)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <BlurView
          intensity={tokens.isDark ? 40 : 28}
          tint={tokens.isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <View style={styles.header}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Select text</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={native.secondaryLabel} />
            </Pressable>
          </View>
          <View
            style={[
              styles.textBox,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text selectable style={[type.body, styles.selectable, { color: colors.text }]}>
              {content}
            </Text>
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
            Long-press to highlight and copy
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: hexToRgba("#000000", 0.2),
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxHeight: 280,
  },
  selectable: {
    fontSize: 16,
    lineHeight: 24,
  },
})
