import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native"
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

const AuthScrollIntoViewContext = createContext<() => void>(() => {})

/** Scroll the focused auth field above the keyboard (noop outside AuthFlowScroll). */
export function useAuthScrollIntoView(): () => void {
  return useContext(AuthScrollIntoViewContext)
}

function currentlyFocusedHost():
  | {
      measureInWindow: (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => void
    }
  | null {
  const state = TextInput.State as {
    currentlyFocusedInput?: () => unknown
  }
  const focused = state.currentlyFocusedInput?.()
  if (
    focused &&
    typeof focused === "object" &&
    "measureInWindow" in focused &&
    typeof (focused as { measureInWindow?: unknown }).measureInWindow === "function"
  ) {
    return focused as {
      measureInWindow: (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => void
    }
  }
  return null
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
  const scrollRef = useRef<ScrollView>(null)
  const scrollYRef = useRef(0)
  const keyboardHeightRef = useRef(0)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollFocusedIntoView = useCallback(() => {
    const focused = currentlyFocusedHost()
    const scroll = scrollRef.current
    const kb = keyboardHeightRef.current
    if (!focused || !scroll || kb <= 0) return

    focused.measureInWindow((_x, y, _w, h) => {
      if (h <= 0) return
      const keyboardTop = Dimensions.get("window").height - kb
      const margin = authKeyboardExtraPad + 24
      const inputBottom = y + h
      const overflow = inputBottom - (keyboardTop - margin)
      if (overflow <= 0) return
      scroll.scrollTo({
        y: Math.max(0, scrollYRef.current + overflow),
        animated: true,
      })
    })
  }, [])

  const requestScrollIntoView = useCallback(() => {
    // Wait for keyboard padding / focus layout, then retry once after settle.
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollFocusedIntoView)
    })
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    settleTimerRef.current = setTimeout(
      scrollFocusedIntoView,
      Platform.OS === "ios" ? 280 : 120,
    )
  }, [scrollFocusedIntoView])

  useEffect(() => {
    const show = Keyboard.addListener(keyboardShowEvent, (event) => {
      const next = event.endCoordinates.height
      keyboardHeightRef.current = next
      setKeyboardHeight(next)
      requestScrollIntoView()
    })
    const hide = Keyboard.addListener(keyboardHideEvent, () => {
      keyboardHeightRef.current = 0
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    }
  }, [requestScrollIntoView])
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

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y
  }, [])

  return (
    <AuthScrollIntoViewContext.Provider value={requestScrollIntoView}>
      <ScrollView
        ref={scrollRef}
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
        onScroll={onScroll}
        scrollEventThrottle={16}
        {...keyboardDismissScrollProps}
        showsVerticalScrollIndicator={false}
        bounces={!keyboardVisible}
        keyboardShouldPersistTaps="always"
      >
        <View style={[styles.inner, layout.contentStyle]} onLayout={onContentLayout}>
          {children}
        </View>
      </ScrollView>
    </AuthScrollIntoViewContext.Provider>
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
