import { Pressable, StyleSheet, Text } from "react-native"
import { useSelfPresence } from "../../context/PresenceSelfProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { PresenceIndicator } from "./PresenceIndicator"
import { PresenceStatusSheet } from "./PresenceStatusSheet"
import { useState } from "react"

type Props = {
  showLabel?: boolean
}

export function PresenceStatusTrigger({ showLabel = true }: Props) {
  const { status, statusLabel, enabled } = useSelfPresence()
  const native = useThemedNative()
  const type = useNativeType()
  const [open, setOpen] = useState(false)

  if (!enabled) return null

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.85 }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Status: ${statusLabel}. Change status`}
      >
        <PresenceIndicator status={status} size="sm" />
        {showLabel ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        ) : null}
      </Pressable>
      <PresenceStatusSheet visible={open} onClose={() => setOpen(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
})
