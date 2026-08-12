import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerTrainingEnrollment } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { ProgressBar } from "../rewards/rewards-shared"

type Props = {
  enrollment: SummerTrainingEnrollment
  onPress?: () => void
  onResume?: () => void
  resumeLabel?: string
}

export function SummerFeaturedTrainingCard({ enrollment, onPress, onResume, resumeLabel }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const percent = Math.min(100, Math.max(0, enrollment.percent ?? 0))
  const modulesLabel = `${enrollment.completed_modules ?? 0}/${enrollment.total_modules ?? "—"} modules`

  return (
    <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && onPress && { opacity: NATIVE.pressedOpacity }]}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${enrollment.training_title} details`}
      >
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name="sparkles-outline" size={20} color={tokens.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={2}>
            {enrollment.training_title}
          </Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {enrollment.camp_title}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
      </Pressable>

      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{modulesLabel}</Text>
          <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{percent}%</Text>
        </View>
        <ProgressBar pct={percent} height={8} />
      </View>

      {onResume ? (
        <Pressable
          style={({ pressed }) => [
            styles.resumeBtn,
            { backgroundColor: tokens.accent },
            pressed && { opacity: 0.92 },
          ]}
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel={resumeLabel ?? "Continue training"}
        >
          <Ionicons name="play-circle-outline" size={18} color="#ffffff" />
          <Text style={styles.resumeBtnText}>{resumeLabel ?? "Continue training"}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 16, lineHeight: 21 },
  progressBlock: { gap: 8 },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 12,
  },
  resumeBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
})
