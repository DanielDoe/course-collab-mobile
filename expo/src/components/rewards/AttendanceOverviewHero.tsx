import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AttendanceRecord, AttendanceScore, AttendanceStreak } from "../../lib/rewards-api"
import {
  ATTENDANCE_STAT_THEMES,
  ATTENDANCE_WARM,
  attendanceProgressColor,
  attendanceProgressTrack,
  type AttendanceStatKey,
} from "../../lib/attendance-overview-theme"
import { buildAttendanceOverviewSnapshot } from "../../lib/attendance-overview-utils"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"
import { formatRelativeTime } from "../../lib/rewards-api"
import { AttendanceStatusMix, AttendanceWeeklyChart } from "./AttendanceOverviewCharts"

type Props = {
  score: AttendanceScore
  streak: AttendanceStreak
  records?: AttendanceRecord[]
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={styles.sectionHead}>
      <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
      {subtitle ? (
        <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 2 }]}>{subtitle}</Text>
      ) : null}
    </View>
  )
}

function KpiTile({
  statKey,
  value,
  label,
  sub,
}: {
  statKey: AttendanceStatKey
  value: string
  label: string
  sub?: string
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const cardLayout = useKpiGridCardStyle("48%")
  const theme = ATTENDANCE_STAT_THEMES[statKey]
  const thumb = solidListThumbFixed(theme.fill, theme.iconInk)

  return (
    <View
      style={[
        styles.kpiTile,
        cardLayout,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      <SolidListThumbTile thumb={thumb} icon={theme.icon} size="compact" />
      <Text style={[type.bodyEmphasis, styles.kpiValue, { color: native.label }]}>{value}</Text>
      <Text style={[type.caption, styles.kpiLabel, { color: theme.labelInk }]}>{label}</Text>
      {sub ? (
        <Text style={[type.footnote, { color: native.secondaryLabel, textAlign: "center" }]}>{sub}</Text>
      ) : null}
    </View>
  )
}

function InsightRow({ text }: { text: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={[styles.insightRow, { backgroundColor: native.fill, borderColor: native.separator }]}>
      <Ionicons name="bulb-outline" size={16} color={ATTENDANCE_WARM.orange} />
      <Text style={[type.caption, styles.insightCopy, { color: native.label }]}>{text}</Text>
    </View>
  )
}

function MissRow({ record }: { record: AttendanceRecord }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={[styles.missRow, { borderColor: native.separator }]}>
      <View style={[styles.missDot, { backgroundColor: ATTENDANCE_WARM.red }]} />
      <View style={styles.missCopy}>
        <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
          {record.classTitle ?? "Class session"}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          {formatRelativeTime(record.timestamp ?? record.startTime)} · Missed
        </Text>
      </View>
      <Ionicons name="close-circle" size={18} color={ATTENDANCE_WARM.red} />
    </View>
  )
}

export function AttendanceOverviewHero({ score, streak, records = [] }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const snapshot = useMemo(
    () => buildAttendanceOverviewSnapshot(score, streak, records),
    [score, streak, records],
  )

  const progressColor = attendanceProgressColor(snapshot.pct)

  return (
    <View style={styles.root}>
      <View style={[styles.heroCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
              Attendance rate
            </Text>
            <View style={styles.heroPctRow}>
              <Text style={[styles.heroPct, { color: native.label }]}>{Math.round(snapshot.pct)}%</Text>
              <View style={[styles.bandChip, { backgroundColor: `${snapshot.performanceColor}22` }]}>
                <View style={[styles.bandDot, { backgroundColor: snapshot.performanceColor }]} />
                <Text style={[type.caption, { color: snapshot.performanceColor, fontWeight: "700" }]}>
                  {snapshot.performanceLabel}
                </Text>
              </View>
            </View>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {snapshot.attended} of {snapshot.scoredTotal} scored sessions attended
              {snapshot.scoreOutOf10 != null ? ` · ${snapshot.scoreOutOf10}/10 grade weight` : ""}
            </Text>
          </View>
          <View style={[styles.ringOuter, { borderColor: `${progressColor}33` }]}>
            <View style={[styles.ringInner, { borderColor: progressColor }]}>
              <Ionicons name="calendar-outline" size={22} color={progressColor} />
            </View>
          </View>
        </View>

        <View style={[styles.track, { backgroundColor: attendanceProgressTrack(tokens.isDark) }]}>
          <View style={[styles.fill, { width: `${snapshot.pct}%` as `${number}%`, backgroundColor: progressColor }]} />
        </View>

        <View style={styles.heroMetaRow}>
          <MetaPill icon="flash-outline" label={`${snapshot.pointsEarned} pts earned`} color={ATTENDANCE_WARM.orange} />
          <MetaPill
            icon="flame-outline"
            label={`${snapshot.currentStreak}d streak`}
            color={ATTENDANCE_WARM.gold}
          />
          {snapshot.classesLeft > 0 ? (
            <MetaPill
              icon="calendar-outline"
              label={`${snapshot.classesLeft} left`}
              color={ATTENDANCE_STAT_THEMES.remaining.fill}
            />
          ) : null}
        </View>
      </View>

      <SectionHeader title="This term" subtitle="Scored sessions and what's ahead" />
      <View style={styles.kpiGrid}>
        <KpiTile statKey="attended" value={String(snapshot.attended)} label="Attended" />
        <KpiTile statKey="missed" value={String(snapshot.missed)} label="Missed" />
        <KpiTile
          statKey="remaining"
          value={String(snapshot.classesLeft)}
          label="Classes left"
          sub={snapshot.scheduledTotal > 0 ? `of ${snapshot.scheduledTotal} scheduled` : undefined}
        />
        <KpiTile
          statKey="streak"
          value={`${snapshot.currentStreak}d`}
          label="Current streak"
          sub={snapshot.longestStreak > 0 ? `Best ${snapshot.longestStreak}d` : undefined}
        />
      </View>

      <View style={[styles.panel, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <SectionHeader title="Session breakdown" subtitle="How you've checked in so far" />
        <AttendanceStatusMix
          present={snapshot.statusBreakdown.present}
          late={snapshot.statusBreakdown.late}
          absent={snapshot.statusBreakdown.absent}
          other={snapshot.statusBreakdown.other}
        />
      </View>

      <View style={[styles.panel, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <SectionHeader title="Weekly trend" subtitle="Attendance rate by week (%)" />
        <AttendanceWeeklyChart weeks={snapshot.weeklyBars} />
      </View>

      <View style={styles.kpiGrid}>
        <KpiTile statKey="points" value={String(snapshot.pointsEarned)} label="Points earned" />
        <KpiTile statKey="best" value={`${snapshot.longestStreak}d`} label="Best streak" />
        <KpiTile statKey="goal" value={`${snapshot.nextMilestone}d`} label="Next milestone" />
        <KpiTile
          statKey="streak"
          value={snapshot.daysToMilestone != null ? `${snapshot.daysToMilestone}d` : "—"}
          label="To milestone"
          sub={snapshot.daysToMilestone != null ? "days remaining" : "Milestone reached"}
        />
      </View>

      {snapshot.insights.length > 0 ? (
        <View style={styles.insightsBlock}>
          <SectionHeader title="Insights" />
          {snapshot.insights.map((line) => (
            <InsightRow key={line} text={line} />
          ))}
        </View>
      ) : null}

      {snapshot.recentMisses.length > 0 ? (
        <View style={[styles.panel, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <SectionHeader title="Recent misses" subtitle="Sessions to make up or discuss with your instructor" />
          {snapshot.recentMisses.map((record) => (
            <MissRow key={record.id} record={record} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function MetaPill({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  color: string
}) {
  const type = useNativeType()
  return (
    <View style={[styles.metaPill, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[type.footnote, { color, fontWeight: "700" }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: { flex: 1, gap: 4 },
  heroPctRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  heroPct: { fontSize: 36, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] },
  bandChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bandDot: { width: 8, height: 8, borderRadius: 4 },
  ringOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sectionHead: { paddingHorizontal: 2 },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiTile: {
    borderRadius: 14,
    padding: 12,
    gap: 6,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  kpiValue: { fontSize: 20, lineHeight: 24, fontVariant: ["tabular-nums"] },
  kpiLabel: { fontWeight: "700", textAlign: "center" },
  panel: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  insightsBlock: { gap: 8 },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  insightCopy: { flex: 1, lineHeight: 18 },
  missRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  missDot: { width: 8, height: 8, borderRadius: 4 },
  missCopy: { flex: 1, gap: 2 },
})
