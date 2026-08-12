import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSelfPresence } from "../../context/PresenceSelfProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { MANUAL_PRESENCE_OPTIONS } from "../../lib/presence/constants"
import type { ManualPresenceStatus } from "../../lib/presence/types"
import { PresenceIndicator } from "./PresenceIndicator"

type Props = {
  onSelect?: () => void
}

export function PresenceStatusMenu({ onSelect }: Props) {
  const { manualStatus, setStatus, resetStatus } = useSelfPresence()
  const native = useThemedNative()
  const type = useNativeType()

  async function pick(next: ManualPresenceStatus) {
    await setStatus(next)
    onSelect?.()
  }

  async function handleReset() {
    await resetStatus()
    onSelect?.()
  }

  return (
    <View style={styles.menu}>
      {MANUAL_PRESENCE_OPTIONS.map((option) => {
        const selected = manualStatus === option.value
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.row,
              selected && { backgroundColor: native.fill },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => void pick(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <PresenceIndicator status={option.mapsTo} size="md" />
            <View style={styles.copy}>
              <Text style={[type.body, { color: native.label, fontWeight: "600" }]}>{option.label}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
                {option.description}
              </Text>
            </View>
          </Pressable>
        )
      })}
      <View style={[styles.divider, { backgroundColor: native.separator }]} />
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        onPress={() => void handleReset()}
        accessibilityRole="button"
      >
        <Ionicons name="refresh-outline" size={18} color={native.secondaryLabel} />
        <Text style={[type.body, { color: native.label }]}>Reset status</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  menu: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 4,
  },
})
