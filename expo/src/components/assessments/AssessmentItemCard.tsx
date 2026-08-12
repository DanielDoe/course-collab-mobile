import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { solidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { dueMeta, scoreToneForTokens } from "./assessment-config"

type Props = {
  title: string
  /** Optional context line (e.g. assessment type on history). */
  subtitle?: string
  dueUntil?: string
  /** When set, replaces the due-date meta line. */
  metaLabel?: string
  bestScore?: number | null
  statusLabel: string
  statusTone?: "success" | "neutral" | "live"
  attemptsUsed?: number
  retakeLimit?: number
  icon: keyof typeof Ionicons.glyphMap
  /** List index — rotates thumb icon colors like Lectures cards. */
  index?: number
  onPress: () => void
}

function statusIcon(tone: Props["statusTone"]): keyof typeof Ionicons.glyphMap {
  if (tone === "success") return "checkmark-circle"
  if (tone === "live") return "ellipse"
  return "ellipse"
}

function statusColor(
  tone: Props["statusTone"],
  accent: string,
  tokens: ReturnType<typeof useAppThemeTokens>,
): string {
  if (tone === "success") return tokens.success
  if (tone === "live") return accent
  return tokens.textSecondary
}

export function AssessmentItemCard({
  title,
  subtitle,
  dueUntil,
  metaLabel,
  bestScore,
  statusLabel,
  statusTone = "live",
  attemptsUsed,
  retakeLimit,
  icon,
  index = 0,
  onPress,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const due = dueMeta(dueUntil)
  const score = scoreToneForTokens(bestScore, tokens)
  const solidThumb = solidListThumb(index)
  const labelColor = statusColor(statusTone, solidThumb.label, tokens)

  const metaColor = metaLabel
    ? native.secondaryLabel
    : due.urgent
      ? native.destructive
      : due.past
        ? native.tertiaryLabel
        : native.secondaryLabel

  const metaText = metaLabel ?? due.label
  const showScore = score.label !== "—"

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${statusLabel}${showScore ? `, ${score.label}` : ""}`}
    >
      <SolidListThumbTile thumb={solidThumb} icon={icon} />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color={metaLabel ? native.tertiaryLabel : due.urgent ? native.destructive : due.past ? native.tertiaryLabel : solidThumb.label}
          />
          <Text style={[type.caption, styles.meta, { color: metaColor }]} numberOfLines={1}>
            {metaText}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Ionicons
            name={statusIcon(statusTone)}
            size={statusTone === "success" ? 14 : 8}
            color={labelColor}
            style={statusTone === "success" ? undefined : styles.statusDot}
          />
          <Text style={[type.footnote, styles.statusText, { color: labelColor }]}>{statusLabel}</Text>
          {showScore ? (
            <View style={[styles.scorePill, { backgroundColor: score.bg }]}>
              <Text style={[type.footnote, styles.scoreText, { color: score.text }]}>{score.label}</Text>
            </View>
          ) : null}
          {attemptsUsed != null && retakeLimit != null ? (
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
              • {attemptsUsed}/{retakeLimit} attempts
            </Text>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 88,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 1,
  },
  title: {
    lineHeight: 20,
  },
  subtitle: {
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  meta: {
    flex: 1,
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    marginTop: 4,
    minHeight: 18,
  },
  statusDot: {
    marginHorizontal: 2,
  },
  statusText: {
    fontWeight: "600",
  },
  scorePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  scoreText: {
    fontWeight: "700",
  },
  chevron: {
    flexShrink: 0,
    marginTop: 2,
  },
})
