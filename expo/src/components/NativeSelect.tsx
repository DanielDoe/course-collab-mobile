import { useMemo, useState } from "react"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../context/AppearanceProvider"
import { NATIVE } from "../constants/faculty-native-theme"
import { useNativeType } from "../lib/themed-module-theme"
import { solidListThumb } from "../lib/solid-list-thumb"
import { SolidListThumbTile } from "./theme/SolidListThumbTile"

export type SelectOption<T extends string = string> = {
  value: T
  label: string
  /** Secondary line in the picker sheet (e.g. question count). */
  detail?: string
  icon?: keyof typeof Ionicons.glyphMap
}

type Props<T extends string> = {
  /** Optional caption above the trigger — omit when placeholder is enough. */
  label?: string
  placeholder: string
  value: T | ""
  options: SelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  loading?: boolean
  variant?: "default" | "grouped"
  /** Sheet heading; defaults to `label` when set. */
  sheetTitle?: string
}

export function NativeSelect<T extends string>({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  loading,
  variant = "default",
  sheetTitle,
}: Props<T>) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const selected = options.find((o) => o.value === value)
  const canOpen = !disabled && !loading
  const grouped = variant === "grouped"
  const resolvedSheetTitle = sheetTitle ?? label
  const sheetBackground = tokens.chrome.sheetBg ?? native.groupedBackground

  const styles = useMemo(
    () =>
      StyleSheet.create({
        field: { gap: 6 },
        fieldGrouped: { gap: 4 },
        label: { fontSize: 14, fontWeight: "600", color: tokens.textSecondary },
        labelGrouped: { fontSize: 13, color: native.secondaryLabel },
        trigger: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: NATIVE.sectionRadius,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: native.secondaryGrouped,
        },
        triggerGrouped: {
          minHeight: 40,
          paddingHorizontal: 0,
          borderWidth: 0,
          borderRadius: 0,
          backgroundColor: "transparent",
        },
        triggerDisabled: { opacity: 0.6 },
        triggerText: { flex: 1, fontSize: 16, color: native.label },
        placeholder: { color: native.secondaryLabel },
        backdrop: {
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0, 0, 0, 0.35)",
        },
        sheet: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 20),
          maxHeight: "78%",
        },
        handle: {
          alignSelf: "center",
          width: 36,
          height: 4,
          borderRadius: 2,
          marginTop: 10,
          marginBottom: 8,
          backgroundColor: native.separator,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        },
        headerBtn: {
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        sheetTitle: {
          flex: 1,
          textAlign: "center",
          ...type.bodyEmphasis,
          fontSize: 17,
          color: native.label,
        },
        list: {
          paddingBottom: 8,
        },
        listGap: {
          height: 10,
        },
        card: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: 12,
          paddingVertical: 12,
          minHeight: 88,
        },
        cardCopy: {
          flex: 1,
          minWidth: 0,
          gap: 2,
          paddingVertical: 1,
        },
        cardTitle: {
          lineHeight: 20,
        },
        statusRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          minHeight: 16,
          marginTop: 4,
        },
        statusDot: {
          marginHorizontal: 2,
        },
        statusText: {
          fontWeight: "600",
        },
        chevron: {
          flexShrink: 0,
          marginTop: 2,
        },
      }),
    [tokens, native, type, insets.bottom],
  )

  function closeSheet() {
    setVisible(false)
  }

  return (
    <View style={[styles.field, grouped && styles.fieldGrouped]}>
      {label ? <Text style={[styles.label, grouped && styles.labelGrouped]}>{label}</Text> : null}
      <Pressable
        style={[
          styles.trigger,
          grouped && styles.triggerGrouped,
          !canOpen && styles.triggerDisabled,
        ]}
        disabled={!canOpen}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={
          selected
            ? `${label ?? placeholder}, ${selected.label}`
            : (label ?? placeholder)
        }
      >
        <Text
          style={[styles.triggerText, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {loading ? "Loading…" : selected?.label ?? placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={grouped ? native.secondaryLabel : native.tertiaryLabel}
        />
      </Pressable>

      {visible ? (
      <Modal
        visible
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.backdrop} onPress={closeSheet} accessible={false}>
          <Pressable
            style={[styles.sheet, { backgroundColor: sheetBackground }]}
            onPress={() => {}}
            accessible={false}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <Pressable
                onPress={closeSheet}
                hitSlop={8}
                style={styles.headerBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={tokens.accent} />
              </Pressable>
              {resolvedSheetTitle ? (
                <Text style={styles.sheetTitle} numberOfLines={1} accessibilityRole="header">
                  {resolvedSheetTitle}
                </Text>
              ) : (
                <View style={styles.sheetTitle} />
              )}
              <View style={styles.headerBtn} />
            </View>

            <FlatList
              data={options}
              keyExtractor={(option, index) => `${option.value}::${index}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.listGap} />}
              initialNumToRender={16}
              renderItem={({ item: option, index }) => {
                const active = option.value === value
                const thumb = solidListThumb(index)
                const icon = option.icon ?? "book-outline"

                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      tokens.cardShadow,
                      {
                        backgroundColor: native.secondaryGrouped,
                        borderColor: active ? tokens.accent : tokens.border,
                        opacity: pressed ? NATIVE.pressedOpacity : 1,
                      },
                    ]}
                    onPress={() => {
                      onChange(option.value)
                      closeSheet()
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={
                      option.detail ? `${option.label}, ${option.detail}` : option.label
                    }
                  >
                    <SolidListThumbTile thumb={thumb} icon={icon} size="compact" />

                    <View style={styles.cardCopy}>
                      <Text
                        style={[type.bodyEmphasis, styles.cardTitle, { color: native.label }]}
                        numberOfLines={2}
                      >
                        {option.label}
                      </Text>
                      {option.detail ? (
                        <View style={styles.statusRow}>
                          <Ionicons
                            name="ellipse"
                            size={8}
                            color={thumb.label}
                            style={styles.statusDot}
                          />
                          <Text
                            style={[type.footnote, styles.statusText, { color: thumb.label }]}
                            numberOfLines={1}
                          >
                            {option.detail}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color={tokens.accent} />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={native.tertiaryLabel}
                        style={styles.chevron}
                      />
                    )}
                  </Pressable>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
    </View>
  )
}
