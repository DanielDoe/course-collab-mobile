import { type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Auth/login root — no KeyboardAvoidingView here.
 * Keyboard motion lives in AuthFlowScroll via useAnimatedKeyboardHeight so we
 * avoid the double-adjust glitch (KAV + automaticallyAdjustKeyboardInsets).
 */
export function AuthKeyboardShell({ children, style }: Props) {
  return <View style={[styles.flex, style]}>{children}</View>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
