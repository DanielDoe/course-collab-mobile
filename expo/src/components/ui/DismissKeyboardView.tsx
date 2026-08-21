import type { ReactNode } from "react"
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/** Tap empty chrome to dismiss the keyboard without blocking inputs and buttons. */
export function DismissKeyboardView({ children, style }: Props) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.root, style]}>{children}</View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    alignSelf: "stretch",
  },
})
