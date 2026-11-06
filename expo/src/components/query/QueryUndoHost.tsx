import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

type UndoAction = {
  id: string
  message: string
  onUndo: () => void | Promise<void>
}

type Listener = (action: UndoAction | null) => void

let listener: Listener | null = null
let timer: ReturnType<typeof setTimeout> | null = null

export function requestQueryUndo(input: { message: string; onUndo: () => void | Promise<void> }): void {
  const action: UndoAction = { id: `${Date.now()}-${Math.random()}`, message: input.message, onUndo: input.onUndo }
  listener?.(action)
}

export function QueryUndoHost() {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const [action, setAction] = useState<UndoAction | null>(null)

  useEffect(() => {
    listener = (next) => {
      if (timer) clearTimeout(timer)
      setAction(next)
      if (next) {
        timer = setTimeout(() => {
          setAction((current) => (current?.id === next.id ? null : current))
        }, 5000)
      }
    }
    return () => {
      listener = null
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!action) return null

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: Math.max(insets.bottom, 12) + 64 }]}
    >
      <View style={[styles.toast, { backgroundColor: native.label }]}>
        <Text style={[type.caption, styles.message, { color: native.groupedBackground }]}>{action.message}</Text>
        <Pressable
          onPress={() => {
            const undo = action.onUndo
            setAction(null)
            void undo()
          }}
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: NATIVE.pressedOpacity }}
        >
          <Text style={[type.caption, { color: native.tint, fontWeight: "700" }]}>Undo</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 40,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  message: {
    flex: 1,
    fontWeight: "600",
  },
})
