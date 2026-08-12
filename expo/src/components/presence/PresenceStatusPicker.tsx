import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSelfPresence } from "../../context/PresenceSelfProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { PRESENCE_COLORS } from "../../lib/presence/constants"
import { PresenceIndicator } from "./PresenceIndicator"
import { PresenceStatusSheet } from "./PresenceStatusSheet"

type Props = {
  compact?: boolean
}

function statusIconName(status: string): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "available":
      return "checkmark-circle"
    case "busy":
      return "remove-circle"
    case "dnd":
      return "remove-circle-outline"
    case "away":
      return "time"
    default:
      return "ellipse-outline"
  }
}

export function PresenceStatusPicker({ compact }: Props) {
  const { status, statusLabel, enabled } = useSelfPresence()
  const native = useThemedNative()
  const type = useNativeType()
  const [open, setOpen] = useState(false)

  if (!enabled) return null

  const iconColor = PRESENCE_COLORS[status]

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          compact && styles.triggerCompact,
          compact && { backgroundColor: native.fill },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Status: ${statusLabel}. Change status`}
      >
        {compact ? (
          <View style={[styles.compactIconWrap, { borderColor: `${iconColor}55` }]}>
            <Ionicons name={statusIconName(status)} size={22} color={iconColor} />
          </View>
        ) : (
          <>
            <PresenceIndicator status={status} size="md" />
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              {statusLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color={native.tertiaryLabel} />
          </>
        )}
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: 160,
  },
  triggerCompact: {
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 36,
  },
  compactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
})
