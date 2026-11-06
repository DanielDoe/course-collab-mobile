import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { BackHandler, Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Gesture, GestureDetector, GestureHandlerRootView, type PanGesture } from "react-native-gesture-handler"
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from "react-native-reanimated"
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import {
  DRAWER_CLOSE_TIMING,
  DRAWER_OPEN_SPRING,
  DRAWER_OPEN_TIMING,
  DRAWER_SWIPE_CLOSE_THRESHOLD,
  DRAWER_VELOCITY_CLOSE,
} from "./shell-drawer-motion"
import { durationOrInstant, useAppReducedMotion } from "../../lib/motion"

type ShellDrawerMotionContextValue = {
  modalVisible: boolean
  panelWidth: number
  openDrawer: () => void
  backdropStyle: AnimatedStyle<StyleProp<ViewStyle>>
  panelStyle: AnimatedStyle<StyleProp<ViewStyle>>
  panelDismissPanGesture: PanGesture
}

const ShellDrawerMotionContext = createContext<ShellDrawerMotionContextValue | null>(null)

type ProviderProps = {
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  children: ReactNode
}

export function ShellDrawerMotionProvider({
  drawerOpen,
  openDrawer,
  closeDrawer,
  children,
}: ProviderProps) {
  const panelWidth = useDrawerPanelWidth()
  const reduceMotion = useAppReducedMotion()
  const [modalVisible, setModalVisible] = useState(false)

  const panelWidthSv = useSharedValue(panelWidth)
  const panelX = useSharedValue(-panelWidth)
  const backdropOpacity = useSharedValue(0)
  const dragStartX = useSharedValue(0)
  const drawerOpenRef = useRef(drawerOpen)
  drawerOpenRef.current = drawerOpen
  const modalVisibleRef = useRef(modalVisible)
  modalVisibleRef.current = modalVisible

  useEffect(() => {
    panelWidthSv.value = panelWidth
    if (!drawerOpenRef.current && !modalVisibleRef.current) {
      panelX.value = -panelWidth
    }
  }, [panelWidth, panelWidthSv, panelX])

  const hideModalIfClosed = useCallback(() => {
    if (drawerOpenRef.current) return
    setModalVisible(false)
  }, [])

  const requestClose = useCallback(() => {
    closeDrawer()
  }, [closeDrawer])

  const openPanel = useCallback(
    (animated: boolean) => {
      backdropOpacity.value = animated
        ? withTiming(1, {
            ...DRAWER_OPEN_TIMING,
            duration: durationOrInstant(DRAWER_OPEN_TIMING.duration, reduceMotion),
          })
        : 1
      panelX.value = animated && !reduceMotion ? withSpring(0, DRAWER_OPEN_SPRING) : 0
    },
    [backdropOpacity, panelX, reduceMotion],
  )

  const closePanel = useCallback(() => {
    const closeDuration = durationOrInstant(DRAWER_CLOSE_TIMING.duration, reduceMotion)
    backdropOpacity.value = withTiming(0, { ...DRAWER_CLOSE_TIMING, duration: closeDuration })
    panelX.value = withTiming(-panelWidth, { ...DRAWER_CLOSE_TIMING, duration: closeDuration }, (finished) => {
      if (finished || !drawerOpenRef.current) runOnJS(hideModalIfClosed)()
    })
  }, [backdropOpacity, hideModalIfClosed, panelWidth, panelX, reduceMotion])

  const openPanelRef = useRef(openPanel)
  openPanelRef.current = openPanel
  const closePanelRef = useRef(closePanel)
  closePanelRef.current = closePanel

  useEffect(() => {
    if (drawerOpenRef.current || modalVisibleRef.current) return
    panelX.value = -panelWidth
    backdropOpacity.value = 0
  }, [panelWidth, panelX, backdropOpacity])

  useLayoutEffect(() => {
    if (drawerOpen) {
      setModalVisible(true)
      openPanelRef.current(true)
      return
    }

    if (!modalVisibleRef.current) return
    closePanelRef.current()
  }, [drawerOpen])

  const buildDismissPan = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetX(-10)
        .failOffsetX(10)
        .failOffsetY([-28, 28])
        .onBegin(() => {
          dragStartX.value = panelX.value
        })
        .onUpdate((event) => {
          const width = panelWidthSv.value
          const next = Math.max(-width, Math.min(0, dragStartX.value + event.translationX))
          panelX.value = next
          backdropOpacity.value = interpolate(next, [-width, 0], [0, 1], Extrapolation.CLAMP)
        })
        .onEnd((event) => {
          const shouldClose =
            event.translationX <= -DRAWER_SWIPE_CLOSE_THRESHOLD ||
            event.velocityX <= DRAWER_VELOCITY_CLOSE
          if (shouldClose) {
            runOnJS(requestClose)()
            return
          }
          openPanelRef.current(true)
        }),
    [backdropOpacity, dragStartX, panelWidthSv, panelX, requestClose],
  )

  const panelDismissPanGesture = useMemo(() => buildDismissPan(), [buildDismissPan])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panelX.value }],
  }))

  const value = useMemo(
    () => ({
      modalVisible,
      panelWidth,
      openDrawer,
      backdropStyle,
      panelStyle,
      panelDismissPanGesture,
    }),
    [backdropStyle, modalVisible, openDrawer, panelDismissPanGesture, panelStyle, panelWidth],
  )

  return (
    <ShellDrawerMotionContext.Provider value={value}>
      <View style={providerStyles.root}>{children}</View>
    </ShellDrawerMotionContext.Provider>
  )
}

const providerStyles = StyleSheet.create({
  root: { flex: 1 },
})

export function useShellDrawerMotion() {
  const ctx = useContext(ShellDrawerMotionContext)
  if (!ctx) throw new Error("useShellDrawerMotion must be used within ShellDrawerMotionProvider")
  return ctx
}

export function useOptionalShellDrawerMotion() {
  return useContext(ShellDrawerMotionContext)
}

/** Lets drawer panel pan coexist with an RNGH ScrollView inside the menu. */
export function DrawerPanelScrollHost({ children }: { children: ReactNode }) {
  const { panelDismissPanGesture } = useShellDrawerMotion()
  const scrollNative = useMemo(() => Gesture.Native(), [])
  const scrollGesture = useMemo(
    () => scrollNative.simultaneousWithExternalGesture(panelDismissPanGesture),
    [panelDismissPanGesture, scrollNative],
  )

  return <GestureDetector gesture={scrollGesture}>{children}</GestureDetector>
}

type ShellDrawerChromeProps = {
  visible: boolean
  onRequestClose: () => void
  backdropBaseStyle?: StyleProp<ViewStyle>
  panelBaseStyle?: StyleProp<ViewStyle>
  children: ReactNode
}

export function ShellDrawerChrome({
  visible,
  onRequestClose,
  backdropBaseStyle,
  panelBaseStyle,
  children,
}: ShellDrawerChromeProps) {
  const { backdropStyle, panelStyle, panelDismissPanGesture, panelWidth } = useShellDrawerMotion()
  const backdropDismissPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-10)
        .failOffsetX(10)
        .failOffsetY([-28, 28])
        .onEnd((event) => {
          const shouldClose =
            event.translationX <= -DRAWER_SWIPE_CLOSE_THRESHOLD ||
            event.velocityX <= DRAWER_VELOCITY_CLOSE
          if (shouldClose) {
            runOnJS(onRequestClose)()
          }
        }),
    [onRequestClose],
  )

  useEffect(() => {
    if (!visible || Platform.OS !== "android") return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onRequestClose()
      return true
    })
    return () => sub.remove()
  }, [onRequestClose, visible])

  if (!visible) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onRequestClose} statusBarTranslucent>
      <GestureHandlerRootView style={chromeStyles.modalRoot}>
        <View style={chromeStyles.overlay} pointerEvents="box-none" accessibilityViewIsModal>
          <Animated.View style={[chromeStyles.backdrop, backdropBaseStyle, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} accessibilityLabel="Dismiss menu backdrop" />
          </Animated.View>

          <GestureDetector gesture={backdropDismissPanGesture}>
            <Pressable
              style={[chromeStyles.backdropDismissRegion, { left: panelWidth }]}
              onPress={onRequestClose}
              accessibilityRole="button"
              accessibilityLabel="Dismiss menu backdrop"
            />
          </GestureDetector>

          <Animated.View style={[panelBaseStyle, panelStyle, chromeStyles.panel]}>
            <GestureDetector gesture={panelDismissPanGesture}>
              <View style={chromeStyles.panelHost} collapsable={false}>
                {children}
              </View>
            </GestureDetector>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const chromeStyles = StyleSheet.create({
  modalRoot: { flex: 1 },
  overlay: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  backdropDismissRegion: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  panelHost: { flex: 1 },
})
