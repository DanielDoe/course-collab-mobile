import { StyleSheet, Text, View } from "react-native"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { Ionicons } from "@/components/icons/AppIcon"
import { MODERN, kpiLabelTextA11yProps, kpiMetricTextA11yProps } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_CLASSROOM_POINTS_COLOR,
  FACULTY_CLASSROOM_POINTS_KPI_THUMBS,
} from "../../lib/faculty-classroom-points-theme"
import { formatClassroomPoints } from "../../lib/faculty-classroom-points-utils"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type OverviewStats = {
  pendingReview: number
  practicePending: number
  studentsWithPoints: number
  totalAwarded: number
  activeAssignments: number
}

type KpiDef = {
  id: string
  label: string
  value: string
  sub?: string
  icon: keyof typeof Ionicons.glyphMap
  thumb: SolidListThumb
  valueColor?: string
}

function buildKpis(stats: OverviewStats): KpiDef[] {
  const pendingTotal = stats.pendingReview + stats.practicePending
  return [
    {
      id: "pending",
      label: "Pending review",
      value: String(pendingTotal),
      sub: pendingTotal > 0 ? `${stats.pendingReview} code · ${stats.practicePending} practice` : "All caught up",
      icon: "time-outline",
      thumb: FACULTY_CLASSROOM_POINTS_KPI_THUMBS.pending,
      valueColor: pendingTotal > 0 ? FACULTY_CLASSROOM_POINTS_COLOR.pending : undefined,
    },
    {
      id: "students",
      label: "Students scored",
      value: String(stats.studentsWithPoints),
      sub: "On the leaderboard",
      icon: "people-outline",
      thumb: FACULTY_CLASSROOM_POINTS_KPI_THUMBS.students,
    },
    {
      id: "awarded",
      label: "Total awarded",
      value: formatClassroomPoints(stats.totalAwarded),
      sub: "Points issued",
      icon: "ribbon-outline",
      thumb: FACULTY_CLASSROOM_POINTS_KPI_THUMBS.awarded,
      valueColor: FACULTY_CLASSROOM_POINTS_COLOR.points,
    },
    {
      id: "tasks",
      label: "Open tasks",
      value: String(stats.activeAssignments),
      sub: "Active assignments",
      icon: "document-text-outline",
      thumb: FACULTY_CLASSROOM_POINTS_KPI_THUMBS.tasks,
    },
  ]
}

export function FacultyClassroomPointsKpiGrid({ stats }: { stats: OverviewStats }) {
  const { native, tokens, type } = useModuleTheme()
  const cardLayout = useKpiGridCardStyle()
  const kpis = buildKpis(stats)

  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => (
        <View
          key={kpi.id}
          style={[
            styles.card,
            cardLayout,
            tokens.cardShadow,
            { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
          ]}
        >
          <View style={styles.cardRow}>
            <View style={styles.copy}>
              <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.label, { color: native.secondaryLabel }]}>{kpi.label}</Text>
              <Text
                {...kpiMetricTextA11yProps}
                style={[type.bodyEmphasis, styles.value, { color: kpi.valueColor ?? native.label }]}
                numberOfLines={1}
              >
                {kpi.value}
              </Text>
              {kpi.sub ? (
                <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.sub, { color: native.tertiaryLabel }]} numberOfLines={2}>
                  {kpi.sub}
                </Text>
              ) : null}
            </View>
            <SolidListThumbTile thumb={kpi.thumb} icon={kpi.icon} size="compact" style={styles.iconTile} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  iconTile: {
    width: MODERN.metricIconSize,
    height: MODERN.metricIconSize,
    borderRadius: MODERN.metricIconRadius,
    flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  value: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4, lineHeight: 28 },
  sub: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
})
