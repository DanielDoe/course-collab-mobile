import { useEffect, type ReactElement, type ReactNode } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import type { RefreshControlProps } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Easing,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { GLASS_SHEET_BACKDROP } from "./GlassActionSheetMenu"
import { DismissKeyboardView } from "../ui/DismissKeyboardView"
import { keyboardDismissScrollProps } from "../../lib/keyboard-dismiss-scroll-props"

const HIDDEN_OFFSET = 480
const DISMISS_DRAG = 96
const DISMISS_VELOCITY = 850
const HANDLE_DRAG_ZONE = 48

type Props = {
  visible: boolean
  onClose: () => void
  children: ReactNode
  /** Applied to the animated sheet host (outside scroll). */
  sheetHostStyle?: StyleProp<ViewStyle>
  maxHeight?: `${number}%` | number
  scrollable?: boolean
  refreshControl?: ReactElement<RefreshControlProps>
  accessibilityLabel?: string
  /** Lift sheet when the software keyboard opens (iOS modal focus). */
  keyboardAvoiding?: boolean
}

export function GlassBottomSheetModal({
  visible,
  onClose,
  children,
  sheetHostStyle,
  maxHeight = "92%",
  scrollable = true,
  refreshControl,
  accessibilityLabel = "Close sheet",
  keyboardAvoiding = false,
}: Props) {
  const backdropOpacity = useSharedValue(0)
  const sheetTranslateY = useSharedValue(HIDDEN_OFFSET)
  const dragY = useSharedValue(0)
  const scrollOffsetY = useSharedValue(0)
  const scrollRef = useAnimatedRef<Animated.ScrollView>()

  useEffect(() => {
    if (visible) {
      dragY.value = 0
      scrollOffsetY.value = 0
      backdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
      sheetTranslateY.value = withSpring(0, { damping: 24, stiffness: 280, mass: 0.9 })
      return
    }

    backdropOpacity.value = withTiming(0, { duration: 180 })
    sheetTranslateY.value = withTiming(HIDDEN_OFFSET, { duration: 220, easing: Easing.in(Easing.quad) })
    dragY.value = 0
  }, [visible, backdropOpacity, sheetTranslateY, dragY, scrollOffsetY])

  const nativeScrollGesture = Gesture.Native()

  const dismissPanGesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-28, 28])
    .simultaneousWithExternalGesture(nativeScrollGesture)
    .onUpdate((event) => {
      if (scrollOffsetY.value > 0) return
      dragY.value = Math.max(0, event.translationY)
    })
    .onEnd((event) => {
      if (scrollOffsetY.value > 0) {
        dragY.value = withSpring(0, { damping: 22, stiffness: 280 })
        return
      }

      const shouldDismiss = dragY.value > DISMISS_DRAG || event.velocityY > DISMISS_VELOCITY
      if (shouldDismiss) {
        dragY.value = withTiming(HIDDEN_OFFSET, { duration: 220, easing: Easing.in(Easing.quad) })
        backdropOpacity.value = withTiming(0, { duration: 180 })
        runOnJS(onClose)()
        return
      }

      dragY.value = withSpring(0, { damping: 22, stiffness: 280 })
    })

  const handlePanGesture = Gesture.Pan()
    .activeOffsetY(4)
    .failOffsetX([-28, 28])
    .onUpdate((event) => {
      dragY.value = Math.max(0, event.translationY)
    })
    .onEnd((event) => {
      const shouldDismiss = dragY.value > DISMISS_DRAG || event.velocityY > DISMISS_VELOCITY
      if (shouldDismiss) {
        dragY.value = withTiming(HIDDEN_OFFSET, { duration: 220, easing: Easing.in(Easing.quad) })
        backdropOpacity.value = withTiming(0, { duration: 180 })
        runOnJS(onClose)()
        return
      }

      dragY.value = withSpring(0, { damping: 22, stiffness: 280 })
    })

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffsetY.value = event.contentOffset.y
    },
  })

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * (1 - Math.min(dragY.value / 280, 0.4)),
  }))

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value + dragY.value }],
  }))

  const sheetBody = scrollable ? (
    <View style={styles.sheetBody}>
      <GestureDetector gesture={dismissPanGesture}>
        <Animated.View style={styles.scrollWrap}>
          <GestureDetector gesture={nativeScrollGesture}>
            <Animated.ScrollView
              ref={scrollRef}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              alwaysBounceVertical={false}
              bounces
              {...keyboardDismissScrollProps}
              refreshControl={refreshControl}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              <DismissKeyboardView>{children}</DismissKeyboardView>
            </Animated.ScrollView>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>

      <GestureDetector gesture={handlePanGesture}>
        <View
          style={styles.handleDragZone}
          pointerEvents="box-none"
          accessibilityRole="adjustable"
          accessibilityLabel="Drag down to dismiss"
        >
          <View style={styles.handleDragHitTarget} />
        </View>
      </GestureDetector>
    </View>
  ) : (
    <View style={styles.sheetBody}>
      <DismissKeyboardView style={styles.nonScrollBody}>{children}</DismissKeyboardView>
      <GestureDetector gesture={handlePanGesture}>
        <View
          style={styles.handleDragZone}
          pointerEvents="box-none"
          accessibilityRole="adjustable"
          accessibilityLabel="Drag down to dismiss"
        >
          <View style={styles.handleDragHitTarget} />
        </View>
      </GestureDetector>
    </View>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle={keyboardAvoiding && Platform.OS === "ios" ? "overFullScreen" : undefined}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={keyboardAvoiding && Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents={visible ? "auto" : "none"}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={accessibilityLabel} />
        </Animated.View>

        <Animated.View
          style={[styles.sheetHost, { maxHeight }, sheetHostStyle, animatedSheetStyle]}
          pointerEvents="box-none"
        >
          {sheetBody}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GLASS_SHEET_BACKDROP,
    zIndex: 1,
  },
  sheetHost: {
    width: "100%",
    zIndex: 2,
    overflow: "hidden",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    // Size to content; maxHeight on the host clamps tall sheets.
    // flexGrow:1 here left a empty gap under short sheets (gray "cut off" bar).
    flexGrow: 0,
    flexShrink: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  sheetBody: {
    flexGrow: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  handleDragZone: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HANDLE_DRAG_ZONE,
    zIndex: 3,
  },
  /** Narrow grab target — full-width overlay used to block Done/Save taps in sheet chrome. */
  handleDragHitTarget: {
    alignSelf: "center",
    width: "72%",
    height: 24,
    marginTop: 4,
  },
  scrollWrap: {
    flexGrow: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 0,
  },
  nonScrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
})
