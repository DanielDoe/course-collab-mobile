import { useCallback, useEffect, useRef, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import type { IoniconName } from "../icons/ion-to-lucide-map"

export type MessageAttachActionId = "photo_library" | "camera" | "document" | "import_course"

const ACTIONS: Array<{ id: MessageAttachActionId; label: string; icon: IoniconName }> = [
  { id: "photo_library", label: "Photo library", icon: "images-outline" },
  { id: "camera", label: "Camera", icon: "camera-outline" },
  { id: "document", label: "Document", icon: "document-outline" },
  { id: "import_course", label: "Import from course", icon: "book-outline" },
]

const OPEN_SPRING = { damping: 18, stiffness: 320, mass: 0.85 }
const CLOSE_MS = 160

type Props = {
  visible: boolean
  onClose: () => void
  onAction: (actionId: MessageAttachActionId) => void
}

/**
 * Cora-style floating + menu for the messages composer (not a full-screen sheet).
 * Springs up from the composer with a soft backdrop fade.
 * Actions run after the menu Modal unmounts so a follow-up sheet/picker can present.
 */
export function MessageComposerAttachMenu({ visible, onClose, onAction }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const shellBg = tokens.isDark ? native.secondaryGrouped : "#ffffff"

  const [mounted, setMounted] = useState(visible)
  const progress = useSharedValue(visible ? 1 : 0)
  const pendingActionRef = useRef<MessageAttachActionId | null>(null)

  const finishClose = useCallback(() => {
    setMounted(false)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (action) onAction(action)
  }, [onAction])

  useEffect(() => {
    if (visible) {
      setMounted(true)
      progress.value = 0
      progress.value = withSpring(1, OPEN_SPRING)
      return
    }

    if (!mounted) return
    progress.value = withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(finishClose)()
    })
  }, [visible, mounted, progress, finishClose])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }))

  const menuStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [18, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.92, 1]) },
    ],
  }))

  const closeBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.15, 1], [0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [10, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.85, 1]) },
    ],
  }))

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.backdropFill, backdropStyle]}>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => {
              pendingActionRef.current = null
              onClose()
            }}
          />
        </Animated.View>

        <View style={styles.dock} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.menu,
              menuStyle,
              {
                backgroundColor: shellBg,
                borderColor: tokens.isDark ? native.separator : hexToRgba("#000000", 0.08),
                shadowColor: native.label,
              },
            ]}
          >
            {ACTIONS.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(40 + index * 35)
                  .duration(220)
                  .springify()
                  .damping(18)}
              >
                <Pressable
                  onPress={() => {
                    pendingActionRef.current = item.id
                    onClose()
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={({ pressed }) => [
                    styles.row,
                    index < ACTIONS.length - 1
                      ? { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth }
                      : null,
                    { opacity: pressed ? NATIVE.pressedOpacity : 1 },
                  ]}
                >
                  <Ionicons name={item.icon} size={18} color={native.secondaryLabel} />
                  <Text style={[type.body, styles.rowLabel, { color: native.label }]}>{item.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View style={closeBtnStyle}>
            <Pressable
              onPress={() => {
                pendingActionRef.current = null
                onClose()
              }}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: shellBg,
                  borderColor: tokens.isDark ? native.separator : hexToRgba("#000000", 0.08),
                  opacity: pressed ? NATIVE.pressedOpacity : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Ionicons name="close" size={22} color={native.label} />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  dock: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  menu: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  closeBtn: {
    alignSelf: "center",
    marginTop: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
})
