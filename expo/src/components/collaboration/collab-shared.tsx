import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { solidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { FacultyEmptyState, FacultyHero, FacultyStatusPill } from "../faculty/faculty-shared"
import { FacultyStatCard, FacultyStatRow } from "../faculty/faculty-module-shell"
import { StudentSearchToolbar } from "../student/student-search-toolbar"
import { ModuleSection, ModuleSectionHeader } from "../modules/ModuleScreen"

/** @deprecated Module screens should start with tabs/search — not hero blocks. */
export function CollabHero({
  title,
  subtitle,
  icon,
  accent,
  stats,
}: {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  accent?: string
  stats?: Array<{ label: string; value: string }>
}) {
  const SN = useThemedStudentNative()
  const accentColor = accent ?? SN.accent

  return (
    <View style={styles.heroWrap}>
      <FacultyHero title={title} subtitle={subtitle} />
      {stats && stats.length > 0 ? (
        <FacultyStatRow>
          {stats.map((stat) => (
            <FacultyStatCard
              key={stat.label}
              icon={icon}
              iconBg={`${accentColor}18`}
              iconColor={accentColor}
              value={stat.value}
              label={stat.label}
            />
          ))}
        </FacultyStatRow>
      ) : null}
    </View>
  )
}

export function CollabSearch({
  value,
  onChange,
  placeholder,
  trailingAction,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  trailingAction?: {
    onPress: () => void
    accessibilityLabel: string
    icon?: keyof typeof Ionicons.glyphMap
  }
}) {
  return (
    <StudentSearchToolbar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      showFilter={false}
      trailingAction={trailingAction}
    />
  )
}

export function CollabFilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  const SN = useThemedStudentNative()

  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <Pressable
            key={opt.id}
            style={[
              styles.chip,
              { backgroundColor: active ? SN.accentSoftStrong : SN.secondaryGrouped },
            ]}
            onPress={() => onChange(opt.id)}
          >
            <Text
              style={[
                styles.chipText,
                { color: active ? SN.label : SN.secondaryLabel },
                active && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function CollabListPlaceholder({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
}) {
  return <FacultyEmptyState icon={icon} title={title} body={body} />
}

export function CollabEmpty({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  const SN = useThemedStudentNative()

  return (
    <View style={styles.emptyWrap}>
      <FacultyEmptyState icon={icon} title={title} body={body} />
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: SN.accent },
            pressed && { opacity: NATIVE.pressedOpacity },
          ]}
          onPress={onAction}
          android_ripple={Platform.OS === "android" ? { color: "rgba(255,255,255,0.2)" } : undefined}
        >
          <Text style={styles.primaryBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function CollabCard({
  title,
  subtitle,
  meta,
  badge,
  badgeTone,
  icon,
  iconColor,
  iconBg,
  thumbIndex,
  onPress,
}: {
  title: string
  subtitle?: string
  meta?: string
  badge?: string
  badgeTone?: { bg: string; text: string }
  icon: keyof typeof Ionicons.glyphMap
  iconColor?: string
  iconBg?: string
  thumbIndex?: number
  onPress?: () => void
}) {
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const accent = iconColor ?? SN.accent
  const tileBg = iconBg ?? `${accent}18`
  const solidThumb = thumbIndex != null ? solidListThumb(thumbIndex) : null

  const content = (
    <View style={[styles.listRow, { borderBottomColor: SN.separator }]}>
      {solidThumb ? (
        <SolidListThumbTile thumb={solidThumb} icon={icon} size="compact" />
      ) : (
        <View style={[styles.iconTile, { backgroundColor: tileBg }]}>
          <Ionicons name={icon} size={16} color={accent} />
        </View>
      )}
      <View style={styles.listCopy}>
        <Text style={[type.bodyEmphasis, styles.listTitle]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, styles.listSubtitle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={type.footnote}>{meta}</Text> : null}
      </View>
      <View style={styles.listTrailing}>
        {badge ? (
          badgeTone ? (
            <View style={[styles.badge, { backgroundColor: badgeTone.bg }]}>
              <Text style={[styles.badgeText, { color: badgeTone.text }]}>{badge}</Text>
            </View>
          ) : (
            <FacultyStatusPill label={badge} tone="neutral" />
          )
        ) : null}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={SN.tertiaryLabel} /> : null}
      </View>
    </View>
  )

  if (!onPress) return content

  return (
    <Pressable
      style={({ pressed }) => [pressed && { opacity: NATIVE.pressedOpacity }]}
      onPress={onPress}
      android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
    >
      {content}
    </Pressable>
  )
}

export function CollabSectionTitle({ title, hint }: { title: string; hint?: string }) {
  const type = useNativeType()
  const native = useThemedNative()

  return (
    <View>
      <ModuleSectionHeader title={title} />
      {hint ? (
        <Text style={[type.caption, styles.sectionHint, { color: native.secondaryLabel }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

/** Wrap list rows in a grouped inset section. */
export function CollabGroupedList({ children }: { children: ReactNode }) {
  return <ModuleSection>{children}</ModuleSection>
}

const styles = StyleSheet.create({
  heroWrap: { gap: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipTextActive: { fontWeight: "700" },
  emptyWrap: { gap: 12, alignItems: "center" },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: NATIVE.buttonRadius,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  listCopy: { flex: 1, gap: 4, minWidth: 0 },
  listTitle: {},
  listSubtitle: { lineHeight: 18 },
  listTrailing: { alignItems: "flex-end", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  sectionHint: { marginTop: -4, marginBottom: 8, paddingHorizontal: 2 },
})
