import { Ionicons } from "@/components/icons/AppIcon"
import { BlurView } from "expo-blur"
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { FullWindowOverlay } from "react-native-screens"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { alertToneAccent, alertToneSoftFill } from "../../lib/alert-tone-theme"
import type { AppAlertButton } from "../../context/AppAlertProvider"

export type AppAlertTone = "info" | "success" | "warning" | "error"

const TONE_META: Record<
  AppAlertTone,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  info: { icon: "information-circle-outline", label: "Notice" },
  success: { icon: "checkmark-circle-outline", label: "Success" },
  warning: { icon: "warning-outline", label: "Confirm" },
  error: { icon: "alert-circle-outline", label: "Something went wrong" },
}

type OverlayProps = {
  title: string
  message?: string
  tone: AppAlertTone
  buttons: AppAlertButton[]
  onBackdropPress: () => void
  onButtonPress: (button: AppAlertButton) => void
}

/** Branded alert card + backdrop — no Modal wrapper (safe to nest in sheets). */
export function AppAlertOverlay({
  title,
  message,
  tone,
  buttons,
  onBackdropPress,
  onButtonPress,
}: OverlayProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const meta = TONE_META[tone]
  const accent = alertToneAccent(tokens, tone)
  const iconBg = alertToneSoftFill(tokens, tone)

  const orderedButtons = [...buttons].sort((a, b) => {
    const rank = (style?: AppAlertButton["style"]) =>
      style === "cancel" ? 0 : style === "destructive" ? 2 : 1
    return rank(a.style) - rank(b.style)
  })

  return (
    <View style={styles.overlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onBackdropPress}
        accessibilityLabel="Dismiss alert"
        accessibilityRole="button"
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={28}
            tint={tokens.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: tokens.isDark ? "rgba(0,0,0,0.62)" : "rgba(15,23,42,0.38)",
              },
            ]}
          />
        )}
      </Pressable>

      <View
        style={[
          styles.card,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: native.separator,
            ...tokens.cardShadow,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={meta.icon} size={28} color={accent} />
        </View>

        <Text style={[styles.kicker, { color: accent }]}>{meta.label}</Text>
        <Text style={[styles.title, { color: native.label }]}>{title}</Text>
        {message ? (
          <Text style={[styles.message, { color: native.secondaryLabel }]}>{message}</Text>
        ) : null}

        <View style={styles.actions}>
          {orderedButtons.map((button) => {
            const isCancel = button.style === "cancel"
            const isDestructive = button.style === "destructive"
            const primaryBg = isDestructive ? native.destructive : tone === "info" ? tokens.accent : accent
            return (
              <Pressable
                key={button.text}
                onPress={() => onButtonPress(button)}
                accessibilityRole="button"
                accessibilityLabel={button.text}
                style={({ pressed }) => [
                  styles.actionBtn,
                  isCancel && [
                    styles.actionBtnGhost,
                    { borderColor: native.separator, backgroundColor: native.fill },
                  ],
                  !isCancel && { backgroundColor: primaryBg },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    isCancel && { color: native.label },
                    !isCancel && styles.actionTextFilled,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

type Props = OverlayProps & {
  visible: boolean
  /** When true, render inline (inside a parent Modal) instead of opening another Modal. */
  inline?: boolean
}

export function AppAlertModal({
  visible,
  inline = false,
  ...overlayProps
}: Props) {
  if (!visible) return null

  const overlay = <AppAlertOverlay {...overlayProps} />

  if (inline) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.inlineHost]} pointerEvents="box-none">
        {overlay}
      </View>
    )
  }

  if (Platform.OS === "ios") {
    return <FullWindowOverlay>{overlay}</FullWindowOverlay>
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={overlayProps.onBackdropPress}
    >
      {overlay}
    </Modal>
  )
}

const styles = StyleSheet.create({
  inlineHost: {
    zIndex: 99999,
    elevation: 99999,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 8,
    zIndex: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 4,
  },
  kicker: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  message: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    marginBottom: 4,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  actionBtnGhost: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionTextFilled: {
    color: "#FFFFFF",
  },
})
