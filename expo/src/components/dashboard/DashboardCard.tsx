import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

/**
 * Shared surface scale for every student dashboard surface.
 *
 * One radius / padding / shadow contract so the welcome banner, KPI tiles,
 * chart + insight cards, engagement tiles and announcement rows read as one
 * system instead of five near-miss variants.
 *
 * Shadow rule: **top-level** cards carry `tokens.cardShadow`; anything nested
 * inside a card (quick-action rows, insight rows, engagement tiles) uses a
 * hairline/fill instead — never a shadow inside a shadow.
 *
 * Colors are intentionally absent here — they come from the theme hooks at
 * render time (P1 / P20).
 */
export const DASHBOARD_SURFACE = {
  /** Top-level card corner radius. */
  radius: 18,
  /** Blocks nested inside a card (quick-action group, insight rows). */
  innerRadius: 12,
  /** Padding for full-width cards. */
  padding: 16,
  /** Denser padding for grid tiles (KPI, engagement). */
  tilePadding: 14,
  /** Vertical rhythm inside a card. */
  gap: 12,
  /** Gutter between grid tiles — keeps two 47.5% tiles on one row at 340pt. */
  gridGap: 10,
  /** Grid tile flex basis, shared by the KPI and engagement grids. */
  tileBasis: "47.5%",
  /**
   * Primary metric type step. The native type scale tops out at 20pt
   * (`sheetTitle`), so dashboard metrics get one documented step above it
   * rather than ad-hoc sizes per component.
   */
  metricSize: 26,
  metricLineHeight: 30,
  /** Secondary metric step for tiles that live inside a card. */
  tileMetricSize: 20,
  tileMetricLineHeight: 24,
  /** Primary metric for two-column KPI grid tiles (faculty + student dashboards). */
  gridMetricSize: 24,
  gridMetricLineHeight: 28,
} as const

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}

export function DashboardCard({ title, subtitle, children, action }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text {...type.textProps} accessibilityRole="header" style={type.bodyEmphasis}>
            {title}
          </Text>
          {subtitle ? (
            <Text {...type.textProps} style={type.caption}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: DASHBOARD_SURFACE.radius,
    padding: DASHBOARD_SURFACE.padding,
    gap: DASHBOARD_SURFACE.gap,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  headerText: { flex: 1, gap: 2 },
})
