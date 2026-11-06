import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE, formatNativeBadgeCount } from "../../constants/faculty-native-theme"
import { useThemedNative, useAppThemeTokens } from "../../context/AppearanceProvider"
import { useFacultyTheme, useNativeType } from "../../lib/themed-module-theme"
import { REPORT_SOLID } from "../../lib/assessment-report-theme"
import { COLOR_HUNT_COOL } from "../../lib/codebench-badge-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { PressableScale } from "../motion/PressableScale"

/** @deprecated Use useFacultyTheme() — static values are light-mode only. */
export const FACULTY_THEME = {
  primary: "#0d9488",
  primaryDark: "#0f172a",
  primaryLight: "#64748b",
  soft: "#ecfdf5",
  softBorder: "#e2e8f0",
}

export type NativeCountBadgeVariant = "inline" | "compact" | "overlay"

/** iOS-style red count pill — drawer nav, tabs, list rows, notification overlays. */
export function NativeCountBadge({
  count,
  max = 99,
  variant = "inline",
  borderColor,
  style}: {
  count: number
  max?: number
  variant?: NativeCountBadgeVariant
  /** Ring color for overlay variant (typically header/sheet bg). */
  borderColor?: string
  style?: StyleProp<ViewStyle>
}) {
  if (count <= 0) return null

  const label = formatNativeBadgeCount(count, max)
  const v = nativeCountBadgeStyles[variant]

  return (
    <View
      style={[
        v.container,
        variant === "overlay" && borderColor ? { borderColor } : null,
        style,
      ]}
    >
      <Text style={v.text}>{label}</Text>
    </View>
  )
}

const nativeCountBadgeStyles = {
  inline: {
    container: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 7,
      backgroundColor: "#FF3B30",
      alignItems: "center" as const,
      justifyContent: "center" as const},
    text: { fontSize: 13, fontWeight: "700" as const, color: "#ffffff" }},
  compact: {
    container: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      backgroundColor: "#FF3B30",
      alignItems: "center" as const,
      justifyContent: "center" as const},
    text: { fontSize: 11, fontWeight: "700" as const, color: "#ffffff" }},
  overlay: {
    container: {
      position: "absolute" as const,
      top: -5,
      right: -7,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      backgroundColor: "#FF3B30",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1.5,
      borderColor: "#ffffff",
      zIndex: 2},
    text: { fontSize: 10, fontWeight: "700" as const, color: "#ffffff", lineHeight: 12 }}} as const

type ModuleTheme = {
  primary: string
  soft: string
  softBorder?: string
}

export function FacultySectionCard({
  title,
  icon,
  iconThumb,
  children,
  action,
  flush,
  contentPadding = 16,
  theme = FACULTY_THEME,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  /** Solid Color Hunt tile — replaces soft icon well when set. */
  iconThumb?: SolidListThumb
  children: ReactNode
  action?: ReactNode
  flush?: boolean
  contentPadding?: number
  theme?: ModuleTheme
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const facultyTheme = useFacultyTheme()
  const accent = theme.primary === FACULTY_THEME.primary ? facultyTheme.primary : theme.primary
  const soft = theme.soft === FACULTY_THEME.soft ? facultyTheme.soft : theme.soft

  return (
    <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
      <View
        style={[
          styles.cardHead,
          {
            borderBottomColor: native.separator,
            paddingHorizontal: contentPadding,
            paddingTop: contentPadding,
          },
        ]}
      >
        {iconThumb ? (
          <SolidListThumbTile thumb={iconThumb} icon={icon} size="compact" />
        ) : (
          <View style={[styles.cardIcon, { backgroundColor: soft || native.fill }]}>
            <Ionicons name={icon} size={15} color={accent || tokens.accent} />
          </View>
        )}
        <Text style={[type.callout, styles.cardTitle, { color: native.label }]}>{title}</Text>
        {action}
      </View>
      <View
        style={[
          styles.cardBody,
          flush && styles.cardBodyFlush,
          !flush && { padding: contentPadding },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

export function FacultyHero({
  badge,
  title,
  subtitle,
  stat,
  statLabel,
  badgeBackground,
  badgeColor,
  statColor,
  statLabelColor,
}: {
  badge?: string
  title: string
  subtitle?: string
  stat?: string
  statLabel?: string
  badgeBackground?: string
  badgeColor?: string
  statColor?: string
  statLabelColor?: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={[styles.hero, { backgroundColor: native.secondaryGrouped }]}>
      {badge ? (
        <View style={[styles.heroBadge, { backgroundColor: badgeBackground ?? tokens.accentSoft }]}>
          <Text style={[styles.heroBadgeText, { color: badgeColor ?? tokens.accent }]}>{badge}</Text>
        </View>
      ) : null}
      <View style={styles.heroRow}>
        <View style={styles.heroText}>
          <Text style={[type.sheetTitle, styles.heroTitle]}>{title}</Text>
          {subtitle ? <Text style={[type.secondary, styles.heroSub]}>{subtitle}</Text> : null}
        </View>
        {stat ? (
          <View style={styles.heroStat}>
            <Text style={[type.sheetTitle, styles.heroStatValue, statColor ? { color: statColor } : null]}>
              {stat}
            </Text>
            {statLabel ? (
              <Text
                style={[
                  type.caption,
                  styles.heroStatLabel,
                  statLabelColor ? { color: statLabelColor } : null,
                ]}
              >
                {statLabel}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}

export function FacultyEmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
  /** Optional recovery control, e.g. clearing a search that matched nothing. */
  action?: ReactNode
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: native.fill }]}>
        <Ionicons name={icon} size={28} color={native.tertiaryLabel} />
      </View>
      <Text style={[type.sheetTitle, styles.emptyTitle]}>{title}</Text>
      <Text style={[type.secondary, styles.emptyBody]}>{body}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  )
}

export function FacultyWebBanner({ message, onOpenWeb }: { message: string; onOpenWeb?: () => void }) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={[styles.webBanner, { backgroundColor: native.secondaryGrouped }]}>
      <Ionicons name="globe-outline" size={18} color={native.secondaryLabel} />
      <Text style={[type.secondary, styles.webBannerText]}>{message}</Text>
      {onOpenWeb ? (
        <Pressable style={styles.webBannerBtn} onPress={onOpenWeb}>
          <Text style={[styles.webBannerBtnText, { color: native.tint }]}>Open Web</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function FacultyStatusPill({
  label,
  tone = "neutral",
  onDark = false}: {
  label: string
  tone?: "success" | "warning" | "danger" | "neutral" | "live"
  /** @deprecated Solid pills use the same palette on all surfaces. */
  onDark?: boolean
}) {
  void onDark
  const colors = {
    success: { bg: REPORT_SOLID.correct, text: REPORT_SOLID.correctInk },
    warning: { bg: REPORT_SOLID.pending, text: REPORT_SOLID.pendingInk },
    danger: { bg: REPORT_SOLID.missed, text: REPORT_SOLID.missedInk },
    live: { bg: COLOR_HUNT_COOL.cyan, text: "#FFFFFF" },
    neutral: { bg: COLOR_HUNT_COOL.indigo, text: "#FFFFFF" },
  }[tone]

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.pillText, { color: colors.text }]}>{label}</Text>
    </View>
  )
}

export function FacultyListRow({
  title,
  subtitle,
  meta,
  onPress,
  trailing}: {
  title: string
  subtitle?: string
  meta?: string
  onPress?: () => void
  trailing?: ReactNode
}) {
  const native = useThemedNative()
  const type = useNativeType()

  const content = (
    <View style={[styles.listRow, { borderBottomColor: native.separator }]}>
      <View style={styles.listCopy}>
        <Text style={[type.bodyEmphasis, styles.listTitle]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, styles.listSubtitle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={[type.footnote, styles.listMeta]}>{meta}</Text> : null}
      </View>
      {trailing ??
        (onPress ? <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} /> : null)}
    </View>
  )

  if (!onPress) return content
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
    >
      {content}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"},
  cardTitle: {
    flex: 1,
    fontWeight: "600" as const,
  },
  cardBody: { padding: 16, gap: 12 },
  cardBodyFlush: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 16 },
  hero: {
    borderRadius: NATIVE.sectionRadius,
    padding: 16,
    gap: 8,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBadgeText: { fontSize: 12, fontWeight: "600" },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroText: { flex: 1, gap: 4, minWidth: 0 },
  heroTitle: { flexShrink: 1 },
  heroSub: { lineHeight: 21, flexShrink: 1 },
  heroStat: { alignItems: "flex-end", gap: 2, flexShrink: 0 },
  heroStatValue: {
    fontSize: 22,
    fontWeight: NATIVE.titleWeight,
  },
  heroStatLabel: { fontSize: 12, fontWeight: "500" },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 36,
    paddingHorizontal: 24},
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyBody: {
    lineHeight: 21,
    textAlign: "center",
  },
  emptyAction: {
    paddingTop: 6,
  },
  webBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    padding: 12},
  webBannerText: { flex: 1, lineHeight: 18 },
  webBannerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4},
  webBannerBtnText: { fontSize: 15, fontWeight: "400" },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
    borderBottomWidth: StyleSheet.hairlineWidth},
  listCopy: { flex: 1, gap: 2 },
  listTitle: {},
  listSubtitle: { lineHeight: 18 },
  listMeta: {}})
