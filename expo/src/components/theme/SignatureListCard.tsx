import { type ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { solidListThumb, solidListThumbFromAccent } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "./SolidListThumbTile"
import { PressableScale } from "../motion/PressableScale"

export type SignatureThumbPalette = {
  color: string
  soft: string
  border: string
}

type Props = {
  title: string
  subtitle?: string
  meta?: string
  metaIcon?: IoniconName
  statusLabel?: string
  statusColor?: string
  statusIcon?: IoniconName
  /** Small pill shown inline in the status row (e.g. score %). */
  badge?: ReactNode
  /** Optional value shown before chevron (e.g. +7.5 points). */
  trailingValue?: string
  trailingValueColor?: string
  icon: IoniconName
  accent: string
  /** List position — rotates solid Color Hunt thumb colors. */
  index?: number
  onPress?: () => void
  disabled?: boolean
  showChevron?: boolean
}

export function SignatureListCard({
  title,
  subtitle,
  meta,
  metaIcon = "calendar-outline",
  statusLabel,
  statusColor: statusColorProp,
  statusIcon: statusIconProp,
  badge,
  trailingValue,
  trailingValueColor,
  icon,
  accent,
  index,
  onPress,
  disabled,
  showChevron = true,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const thumb = index != null ? solidListThumb(index) : solidListThumbFromAccent(accent)
  const statusColor = statusColorProp ?? thumb.label
  const statusIcon = statusIconProp ?? "ellipse"

  const content = (
    <>
      <SolidListThumbTile thumb={thumb} icon={icon} />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <View style={styles.metaRow}>
            <Ionicons name={metaIcon} size={12} color={native.tertiaryLabel} />
            <Text style={[type.caption, styles.meta, { color: native.secondaryLabel }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        ) : null}
        {statusLabel || badge ? (
          <View style={styles.statusRow}>
            {statusLabel ? (
              <>
                <Ionicons
                  name={statusIcon}
                  size={statusIcon === "checkmark-circle" ? 14 : 8}
                  color={statusColor}
                  style={statusIcon === "checkmark-circle" ? undefined : styles.statusDot}
                />
                <Text style={[type.footnote, styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </>
            ) : null}
            {badge}
          </View>
        ) : null}
      </View>

      {trailingValue ? (
        <Text style={[type.bodyEmphasis, styles.trailingValue, { color: trailingValueColor ?? thumb.label }]}>
          {trailingValue}
        </Text>
      ) : null}

      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
      ) : null}
    </>
  )

  if (!onPress) {
    return <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>{content}</View>
  }

  return (
    <PressableScale
      style={[
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {content}
    </PressableScale>
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
  trailingValue: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 0,
  },
  chevron: {
    flexShrink: 0,
    marginTop: 2,
  },
})
