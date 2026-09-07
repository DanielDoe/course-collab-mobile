import { type ReactNode, useEffect } from "react"
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import Animated, { useAnimatedStyle } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  chatKeyboardAvoidingBehavior,
  keyboardShowEvent,
  useAnimatedKeyboardHeight,
} from "../../lib/motion"

type Props = {
  children: ReactNode
  composer: ReactNode
  /** Scroll the message list when the keyboard opens. */
  onKeyboardShow?: () => void
  style?: StyleProp<ViewStyle>
  composerStyle?: StyleProp<ViewStyle>
}

/**
 * One keyboard strategy for chat surfaces (Cora, Messages, Notetaker):
 * - iOS: KeyboardAvoidingView padding
 * - Android: animated composer bottom offset (no stacked KAV + manual padding)
 */
export function ChatKeyboardShell({
  children,
  composer,
  onKeyboardShow,
  style,
  composerStyle,
}: Props) {
  const insets = useSafeAreaInsets()
  const keyboardHeight = useAnimatedKeyboardHeight()

  useEffect(() => {
    if (!onKeyboardShow) return
    const sub = Keyboard.addListener(keyboardShowEvent, () => {
      requestAnimationFrame(onKeyboardShow)
    })
    return () => sub.remove()
  }, [onKeyboardShow])

  const composerAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(insets.bottom, 12) + (Platform.OS === "android" ? keyboardHeight.value : 0),
  }))

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={chatKeyboardAvoidingBehavior}
      keyboardVerticalOffset={0}
    >
      <View style={styles.flex}>{children}</View>
      <Animated.View style={[composerStyle, composerAnimatedStyle]}>{composer}</Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
