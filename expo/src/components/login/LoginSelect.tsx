import { useMemo, useState } from "react"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { FadeIn } from "react-native-reanimated"
import { LOGIN, loginType } from "./login-theme"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"

export type LoginSelectOption<T extends string = string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  sheetTitle: string
  sheetMessage?: string
  placeholder: string
  value: T | ""
  options: LoginSelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
  icon?: keyof typeof Ionicons.glyphMap
}

function parseOptionLabel(label: string): { title: string; subtitle?: string } {
  const dotParts = label.split(" · ")
  if (dotParts.length >= 2) {
    return {
      title: dotParts[0]?.trim() ?? label,
      subtitle: dotParts.slice(1).join(" · ").trim() || undefined,
    }
  }

  const parenMatch = label.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (parenMatch) {
    return { title: parenMatch[1].trim(), subtitle: parenMatch[2].trim() }
  }

  return { title: label }
}

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  android: { elevation: 8 },
})

const ROW_SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  android: { elevation: 1 },
})

export function LoginSelect<T extends string>({
  sheetTitle,
  sheetMessage,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  loading,
  searchable,
  searchPlaceholder = "Search",
  emptyLabel = "No matches",
  icon = "list-outline",
}: Props<T>) {
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState("")

  const selected = options.find((option) => option.value === value)
  const selectedCopy = selected ? parseOptionLabel(selected.label) : null
  const canOpen = !disabled && !loading

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return options
    return options.filter((option) => option.label.toLowerCase().includes(trimmed))
  }, [options, query])

  function openSheet() {
    setQuery("")
    setVisible(true)
  }

  function closeSheet() {
    setVisible(false)
    setQuery("")
  }

  function pick(optionValue: T) {
    onChange(optionValue)
    closeSheet()
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.triggerShell,
          !canOpen && styles.triggerDisabled,
          selected && styles.triggerShellSelected,
          pressed && canOpen && styles.triggerPressed,
        ]}
        disabled={!canOpen}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canOpen }}
      >
        <View style={[styles.triggerIconTile, selected && styles.triggerIconTileSelected]}>
          {loading ? (
            <ActivityIndicator color={LOGIN.purple} size="small" />
          ) : (
            <Ionicons name={icon} size={18} color={selected ? LOGIN.purple : LOGIN.purpleLight} />
          )}
        </View>

        <View style={styles.triggerCopy}>
          {selectedCopy ? (
            <>
              <Text style={styles.triggerTitle} numberOfLines={2}>
                {selectedCopy.title}
              </Text>
              {selectedCopy.subtitle ? (
                <Text style={styles.triggerSubtitle} numberOfLines={1}>
                  {selectedCopy.subtitle}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.triggerPlaceholder} numberOfLines={2}>
              {placeholder}
            </Text>
          )}
        </View>

        <View style={styles.triggerChevron}>
          <Ionicons name="chevron-down" size={15} color={LOGIN.purple} />
        </View>
      </Pressable>

      <GlassBottomSheetModal
        visible={visible}
        onClose={closeSheet}
        accessibilityLabel="Dismiss"
        maxHeight="84%"
        sheetHostStyle={{ paddingBottom: Math.max(insets.bottom, 14), paddingHorizontal: 12 }}
      >
        <View style={styles.sheetStack}>
          <View style={styles.grabberArea}>
            <View style={styles.handle} />
          </View>

          <Animated.View entering={FadeIn.duration(220)} style={[styles.headerCard, CARD_SHADOW]}>
            <Text style={styles.sheetTitle}>{sheetTitle}</Text>
            {sheetMessage ? <Text style={styles.sheetMessage}>{sheetMessage}</Text> : null}
          </Animated.View>

          {searchable ? (
            <Animated.View entering={FadeIn.delay(40).duration(220)} style={[styles.searchCard, CARD_SHADOW]}>
              <Ionicons name="search" size={17} color={LOGIN.secondaryLabel} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={LOGIN.secondaryLabel}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                showSoftInputOnFocus
              />
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeIn.delay(60).duration(240)} style={[styles.optionsCard, CARD_SHADOW]}>
            {filteredOptions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="search-outline" size={22} color={LOGIN.secondaryLabel} />
                <Text style={styles.emptyText}>{emptyLabel}</Text>
              </View>
            ) : (
              filteredOptions.map((option, index) => {
                const active = option.value === value
                const parsed = parseOptionLabel(option.label)
                const last = index === filteredOptions.length - 1
                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.optionRow,
                      active && styles.optionRowActive,
                      !last && styles.optionBorder,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => pick(option.value)}
                  >
                    {active ? <View style={styles.optionAccent} /> : null}
                    <View style={[styles.optionIconTile, active && styles.optionIconTileActive]}>
                      <Ionicons name={icon} size={17} color={active ? LOGIN.purple : LOGIN.purpleLight} />
                    </View>
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionTitle, active && styles.optionTitleActive]} numberOfLines={2}>
                        {parsed.title}
                      </Text>
                      {parsed.subtitle ? (
                        <Text style={styles.optionSubtitle} numberOfLines={1}>
                          {parsed.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.checkCircle, active && styles.checkCircleActive]}>
                      {active ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                    </View>
                  </Pressable>
                )
              })
            )}
          </Animated.View>

          <Animated.View entering={FadeIn.delay(80).duration(220)}>
            <Pressable
              style={({ pressed }) => [styles.cancelCard, CARD_SHADOW, pressed && styles.cancelPressed]}
              onPress={closeSheet}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      </GlassBottomSheetModal>
    </>
  )
}

const styles = StyleSheet.create({
  triggerShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: LOGIN.grouped,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(88, 44, 131, 0.12)",
    ...ROW_SHADOW,
  },
  triggerShellSelected: {
    borderColor: LOGIN.softBorder,
    backgroundColor: "#ffffff",
  },
  triggerPressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  triggerDisabled: { opacity: 0.55 },
  triggerIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LOGIN.soft,
  },
  triggerIconTileSelected: {
    backgroundColor: LOGIN.accentSoft,
  },
  triggerCopy: { flex: 1, gap: 2, minWidth: 0 },
  triggerTitle: {
    ...loginType.input,
    fontWeight: "600",
  },
  triggerSubtitle: {
    ...loginType.info,
    color: LOGIN.purpleLight,
    fontWeight: "500",
  },
  triggerPlaceholder: {
    ...loginType.input,
    color: LOGIN.secondaryLabel,
    fontWeight: "400",
  },
  triggerChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LOGIN.soft,
  },
  sheetStack: {
    gap: 10,
  },
  grabberArea: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  headerCard: {
    backgroundColor: LOGIN.grouped,
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
    gap: 4,
    alignItems: "center",
  },
  sheetTitle: {
    ...loginType.stepLabel,
    fontSize: 16,
    textAlign: "center",
  },
  sheetMessage: {
    ...loginType.info,
    textAlign: "center",
    lineHeight: 19,
  },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: LOGIN.grouped,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    ...loginType.input,
    paddingVertical: 10,
  },
  optionsCard: {
    backgroundColor: LOGIN.grouped,
    borderRadius: 16,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: LOGIN.grouped,
    position: "relative",
  },
  optionRowActive: {
    backgroundColor: LOGIN.soft,
  },
  optionRowPressed: {
    backgroundColor: LOGIN.accentSoft,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LOGIN.separator,
  },
  optionAccent: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 999,
    backgroundColor: LOGIN.purple,
  },
  optionIconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LOGIN.soft,
    marginLeft: 4,
  },
  optionIconTileActive: {
    backgroundColor: LOGIN.accentSoft,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    ...loginType.input,
    fontWeight: "500",
  },
  optionTitleActive: {
    color: LOGIN.purpleDark,
    fontWeight: "600",
  },
  optionSubtitle: {
    ...loginType.info,
    fontWeight: "500",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: LOGIN.separator,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LOGIN.grouped,
  },
  checkCircleActive: {
    borderColor: LOGIN.purple,
    backgroundColor: LOGIN.purple,
  },
  emptyRow: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  emptyText: {
    ...loginType.info,
    textAlign: "center",
  },
  cancelCard: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: LOGIN.grouped,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelPressed: {
    opacity: 0.86,
  },
  cancelText: {
    ...loginType.button,
    color: LOGIN.purple,
  },
})
