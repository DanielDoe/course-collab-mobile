import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { CORA_SECTIONS, type CoraSectionId } from "../../lib/cora-nav-config"

type Props = {
  value: CoraSectionId
  onChange: (section: CoraSectionId) => void
}

export function CoraSectionNav({ value, onChange }: Props) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={[styles.rail, { backgroundColor: native.secondaryGrouped, borderRightColor: native.separator }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.railContent}>
        {CORA_SECTIONS.map((section) => {
          const active = section.id === value
          return (
            <Pressable
              key={section.id}
              onPress={() => onChange(section.id)}
              style={({ pressed }) => [
                styles.item,
                active && {
                  backgroundColor: hexToRgba("#8b5cf6", 0.12),
                },
                pressed && { opacity: NATIVE.pressedOpacity },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={section.label}
            >
              <View
                style={[
                  styles.iconWell,
                  {
                    backgroundColor: active ? hexToRgba("#8b5cf6", 0.18) : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name={section.icon}
                  size={18}
                  color={active ? "#6d28d9" : native.secondaryLabel}
                />
              </View>
              <Text
                style={[
                  type.caption,
                  styles.label,
                  { color: active ? "#6d28d9" : native.secondaryLabel },
                ]}
                numberOfLines={2}
              >
                {section.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  rail: {
    width: 76,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  railContent: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  item: {
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  iconWell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center",
    fontWeight: "600",
  },
})
