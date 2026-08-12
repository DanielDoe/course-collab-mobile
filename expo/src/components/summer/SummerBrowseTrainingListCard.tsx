import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerBrowseTraining } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"

function statusLabel(training: SummerBrowseTraining): string {
  if (training.enrolled) return "Enrolled"
  if (training.available) return "Available"
  return training.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusTone(training: SummerBrowseTraining): "success" | "live" | "neutral" {
  if (training.enrolled) return "success"
  if (training.available) return "live"
  return "neutral"
}

function metaLine(training: SummerBrowseTraining): string | undefined {
  const parts = [training.meta.duration, training.meta.difficulty].filter(Boolean)
  return parts.length ? parts.join(" · ") : undefined
}

function leadFacultyName(training: SummerBrowseTraining): string | undefined {
  const lead = training.faculty.find((member) => member.role === "lead") ?? training.faculty[0]
  return lead?.name
}

type Props = {
  training: SummerBrowseTraining
  onPress?: () => void
  last?: boolean
}

export function SummerBrowseTrainingListCard({ training, onPress, last }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const summary = training.meta.summary || training.description
  const meta = metaLine(training)
  const faculty = leadFacultyName(training)

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
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name="sunny-outline" size={18} color={tokens.accent} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
              {training.title}
            </Text>
            <FacultyStatusPill label={statusLabel(training)} tone={statusTone(training)} />
          </View>
          {summary ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
          {meta || faculty ? (
            <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={1}>
              {[meta, faculty ? `Lead: ${faculty}` : null].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
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
    gap: 8,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
    paddingTop: 2,
  },
})
