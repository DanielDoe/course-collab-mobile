import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import {
  gradesHeroMutedInk,
  gradesLensSegmentStyle,
  gradesLensTrackBg,
  gradesLensTrackBorder,
  type GradeLens,
} from "../../lib/grades-theme"

const OPTIONS: Array<{ id: GradeLens; label: string; icon: "time-outline" | "ribbon-outline" }> = [
  { id: "pending", label: "Pending", icon: "time-outline" },
  { id: "final", label: "Final", icon: "ribbon-outline" },
]

type Props = {
  value: GradeLens
  onChange: (value: GradeLens) => void
}

const ACTIVE_SHADOW = Platform.select({
  ios: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
  },
  android: { elevation: 2 },
  default: {},
})

export function GradeLensToggle({ value, onChange }: Props) {
  const tokens = useAppThemeTokens()
  const inactiveInk = gradesHeroMutedInk(tokens.isDark)

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: gradesLensTrackBg(tokens.isDark),
          borderColor: gradesLensTrackBorder(tokens.isDark),
        },
      ]}
      accessibilityRole="tablist"
    >
      {OPTIONS.map((option) => {
        const active = option.id === value
        const segment = gradesLensSegmentStyle(option.id, active, inactiveInk)

        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [
              styles.segment,
              { backgroundColor: segment.backgroundColor },
              active && ACTIVE_SHADOW,
              pressed && styles.segmentPressed,
            ]}
            onPress={() => onChange(option.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <View style={styles.iconSlot}>
              <Ionicons name={option.icon} size={15} color={segment.color} />
            </View>
            <Text style={[styles.label, { color: segment.color }, active && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  segmentPressed: {
    opacity: 0.82,
  },
  iconSlot: {
    width: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: -0.12,
  },
  labelActive: {
    fontWeight: "700",
  },
})
