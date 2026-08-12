import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { portalMeta, type MobileLoginPortal } from "../../constants/portals"
import { LoginBrandHeader } from "./LoginBrandHeader"
import { useLoginTheme } from "./login-theme"

type BackLinkProps = {
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function LoginBackLink({ label, onPress, style }: BackLinkProps) {
  const { loginType, LOGIN } = useLoginTheme()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.backLink, style, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[loginType.link, styles.backLinkLabel, { color: LOGIN.purpleLight }]}>{label}</Text>
    </Pressable>
  )
}

export function LoginPortalHeader({ portal }: { portal: MobileLoginPortal }) {
  const meta = portalMeta(portal)
  return <LoginBrandHeader title={meta.headline} subtitle={meta.description} />
}

export function LoginPortalStack({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[styles.stack, style]}>{children}</View>
}

const styles = StyleSheet.create({
  stack: { gap: 20, alignSelf: "stretch" },
  backLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  backLinkLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: { opacity: 0.55 },
})
