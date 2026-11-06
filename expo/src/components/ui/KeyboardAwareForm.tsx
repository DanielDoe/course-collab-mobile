import { type ReactNode, useEffect, useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { keyboardAwareFormLayout } from "../../lib/keyboard-aware-form-insets"
import { keyboardDismissScrollProps } from "../../lib/keyboard-dismiss-scroll-props"

type FormProps = {
  children: ReactNode
  footer?: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  footerStyle?: StyleProp<ViewStyle>
  /** Extra space below form fields (beyond footer / home indicator). */
  extraBottomPadding?: number
}

/** Shared keyboard height — used by forms and chat composers, not a second inset system. */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height)
    })
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return keyboardHeight
}

/**
 * Shared faculty/student form scroller: keyboard stays out of focused fields,
 * the whole form scrolls, and optional actions stay above the home indicator.
 */
export function KeyboardAwareForm({
  children,
  footer,
  contentContainerStyle,
  style,
  footerStyle,
  extraBottomPadding = 24,
}: FormProps) {
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()
  const hasFooter = Boolean(footer)
  const layout = keyboardAwareFormLayout({
    platform: Platform.OS === "ios" ? "ios" : "android",
    hasFooter,
    safeBottom: insets.bottom,
    extraBottomPadding,
    keyboardHeight,
  })

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={layout.avoidingBehavior}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: layout.scrollPaddingBottom },
          contentContainerStyle,
        ]}
        {...keyboardDismissScrollProps}
        automaticallyAdjustKeyboardInsets={layout.useAutomaticKeyboardInsets}
        automaticallyAdjustsScrollIndicatorInsets
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
            footerStyle,
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  )
}

/** Spec name — same shared keyboard/scroll container, not a second form kit. */
export const FormScreen = KeyboardAwareForm

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60,60,67,0.18)",
  },
})
