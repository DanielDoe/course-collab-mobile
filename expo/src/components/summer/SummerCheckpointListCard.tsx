import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerCheckpoint } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"

type CheckpointVariant = "pending" | "approved"

function statusLabel(variant: CheckpointVariant): string {
  return variant === "approved" ? "Approved" : "Pending"
}

function statusTone(variant: CheckpointVariant): "success" | "warning" {
  return variant === "approved" ? "success" : "warning"
}

type Props = {
  checkpoint: SummerCheckpoint
  variant: CheckpointVariant
  onPress?: () => void
  last?: boolean
}

export function SummerCheckpointListCard({ checkpoint, variant, onPress, last }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const iconColor = variant === "approved" ? tokens.success : tokens.warning
  const iconBg =
    variant === "approved"
      ? `${tokens.success}18`
      : `${tokens.warning}18`

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
            name={variant === "approved" ? "checkmark-circle-outline" : "cloud-upload-outline"}
            size={18}
            color={iconColor}
          />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={2}>
              {checkpoint.content.title}
            </Text>
            <FacultyStatusPill label={statusLabel(variant)} tone={statusTone(variant)} />
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {checkpoint.module_title}
          </Text>
        </View>
      </View>

      {checkpoint.content.description ? (
        <Text style={[type.caption, styles.description, { color: native.secondaryLabel }]} numberOfLines={2}>
          {checkpoint.content.description}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <Ionicons name="school-outline" size={14} color={native.tertiaryLabel} />
        <Text style={[type.caption, styles.metaText, { color: native.secondaryLabel }]} numberOfLines={1}>
          {checkpoint.training_title}
        </Text>
      </View>

      {onPress ? (
        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>View details</Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
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
  description: { paddingLeft: 48 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 48 },
  metaText: { flex: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
    paddingTop: 2,
  },
})
