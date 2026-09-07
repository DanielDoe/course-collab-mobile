import type { ReactNode } from "react"
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { APP_BUTTON_MIN_HEIGHT, APP_BUTTON_PADDING, APP_BUTTON_RADIUS } from "../../constants/app-button"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { PressableScale } from "../motion/PressableScale"

export type AppButtonVariant = "primary" | "secondary" | "outline" | "soft" | "ghost"
export type AppButtonSize = "md" | "sm"

type Props = {
  label: string
  onPress: () => void
  variant?: AppButtonVariant
  size?: AppButtonSize
  icon?: keyof typeof Ionicons.glyphMap
  iconPosition?: "left" | "right"
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  backgroundColor?: string
  textColor?: string
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  children?: ReactNode
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  loading,
  disabled,
  fullWidth = true,
  backgroundColor,
  textColor,
  style,
  accessibilityLabel,
  children,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const isDisabled = disabled || loading

  const palette = (() => {
    switch (variant) {
      case "secondary":
        return {
          bg: native.secondaryGrouped,
          border: native.separator,
          label: native.label,
          icon: native.secondaryLabel,
        }
      case "outline":
        return {
          bg: native.secondaryGrouped,
          border: native.separator,
          label: tokens.accent,
          icon: tokens.accent,
        }
      case "soft":
        return {
          bg: tokens.accentSoft,
          border: tokens.accentBorder,
          label: tokens.accent,
          icon: tokens.accent,
        }
      case "ghost":
        return {
          bg: "transparent",
          border: "transparent",
          label: tokens.accent,
          icon: tokens.accent,
        }
      default:
        return {
          bg: tokens.accent,
          border: tokens.accent,
          label: "#FFFFFF",
          icon: "#FFFFFF",
        }
    }
  })()

  const fill = backgroundColor ?? palette.bg
  const color = textColor ?? palette.label
  const padV = size === "sm" ? 11 : APP_BUTTON_PADDING.vertical
  const padH = size === "sm" ? 16 : APP_BUTTON_PADDING.horizontal
  const minH = size === "sm" ? 44 : APP_BUTTON_MIN_HEIGHT
  const fontSize = size === "sm" ? 14 : 15

  const iconNode =
    icon && !loading ? (
      <Ionicons name={icon} size={size === "sm" ? 17 : 18} color={textColor ?? palette.icon} />
    ) : null

  return (
    <PressableScale
      style={[
        styles.base,
        {
          minHeight: minH,
          paddingVertical: padV,
          paddingHorizontal: padH,
          backgroundColor: fill,
          borderColor: variant === "primary" || variant === "ghost" ? fill : palette.border,
          borderWidth: variant === "primary" ? 0 : StyleSheet.hairlineWidth,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : children ? (
        children
      ) : (
        <>
          {icon && iconPosition === "left" ? iconNode : null}
          <Text style={[type.bodyEmphasis, styles.label, { color, fontSize }]}>{label}</Text>
          {icon && iconPosition === "right" ? iconNode : null}
        </>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: APP_BUTTON_RADIUS,
  },
  label: {
    fontWeight: "700",
    letterSpacing: -0.15,
    textAlign: "center",
  },
})
