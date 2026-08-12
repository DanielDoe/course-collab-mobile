import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { getCoraSectionLabel, type CoraSectionId } from "../../lib/cora-nav-config"
import { CoraBrand } from "./CoraBrand"

type Props = {
  section: CoraSectionId
  onPressRoot: () => void
}

export function CoraHeaderBreadcrumb({ section, onPressRoot }: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  const sectionLabel = getCoraSectionLabel(section)

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPressRoot}
        hitSlop={6}
        style={({ pressed }) => [styles.rootHit, pressed && { opacity: 0.65 }]}
        accessibilityRole="button"
        accessibilityLabel="Back to Cora"
      >
        <CoraBrand size="sm" />
      </Pressable>
      <Ionicons name="chevron-forward" size={13} color={native.tertiaryLabel} style={styles.chevron} />
      <Text style={[type.bodyEmphasis, styles.section, { color: native.label }]} numberOfLines={1}>
        {sectionLabel}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 2,
  },
  rootHit: {
    flexShrink: 0,
  },
  chevron: {
    flexShrink: 0,
    marginHorizontal: 2,
  },
  section: {
    flexShrink: 1,
    fontSize: 17,
  },
})
