import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { hexToRgba } from "../../../constants/app-themes"
import {
  FACULTY_CORA_ATTACHMENT_ACTIONS,
  type FacultyCoraAttachmentActionId,
} from "../../../lib/faculty-cora-composer-actions"
import { getCoraIntentsForRole, type CoraIntentId } from "../../../lib/cora-intents"
import type { IoniconName } from "../../icons/ion-to-lucide-map"

type Props = {
  visible: boolean
  onClose: () => void
  onAttachment: (actionId: FacultyCoraAttachmentActionId) => void
  onIntent: (intentId: CoraIntentId) => void
}

type MenuEntry =
  | { kind: "section"; key: string; label: string }
  | { kind: "attachment"; key: string; actionId: FacultyCoraAttachmentActionId; label: string; icon: IoniconName }
  | { kind: "intent"; key: string; intentId: CoraIntentId; label: string; icon: IoniconName }

function MenuRow({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string
  icon: IoniconName
  onPress: () => void
  testID?: string
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessible
      importantForAccessibility="yes"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, { opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
    >
      <Ionicons name={icon} size={18} color={native.secondaryLabel} strokeWidth={1.75} />
      <Text style={[type.body, styles.rowLabel, { color: native.label }]} importantForAccessibility="no">
        {label}
      </Text>
    </Pressable>
  )
}

function SectionHeader({ label }: { label: string }) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <Text style={[type.caption, styles.sectionHeader, { color: native.secondaryLabel }]} accessibilityRole="header">
      {label}
    </Text>
  )
}

export function FacultyCoraComposerAttachMenu({ visible, onClose, onAttachment, onIntent }: Props) {
  const { height: windowHeight } = useWindowDimensions()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const shellBg = tokens.isDark ? native.secondaryGrouped : "#ffffff"
  const menuMaxHeight = Math.min(windowHeight * 0.72, 560)

  const menuEntries: MenuEntry[] = [
    { kind: "section", key: "section-attachments", label: "Attachments" },
    ...FACULTY_CORA_ATTACHMENT_ACTIONS.map(
      (item): MenuEntry => ({
        kind: "attachment",
        key: item.id,
        actionId: item.id,
        label: item.label,
        icon: item.icon,
      }),
    ),
    { kind: "section", key: "section-quick-actions", label: "Quick Actions" },
    ...getCoraIntentsForRole("faculty").map(
      (intent): MenuEntry => ({
        kind: "intent",
        key: intent.id,
        intentId: intent.id,
        label: intent.label,
        icon: intent.icon,
      }),
    ),
  ]

  const handleAttachment = (actionId: FacultyCoraAttachmentActionId) => {
    onClose()
    onAttachment(actionId)
  }

  const handleIntent = (intentId: CoraIntentId) => {
    onClose()
    onIntent(intentId)
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable accessible={false} style={styles.backdrop} onPress={onClose}>
        <Pressable
          accessible={false}
          style={[
            styles.menu,
            {
              backgroundColor: shellBg,
              borderColor: tokens.isDark ? native.separator : hexToRgba("#000000", 0.08),
              shadowColor: native.label,
              maxHeight: menuMaxHeight,
            },
          ]}
          onPress={() => {}}
        >
          <FlatList
            data={menuEntries}
            keyExtractor={(entry) => entry.key}
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: entry }) => {
              if (entry.kind === "section") {
                return <SectionHeader label={entry.label} />
              }

              if (entry.kind === "attachment") {
                return (
                  <MenuRow
                    label={entry.label}
                    icon={entry.icon}
                    testID={`faculty-cora-attachment-${entry.actionId}`}
                    onPress={() => handleAttachment(entry.actionId)}
                  />
                )
              }

              return (
                <MenuRow
                  label={entry.label}
                  icon={entry.icon}
                  testID={`faculty-cora-intent-${entry.intentId}`}
                  onPress={() => handleIntent(entry.intentId)}
                />
              )
            }}
          />
        </Pressable>

        <Pressable
          onPress={onClose}
          testID="faculty-cora-composer-menu-close"
          style={({ pressed }) => [
            styles.closeBtn,
            {
              backgroundColor: shellBg,
              borderColor: tokens.isDark ? native.separator : hexToRgba("#000000", 0.08),
              opacity: pressed ? NATIVE.pressedOpacity : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        >
          <Ionicons name="close" size={22} color={native.label} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 120,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  menu: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  closeBtn: {
    alignSelf: "center",
    marginTop: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
})
