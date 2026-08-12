import { useEffect, useState } from "react"
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  visible: boolean
  onClose: () => void
  onInsert: (code: string) => void
}

export function CoraPasteCodeSheet({ visible, onClose, onInsert }: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [code, setCode] = useState("")

  useEffect(() => {
    if (visible) setCode("")
  }, [visible])

  const handleInsert = () => {
    const trimmed = code.trim()
    if (!trimmed) return
    onInsert(`Please help me with this code:\n\n\`\`\`\n${trimmed}\n\`\`\``)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: native.secondaryGrouped }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: native.separator }]} />
          <View style={styles.header}>
            <Text style={[type.bodyEmphasis, styles.title]}>Paste code</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={SN.secondaryLabel} />
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground }]}
            value={code}
            onChangeText={setCode}
            placeholder="Paste your code here…"
            placeholderTextColor={SN.secondaryLabel}
            multiline
            autoFocus
            textAlignVertical="top"
          />
          <Pressable
            onPress={handleInsert}
            disabled={!code.trim()}
            style={({ pressed }) => [
              styles.insertBtn,
              {
                backgroundColor: code.trim() ? SN.accent : native.fill,
                opacity: pressed && code.trim() ? NATIVE.pressedOpacity : 1,
              },
            ]}
          >
            <Text style={[type.bodyEmphasis, styles.insertText, { color: code.trim() ? "#ffffff" : SN.secondaryLabel }]}>
              Insert into chat
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 17 },
  input: {
    minHeight: 160,
    maxHeight: 280,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  insertBtn: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  insertText: { fontSize: 16 },
})
