import type { ReactNode } from "react"
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { PressableScale } from "../motion/PressableScale"
import { portalMeta, type MobileLoginPortal } from "../../constants/portals"
import { useAuthFlowLayout } from "../../lib/responsive-layout"
import { LoginBrandHeader } from "./LoginBrandHeader"
import { useLoginTheme } from "./login-theme"
export { DismissKeyboardView } from "../ui/DismissKeyboardView"

/** Return true when the panel handled back internally (do not pop to welcome). */
export type AuthPanelBackHandler = () => boolean
export type RegisterAuthPanelBack = (handler: AuthPanelBackHandler | null) => void

type BackLinkProps = {
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function LoginBackLink({ label, onPress, style }: BackLinkProps) {
  const { loginType, LOGIN } = useLoginTheme()

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      style={[styles.backLink, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[loginType.link, styles.backLinkLabel, { color: LOGIN.purpleLight }]}>{label}</Text>
    </PressableScale>
  )
}

type LoginAltAction = {
  label: string
  onPress: () => void
}

/** Compact secondary actions under the primary login button. */
export function LoginAltActions({
  actions,
}: {
  actions: Array<LoginAltAction | null | undefined>
}) {
  const { loginType, LOGIN } = useLoginTheme()
  const { isCompactHeight, isTallPhone } = useAuthFlowLayout()
  const items = actions.filter((action): action is LoginAltAction => Boolean(action))
  if (items.length === 0) return null

  return (
    <View
      style={[
        styles.altGroup,
        {
          borderColor: LOGIN.separator,
          marginTop: isCompactHeight ? 8 : isTallPhone ? 16 : 12,
        },
      ]}
    >
      {items.map((action, index) => (
        <PressableScale
          key={action.label}
          onPress={action.onPress}
          haptic="selection"
          style={[
            styles.altRow,
            index > 0 && [styles.altRowDivider, { borderTopColor: LOGIN.separator }],
          ]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[loginType.body, styles.altLabel, { color: LOGIN.label }]}>{action.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={LOGIN.purpleLight} />
        </PressableScale>
      ))}
    </View>
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
  const { stackGap } = useAuthFlowLayout()
  return <View style={[styles.stack, { gap: stackGap }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  stack: { alignSelf: "stretch" },
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
  altGroup: {
    alignSelf: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
  },
  altRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  altRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  altLabel: {
    flex: 1,
    fontWeight: "600",
  },
})
