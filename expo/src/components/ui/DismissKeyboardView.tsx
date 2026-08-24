import type { ReactNode } from "react"
import {
  Keyboard,
  Pressable,
  StyleSheet,
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
    <View style={[styles.root, style]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={Keyboard.dismiss}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    alignSelf: "stretch",
  },
  content: {
    flexGrow: 1,
    alignSelf: "stretch",
  },
})
