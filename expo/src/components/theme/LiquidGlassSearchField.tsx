import { useState, type ReactNode } from "react"
import { Keyboard, Platform, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { FabPressableScale, PressableScale } from "../motion/PressableScale"
import { motion, useAppReducedMotion } from "../../lib/motion"

const ICON_SLOT = 22

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  accessibilityLabel: string
  active?: boolean
  accentColor?: string
}

/** Icon control on the glass rail — transparent; active state uses a soft tint only. */
export function LiquidGlassSearchIconButton({
  icon,
  onPress,
  accessibilityLabel,
  active = false,
  accentColor,
}: IconButtonProps) {
  const tokens = useAppThemeTokens()
  const accent = accentColor ?? tokens.accent
  const iconColor = active
    ? accent
    : tokens.isDark
      ? "rgba(235, 235, 245, 0.88)"
      : "rgba(60, 60, 67, 0.72)"

  const Scale = icon === "add" ? FabPressableScale : PressableScale

  return (
    <Scale
      style={[
        styles.iconBtn,
        active && {
          backgroundColor: tokens.isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
    </Scale>
  )
}

export type LiquidGlassSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  style?: StyleProp<ViewStyle>
  /** Trailing controls rendered after a hairline divider (filter, add, etc.). */
  trailing?: ReactNode
  /** Custom content instead of search icon + input (filter-only rows). */
  filterOnly?: ReactNode
  /** Overrides appearance accent for caret / active controls. */
  accentColor?: string
}

/**
 * Search row rendered directly on the glass dock — no opaque inner capsule.
 * Matches Messages / Safari: icon, input, and actions sit on the glass material.
 */
export function LiquidGlassSearchField({
  value,
  onChange,
  placeholder,
  style,
  trailing,
  filterOnly,
  accentColor,
}: LiquidGlassSearchFieldProps) {
  const tokens = useAppThemeTokens()
  const reduceMotion = useAppReducedMotion()
  const [focused, setFocused] = useState(false)
  const accent = accentColor ?? tokens.accent
  const idleIcon = tokens.isDark ? "rgba(235, 235, 245, 0.62)" : "rgba(60, 60, 67, 0.55)"
  const textColor = tokens.isDark ? "#FFFFFF" : tokens.text
  const placeholderColor = tokens.isDark ? "rgba(235, 235, 245, 0.42)" : "rgba(60, 60, 67, 0.42)"
  const dividerColor = tokens.isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.12)"

  return (
    <View style={[styles.row, style]}>
      {filterOnly ? (
        <View style={styles.field}>{filterOnly}</View>
      ) : (
        <View style={styles.field}>
          <View style={styles.iconSlot}>
            <Ionicons name="search" size={17} color={focused ? accent : idleIcon} />
          </View>
          <TextInput
            style={[styles.input, { color: textColor }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            accessibilityLabel={placeholder}
            accessibilityRole="search"
            testID="module-search"
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="ascii-capable"
            selectionColor={accent}
            returnKeyType="search"
            clearButtonMode="never"
            underlineColorAndroid="transparent"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {value.length > 0 ? (
            <Animated.View
              style={styles.clearSlot}
              entering={reduceMotion ? undefined : FadeIn.duration(motion.fast)}
              exiting={reduceMotion ? undefined : FadeOut.duration(motion.fast)}
            >
              <LiquidGlassSearchIconButton
                icon="close-circle"
                onPress={() => {
                  onChange("")
                  Keyboard.dismiss()
                }}
                accessibilityLabel="Clear search"
              />
            </Animated.View>
          ) : null}
        </View>
      )}

      {trailing ? (
        <View style={styles.trailingGroup}>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <View style={styles.trailing}>{trailing}</View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 36,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
    minWidth: 0,
  },
  iconSlot: {
    width: ICON_SLOT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    padding: 0,
    margin: 0,
    letterSpacing: -0.3,
    ...Platform.select({
      ios: { paddingVertical: 0 },
      android: { paddingVertical: 0, includeFontPadding: false },
      default: {},
    }),
  },
  trailingGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    marginLeft: 8,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginRight: 4,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  clearSlot: {
    flexShrink: 0,
    zIndex: 2,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
})
