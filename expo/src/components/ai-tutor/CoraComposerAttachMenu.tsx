import { useEffect, useMemo, useState, type ReactNode } from "react"
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import {
  CORA_COMPOSER_INPUT_ACTIONS,
  CORA_COMPOSER_LEARNING_ACTIONS,
  CORA_COMPOSER_MORE_ACTIONS,
  findComposerAction,
  type CoraComposerActionId,
  type CoraComposerMenuItem,
} from "../../lib/cora-composer-actions"

type Props = {
  visible: boolean
  onClose: () => void
  onAction: (actionId: CoraComposerActionId) => void
}

type MenuEntry =
  | { kind: "action"; key: string; item: CoraComposerMenuItem }
  | { kind: "divider"; key: string }
  | { kind: "more-toggle"; key: string }

function MenuRow({
  label,
  icon,
  onPress,
  trailing,
  testID,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  trailing?: ReactNode
  testID?: string
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessible
      importantForAccessibility="yes"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? NATIVE.pressedOpacity : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={SN.secondaryLabel} />
      <Text style={[type.body, styles.rowLabel, { color: native.label }]} importantForAccessibility="no">
        {label}
      </Text>
      {trailing}
    </Pressable>
  )
}

export function CoraComposerAttachMenu({ visible, onClose, onAction }: Props) {
  const { height: windowHeight } = useWindowDimensions()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [moreOpen, setMoreOpen] = useState(true)

  useEffect(() => {
    if (visible) setMoreOpen(true)
  }, [visible])

  const handleAction = (actionId: CoraComposerActionId) => {
    onClose()
    setMoreOpen(true)
    onAction(actionId)
  }

  const menuEntries = useMemo(() => {
    const entries: MenuEntry[] = []
    for (const item of CORA_COMPOSER_INPUT_ACTIONS) {
      entries.push({ kind: "action", key: item.id, item })
    }
    entries.push({ kind: "divider", key: "divider-input" })
    for (const item of CORA_COMPOSER_LEARNING_ACTIONS) {
      entries.push({ kind: "action", key: item.id, item })
    }
    entries.push({ kind: "divider", key: "divider-learning" })
    entries.push({ kind: "more-toggle", key: "more-toggle" })
    if (moreOpen) {
      for (const item of CORA_COMPOSER_MORE_ACTIONS) {
        entries.push({ kind: "action", key: item.id, item })
      }
    }
    return entries
  }, [moreOpen])

  const shellBg = tokens.isDark ? native.secondaryGrouped : "#ffffff"
  const menuMaxHeight = Math.min(windowHeight * 0.72, 560)

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.backdrop}
        onPress={onClose}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no-hide-descendants"
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
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuContent}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
            renderItem={({ item: entry }) => {
              if (entry.kind === "divider") {
                return <View style={[styles.divider, { backgroundColor: native.separator }]} />
              }

              if (entry.kind === "more-toggle") {
                return (
                  <Pressable
                    onPress={() => setMoreOpen((open) => !open)}
                    testID="cora-composer-action-more-tools"
                    accessible
                    importantForAccessibility="yes"
                    style={({ pressed }) => [styles.row, { opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: moreOpen }}
                    accessibilityLabel="More tools"
                  >
                    <Ionicons
                      name={moreOpen ? "chevron-down" : "chevron-forward"}
                      size={18}
                      color={SN.secondaryLabel}
                    />
                    <Text
                      style={[type.body, styles.rowLabel, { color: native.label }]}
                      importantForAccessibility="no"
                    >
                      More tools
                    </Text>
                  </Pressable>
                )
              }

              return (
                <MenuRow
                  label={entry.item.label}
                  icon={entry.item.icon}
                  testID={`cora-composer-action-${entry.item.id}`}
                  onPress={() => handleAction(entry.item.id)}
                />
              )
            }}
          />
        </Pressable>

        <Pressable
          onPress={onClose}
          testID="cora-composer-menu-close"
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

export function applyComposerActionPrompt(actionId: CoraComposerActionId): string | null {
  return findComposerAction(actionId)?.prompt ?? null
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
    paddingBottom: 8,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
})
