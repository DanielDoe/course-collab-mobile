import type { ReactNode } from "react"
import { useMemo, useRef, useState, useEffect } from "react"
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { PressableScale } from "../motion/PressableScale"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { APP_BUTTON_RADIUS } from "../../constants/app-button"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useReliableTextInputFocus } from "../../hooks/useReliableTextInputFocus"
import { motion, timing, triggerMotionHaptic } from "../../lib/motion"
import { useLoginTheme } from "./login-theme"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Props = {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: "primary" | "gold"
  /** Overrides primary/gold fill — used for university brand CTAs. */
  backgroundColor?: string
  icon?: keyof typeof Ionicons.glyphMap
}

function resolveLeadingIcon(
  label: string,
  secureTextEntry?: boolean,
): keyof typeof Ionicons.glyphMap | null {
  if (secureTextEntry) return "lock-closed-outline"
  const key = label.trim().toLowerCase()
  if (key.includes("email")) return "mail-outline"
  if (key.includes("username") || key.includes("user")) return "person-outline"
  return null
}

function useLoginFieldStyles() {
  const { LOGIN, loginType } = useLoginTheme()
  const tokens = useAppThemeTokens()
  return useMemo(
    () =>
      StyleSheet.create({
        field: { gap: 7 },
        label: {
          ...loginType.fieldLabel,
          marginLeft: 2,
          letterSpacing: 0.15,
        },
        shell: {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 52,
          paddingHorizontal: 12,
          gap: 10,
        },
        leadingIcon: {
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
        },
        input: {
          flex: 1,
          paddingVertical: Platform.OS === "ios" ? 14 : 12,
          fontSize: 16,
          lineHeight: 21,
          fontWeight: "500",
        },
        trailing: {
          marginLeft: 2,
        },
        trailingBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
        },
        inputDisabled: { opacity: 0.58 },
      }),
    [LOGIN, loginType, tokens],
  )
}

export function LoginButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  backgroundColor,
  icon,
}: Props) {
  const { LOGIN, loginType } = useLoginTheme()
  const isGold = variant === "gold" && !backgroundColor
  const fill = backgroundColor ?? (isGold ? LOGIN.gold : LOGIN.cta)
  const labelColor = isGold ? LOGIN.goldInk : LOGIN.ctaInk
  return (
    <PressableScale
      style={[
        styles.button,
        {
          minHeight: LOGIN.rowMinHeight,
          borderRadius: APP_BUTTON_RADIUS,
          backgroundColor: fill,
        },
        (disabled || loading) && { backgroundColor: fill, opacity: 1 },
      ]}
      disabled={disabled || loading}
      haptic={disabled || loading ? null : "light"}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          <Text
            style={[
              loginType.button,
              styles.buttonLabel,
              { color: disabled && !loading ? "#FFFFFF" : labelColor },
            ]}
          >
            {label}
          </Text>
          {icon ? (
            <Ionicons name={icon} size={20} color={disabled && !loading ? "#FFFFFF" : labelColor} />
          ) : null}
        </>
      )}
    </PressableScale>
  )
}

export function LoginPasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  const { LOGIN } = useLoginTheme()
  const tokens = useAppThemeTokens()
  const fieldStyles = useLoginFieldStyles()

  return (
    <PressableScale
      onPress={() => {
        triggerMotionHaptic("selection")
        onToggle()
      }}
      hitSlop={6}
      haptic={null}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      style={[
        fieldStyles.trailingBtn,
        {
          backgroundColor: tokens.native.fill,
        },
      ]}
    >
      <Ionicons
        name={visible ? "eye-off-outline" : "eye-outline"}
        size={20}
        color={LOGIN.secondaryLabel}
      />
    </PressableScale>
  )
}

export function LoginField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  editable = true,
  trailing,
  grouped: _grouped,
  last: _last,
  leadingIcon,
  /** Override focus/icon accent (e.g. university brand). Defaults to active theme accent. */
  accentColor,
  keyboardType,
  textContentType,
  autoComplete,
  maxLength,
}: {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  editable?: boolean
  trailing?: ReactNode
  /** @deprecated Modern fields always render as standalone rows inside LoginFieldGroup. */
  grouped?: boolean
  /** @deprecated No longer used — fields are not inset-list grouped. */
  last?: boolean
  leadingIcon?: keyof typeof Ionicons.glyphMap | null
  accentColor?: string
  keyboardType?: "default" | "number-pad" | "email-address"
  textContentType?: "none" | "password" | "emailAddress" | "oneTimeCode"
  autoComplete?: "off" | "password" | "email" | "one-time-code"
  maxLength?: number
}) {
  const { LOGIN, loginType } = useLoginTheme()
  const styles = useLoginFieldStyles()
  const inputRef = useRef<TextInput>(null)
  const [focused, setFocused] = useState(false)
  const { focusReliably, onFocus, onBlur } = useReliableTextInputFocus(inputRef, editable)
  const keyboardAppearance = LOGIN.isDark ? "dark" : "light"
  const iconName = leadingIcon === undefined ? resolveLeadingIcon(label, secureTextEntry) : leadingIcon
  const isEmailField = label.trim().toLowerCase().includes("email")
  const accent = accentColor ?? LOGIN.purple
  const accentSoft = accentColor
    ? semanticSoft(accentColor, LOGIN.isDark)
    : LOGIN.accentSoft

  const focusProgress = useSharedValue(focused ? 1 : 0)
  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, {
      duration: motion.fast,
      easing: timing.fadeIn.easing,
    })
  }, [focusProgress, focused])

  const shellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focusProgress.value * 0.008 }],
  }))

  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: LOGIN.secondaryLabel }]}>{label}</Text> : null}
      <AnimatedPressable
        onPress={focusReliably}
        disabled={!editable}
        style={[
          styles.shell,
          shellAnimatedStyle,
          {
            borderRadius: 14,
            backgroundColor: focused ? accentSoft : LOGIN.grouped,
            borderWidth: focused ? 1.5 : StyleSheet.hairlineWidth,
            borderColor: focused ? accent : LOGIN.separator,
          },
          !editable && styles.inputDisabled,
        ]}
      >
        {iconName ? (
          <View style={[styles.leadingIcon, { backgroundColor: accentSoft }]}>
            <Ionicons name={iconName} size={18} color={accent} />
          </View>
        ) : null}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize ?? (isEmailField ? "none" : undefined)}
          autoComplete={
            autoComplete ?? (secureTextEntry ? "password" : isEmailField ? "email" : "off")
          }
          textContentType={
            textContentType ??
            (secureTextEntry ? "password" : isEmailField ? "emailAddress" : "none")
          }
          keyboardType={keyboardType ?? (isEmailField ? "email-address" : "default")}
          maxLength={maxLength}
          editable={editable}
          showSoftInputOnFocus
          onFocus={() => {
            onFocus()
            setFocused(true)
          }}
          onBlur={() => {
            onBlur()
            setFocused(false)
          }}
          style={[styles.input, loginType.input, { color: LOGIN.label }]}
          placeholderTextColor={LOGIN.secondaryLabel}
          keyboardAppearance={keyboardAppearance}
          autoCorrect={false}
          testID={label ? `login-field-${label.trim().toLowerCase().replace(/\s+/g, "-")}` : undefined}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </AnimatedPressable>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  buttonLabel: { color: "#ffffff" },
})
