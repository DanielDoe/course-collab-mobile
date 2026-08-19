import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import type { CoraMemoryFact } from "../../lib/cora-memory-facts"

export function CoraMemoryManageSheet({
  visible,
  facts,
  clearedCount,
  onClose,
  onRemoveFact,
  onRestoreAll,
}: {
  visible: boolean
  facts: CoraMemoryFact[]
  clearedCount: number
  onClose: () => void
  onRemoveFact: (factId: string) => void
  onRestoreAll?: () => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <View style={[styles.header, { borderBottomColor: native.separator }]}>
          <Text style={[type.sheetTitle, { color: native.label }]}>Cora remembers</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={[type.bodyEmphasis, { color: SN.accent }]}>Done</Text>
          </Pressable>
        </View>
        <Text style={[type.caption, styles.subtitle, { color: SN.secondaryLabel }]}>
          Remove anything you do not want used for personalization on this device.
        </Text>
        <ScrollView contentContainerStyle={styles.list}>
          {facts.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
              <Text style={[type.body, { color: SN.secondaryLabel, textAlign: "center" }]}>
                No active memories yet. Keep learning with Cora.
              </Text>
            </View>
          ) : (
            facts.map((fact) => (
              <View
                key={fact.id}
                style={[styles.row, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
              >
                <Text style={[type.body, styles.rowLabel, { color: native.label }]}>{fact.label}</Text>
                <Pressable onPress={() => onRemoveFact(fact.id)} accessibilityRole="button">
                  <Text style={[type.caption, { color: SN.accent, fontWeight: "600" }]}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
        {clearedCount > 0 && onRestoreAll ? (
          <Pressable
            style={[styles.restore, { borderColor: native.separator }]}
            onPress={onRestoreAll}
            accessibilityRole="button"
          >
            <Text style={[type.bodyEmphasis, { color: SN.accent, textAlign: "center" }]}>Restore removed memories</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtitle: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, lineHeight: 20 },
  list: { padding: 16, gap: 8 },
  empty: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabel: { flex: 1 },
  restore: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
