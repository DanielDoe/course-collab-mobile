import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { CORA_MESSAGE_MENU_ITEMS, type CoraMessageMenuActionId } from "../../lib/cora-message-actions"
import type { ChatMessage } from "../../lib/ai-tutor-api"

type Props = {
  visible: boolean
  message: ChatMessage | null
  isLastAssistant: boolean
  onClose: () => void
  onAction: (actionId: CoraMessageMenuActionId, message: ChatMessage) => void
}

export function CoraMessageOptionsSheet({ visible, message, isLastAssistant, onClose, onAction }: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  if (!message) return null

  const items = CORA_MESSAGE_MENU_ITEMS.filter((item) => {
    if (item.assistantOnly && message.role !== "assistant") return false
    if (item.lastResponseOnly && !isLastAssistant) return false
    return true
  })

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.menu, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
          onPress={() => {}}
        >
          <Text style={[type.caption, styles.menuHint, { color: SN.secondaryLabel }]} numberOfLines={2}>
            {message.role === "assistant" ? "Cora response" : "Your message"}
          </Text>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => {
                onClose()
                onAction(item.id, message)
              }}
              style={({ pressed }) => [
                styles.row,
                index < items.length - 1 && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
                pressed && { opacity: NATIVE.pressedOpacity },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={item.destructive ? "#dc2626" : SN.secondaryLabel}
              />
              <Text
                style={[
                  type.body,
                  styles.rowLabel,
                  { color: item.destructive ? "#dc2626" : native.label },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  menu: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuHint: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
})
