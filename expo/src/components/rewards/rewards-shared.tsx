import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  resolveThemeTokens,
} from "../../constants/app-themes"
import { DEFAULT_APPEARANCE_PREFS } from "../../lib/appearance-preferences"
import { sectionThemeFromTokens, useNativeType, useStudentSectionTheme, useThemedStudentNative } from "../../lib/themed-module-theme"
import { FacultyEmptyState, FacultySectionCard, FacultyStatusPill } from "../faculty/faculty-shared"
import { FacultyStatCard, FacultyStatRow } from "../faculty/faculty-module-shell"
import { ModuleSectionHeader } from "../modules/ModuleScreen"

export function useRewardsTheme() {
  return useStudentSectionTheme("performance-rewards", "Performance & Rewards")
}

/** @deprecated Use useRewardsTheme() — static default does not follow live appearance theme. */
export const REWARDS_THEME = sectionThemeFromTokens(
  resolveThemeTokens(DEFAULT_APPEARANCE_PREFS.themeId, DEFAULT_APPEARANCE_PREFS.appearanceMode, null),
  "performance-rewards",
  "Performance & Rewards",
)

export function ProgressBar({ pct, height = 8 }: { pct: number; height?: number }) {
  const theme = useRewardsTheme()
  const SN = useThemedStudentNative()
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <View style={[styles.track, { height, backgroundColor: SN.accentSoftStrong }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%` as `${number}%`, height, backgroundColor: theme.primary },
        ]}
      />
    </View>
  )
}

export function StatGrid({ stats }: { stats: Array<{ label: string; value: string }> }) {
  const theme = useRewardsTheme()
  return (
    <FacultyStatRow>
      {stats.map((stat) => (
        <FacultyStatCard
          key={stat.label}
          icon="stats-chart-outline"
          iconBg={theme.soft}
          iconColor={theme.primary}
          value={stat.value}
          label={stat.label}
        />
      ))}
    </FacultyStatRow>
  )
}

export function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  const type = useNativeType()
  return (
    <View>
      <ModuleSectionHeader title={title} />
      {hint ? <Text style={[type.caption, styles.sectionHint]}>{hint}</Text> : null}
    </View>
  )
}

export function EmptyBlock({
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

export function TaskSectionCard({
  title,
  icon,
  children,
  flush,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  children: ReactNode
  flush?: boolean
}) {
  const theme = useRewardsTheme()
  return (
    <FacultySectionCard title={title} icon={icon} flush={flush} theme={theme}>
      {children}
    </FacultySectionCard>
  )
}

export function TaskMetaChip({
  label,
  tone = "neutral",
}: {
  label: string
  tone?: "neutral" | "due" | "pending" | "kind"
}) {
  const mapped =
    tone === "due" || tone === "pending" ? "warning" : tone === "kind" ? "live" : "neutral"
  return <FacultyStatusPill label={label} tone={mapped} />
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 999,
  },
  sectionHint: { marginTop: -4, marginBottom: 8, paddingHorizontal: 2 },
})
