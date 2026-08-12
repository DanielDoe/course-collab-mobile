import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { SectionTheme } from "../../constants/section-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import {
  courseInfoHeroBadgeStyle,
  courseInfoHeroStatStyle,
  courseInfoStatusAccent,
  courseInfoThemeFromTokens,
} from "../../lib/course-info-color-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  FacultyHero,
  FacultySectionCard,
  FacultyStatusPill,
} from "../faculty/faculty-shared"

export function useCourseInfoTheme(): SectionTheme {
  const tokens = useAppThemeTokens()
  return courseInfoThemeFromTokens(tokens)
}

type ModuleTheme = {
  primary: string
  soft: string
  softBorder?: string
}

export function InfoSectionCard({
  title,
  icon,
  iconThumb,
  children,
  flush,
  theme,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  iconThumb?: SolidListThumb
  children: ReactNode
  flush?: boolean
  theme?: ModuleTheme
}) {
  const defaultTheme = useCourseInfoTheme()
  return (
    <FacultySectionCard
      title={title}
      icon={icon}
      iconThumb={iconThumb}
      flush={flush}
      theme={theme ?? defaultTheme}
    >
      {children}
    </FacultySectionCard>
  )
}

export function InfoHero({
  badge,
  title,
  subtitle,
  stat,
  statLabel,
}: {
  badge?: string
  title: string
  subtitle?: string
  stat?: string
  statLabel?: string
  theme?: ModuleTheme
}) {
  const tokens = useAppThemeTokens()
  const badgeStyle = courseInfoHeroBadgeStyle(tokens.isDark)
  const statStyle = courseInfoHeroStatStyle(tokens.isDark)
  return (
    <FacultyHero
      badge={badge}
      title={title}
      subtitle={subtitle}
      stat={stat}
      statLabel={statLabel}
      badgeBackground={badgeStyle.background}
      badgeColor={badgeStyle.text}
      statColor={stat ? statStyle.value : undefined}
      statLabelColor={statLabel ? statStyle.label : undefined}
    />
  )
}

export function InfoBulletList({ items }: { items: string[] }) {
  const theme = useCourseInfoTheme()
  const type = useNativeType()
  if (items.length === 0) return null
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={`${i}-${item.slice(0, 12)}`} style={styles.bulletRow}>
          <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
          <Text style={[type.callout, styles.bulletText]}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string
  tone?: "neutral" | "success" | "warning" | "danger" | "purple"
}) {
  const mapped =
    tone === "purple"
      ? "live"
      : tone === "danger"
        ? "danger"
        : tone === "warning"
          ? "warning"
          : tone === "success"
            ? "success"
            : "neutral"
  return <FacultyStatusPill label={label} tone={mapped} />
}

export function ExpandableSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const SN = useThemedNative()
  const type = useNativeType()
  return (
    <View style={[styles.expandSection, { backgroundColor: SN.secondaryGrouped }]}>
      <Pressable
        style={({ pressed }) => [styles.expandHead, pressed && { opacity: NATIVE.pressedOpacity }]}
        onPress={onToggle}
        android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
      >
        <Text style={[type.bodyEmphasis, styles.expandTitle]}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={SN.tertiaryLabel}
        />
      </Pressable>
      {open ? (
        <View style={[styles.expandBody, { borderTopColor: SN.separator }]}>{children}</View>
      ) : null}
    </View>
  )
}

export function statusTone(status?: string): "neutral" | "success" | "warning" | "danger" | "purple" {
  const s = (status ?? "").toLowerCase()
  if (["approved", "completed", "done", "scheduled", "ready"].some((k) => s.includes(k))) return "success"
  if (["pending", "submitted", "in_review", "review", "draft"].some((k) => s.includes(k))) return "warning"
  if (["rejected", "cancelled", "canceled", "denied"].some((k) => s.includes(k))) return "danger"
  return "purple"
}

/** Color Hunt accent for course-info status labels (non-pill). */
export function courseInfoStatusColor(status?: string): string {
  return courseInfoStatusAccent(status)
}

const styles = StyleSheet.create({
  bulletList: { gap: 10 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletText: { flex: 1, lineHeight: 21 },
  expandSection: {
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  expandHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    minHeight: NATIVE.rowMinHeight,
  },
  expandTitle: { flex: 1 },
  expandBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
