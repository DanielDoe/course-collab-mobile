import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Keyboard, ScrollView, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { keyboardDismissScrollProps } from "../../lib/keyboard-dismiss-scroll-props"
import {
  authKeyboardExtraPad,
  keyboardHideEvent,
  keyboardShowEvent,
  useKeyboardVisibility,
} from "../../lib/motion"
import {
  AUTH_FORM_PHONE_MAX_WIDTH,
  authFlowCenterSlack,
  useAuthFlowLayout,
} from "../../lib/responsive-layout"

type Props = {
  children: ReactNode
  keyboardVisible?: boolean
  phoneMax?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Auth/login scroller that optically centers short stacks on tall phones.
 * Keyboard padding uses JS layout (not Animated.View in the scroll tree) so taps stay reliable.
 */
export function AuthFlowScroll({
  children,
  keyboardVisible: keyboardVisibleProp,
  phoneMax = AUTH_FORM_PHONE_MAX_WIDTH,
  style,
}: Props) {
  const insets = useSafeAreaInsets()
  const keyboardVisibleDetected = useKeyboardVisibility()
  const keyboardVisible = keyboardVisibleProp ?? keyboardVisibleDetected
  const layout = useAuthFlowLayout({ keyboardVisible, phoneMax })
  const [viewportH, setViewportH] = useState(layout.height)
  const [contentH, setContentH] = useState(0)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const show = Keyboard.addListener(keyboardShowEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height)
    })
    const hide = Keyboard.addListener(keyboardHideEvent, () => {
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  const padTop = insets.top + layout.verticalPadding
  const restingBottom = insets.bottom + layout.verticalPadding
  const slack = authFlowCenterSlack({
    viewportH,
    contentH,
    padTop,
    padBottom: restingBottom,
    shouldCenter: layout.shouldCenterVertically && !keyboardVisible,
  })

  const padBottom =
    keyboardHeight > 0
      ? insets.bottom + keyboardHeight + authKeyboardExtraPad
      : restingBottom + slack

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height
    setViewportH((prev) => (next > 0 && Math.abs(next - prev) > 1 ? next : prev))
  }, [])

  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height
    setContentH((prev) => (next > 0 && Math.abs(next - prev) > 1 ? next : prev))
  }, [])

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: padTop + slack,
          paddingBottom: padBottom,
        },
      ]}
      onLayout={onViewportLayout}
      {...keyboardDismissScrollProps}
      showsVerticalScrollIndicator={false}
      bounces={!keyboardVisible}
      keyboardShouldPersistTaps="always"
    >
      <View style={[styles.inner, layout.contentStyle]} onLayout={onContentLayout}>
        {children}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: "center",
  },
  inner: {
    width: "100%",
  },
})

/** Bottom padding for auth ScrollViews outside AuthFlowScroll. */
export function useAuthScrollBottomPadding(restingBottomPad: number): number {
  const insets = useSafeAreaInsets()
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const show = Keyboard.addListener(keyboardShowEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height)
    })
    const hide = Keyboard.addListener(keyboardHideEvent, () => {
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return keyboardHeight > 0
    ? insets.bottom + keyboardHeight + authKeyboardExtraPad
    : restingBottomPad
}
