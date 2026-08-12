import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerGraduationRequirement } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"

type Props = {
  requirement: SummerGraduationRequirement
  onPress?: () => void
  last?: boolean
}

export function SummerGraduationRequirementCard({ requirement, onPress, last }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const iconColor = requirement.met ? tokens.success : tokens.warning
  const iconBg = requirement.met ? `${tokens.success}18` : `${tokens.warning}18`

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: native.separator },
        last && styles.rowLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons
            name={requirement.met ? "checkmark-circle-outline" : "ellipse-outline"}
            size={18}
            color={iconColor}
          />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={3}>
              {requirement.label}
            </Text>
            <FacultyStatusPill label={requirement.met ? "Complete" : "Pending"} tone={requirement.met ? "success" : "warning"} />
          </View>
          {requirement.detail ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              {requirement.detail}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, lineHeight: 21 },
})
