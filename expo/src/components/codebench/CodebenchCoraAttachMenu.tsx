import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"

export type CodebenchCoraAttachAction = "photos" | "camera" | "file" | "import-course"

const ITEMS: Array<{
  id: CodebenchCoraAttachAction
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "photos", label: "Add photos", icon: "image-outline" },
  { id: "camera", label: "Take photo", icon: "camera-outline" },
  { id: "file", label: "Upload file", icon: "attach-outline" },
  { id: "import-course", label: "Import from course", icon: "book-outline" },
]

type Props = {
  visible: boolean
  onClose: () => void
  onAction: (action: CodebenchCoraAttachAction) => void
}

export function CodebenchCoraAttachMenu({ visible, onClose, onAction }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const shellBg = tokens.isDark ? native.secondaryGrouped : "#FFFFFF"

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.menu,
            {
              backgroundColor: shellBg,
              borderColor: tokens.isDark ? native.separator : hexToRgba("#000000", 0.08),
              shadowColor: native.label,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          {ITEMS.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => {
                onClose()
                onAction(item.id)
              }}
              style={({ pressed }) => [
                styles.row,
                index < ITEMS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: native.separator,
                },
                pressed && { backgroundColor: native.fill, opacity: NATIVE.pressedOpacity },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon} size={18} color={SN.secondaryLabel} />
              <Text style={[type.body, styles.rowLabel, { color: native.label }]}>{item.label}</Text>
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
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 112,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  menu: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
})
