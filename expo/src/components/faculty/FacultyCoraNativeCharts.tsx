import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { COLOR_HUNT } from "../../lib/flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "../../lib/codebench-badge-theme"

const MIX_COLORS = [
  COLOR_HUNT_COOL.cyan,
  COLOR_HUNT_COOL.indigo,
  COLOR_HUNT.orange,
  COLOR_HUNT.pink,
] as const

const HOURLY_H = 132

export function CoraChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const { native, type } = useModuleTheme()
  return (
    <View style={[styles.frame, { backgroundColor: native.secondaryGrouped }]}>
      <View style={styles.frameHead}>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  )
}

export function CoraHourlyBars({
  data,
}: {
  data: Array<{ hour: number; question_count: number }>
}) {
  const { native, type } = useModuleTheme()
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    question_count: Number(data.find((row) => Number(row.hour) === hour)?.question_count ?? 0),
  }))
  const maxVal = Math.max(1, ...hours.map((row) => row.question_count))
  const ticks = [0, 6, 12, 18, 23]

  return (
    <View style={styles.hourlyWrap}>
      <View style={styles.hourlyBars}>
        {hours.map((row) => {
          const pct = row.question_count / maxVal
          const isPeak = row.question_count === maxVal && row.question_count > 0
          return (
            <View key={row.hour} style={styles.hourlyCol}>
              <View
                style={[
                  styles.hourlyBar,
                  {
                    height: row.question_count > 0 ? Math.max(6, pct * HOURLY_H) : 0,
                    backgroundColor: isPeak ? COLOR_HUNT_COOL.cyan : COLOR_HUNT_COOL.indigo,
                  },
                ]}
              />
            </View>
          )
        })}
      </View>
      <View style={styles.hourlyTicks}>
        {ticks.map((hour) => (
          <Text key={hour} style={[type.caption, styles.tick, { color: native.secondaryLabel }]}>
            {hour}:00
          </Text>
        ))}
      </View>
    </View>
  )
}

export function CoraWeekBars({
  data,
}: {
  data: Array<{ day_name: string; question_count: number }>
}) {
  const { native, type } = useModuleTheme()
  const maxVal = Math.max(1, ...data.map((row) => row.question_count))

  return (
    <View style={styles.weekWrap}>
      {data.map((row) => {
        const pct = row.question_count / maxVal
        return (
          <View key={row.day_name} style={styles.weekCol}>
            <Text style={[type.caption, styles.weekVal, { color: native.secondaryLabel }]}>
              {row.question_count > 0 ? row.question_count : ""}
            </Text>
            <View style={[styles.weekTrack, { backgroundColor: native.fill }]}>
              <View
                style={[
                  styles.weekFill,
                  {
                    height: row.question_count > 0 ? Math.max(8, pct * 88) : 0,
                    backgroundColor: COLOR_HUNT_COOL.indigo,
                  },
                ]}
              />
            </View>
            <Text style={[type.caption, styles.weekLabel, { color: native.secondaryLabel }]}>
              {row.day_name.slice(0, 3)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export function CoraRankedBars({
  rows,
}: {
  rows: Array<{ label: string; count: number; color?: string }>
}) {
  const { native, type } = useModuleTheme()
  const maxVal = Math.max(1, ...rows.map((row) => row.count))

  return (
    <View style={styles.rankList}>
      {rows.slice(0, 8).map((row, index) => (
        <View key={`${row.label}-${index}`} style={styles.rankRow}>
          <Text style={[type.caption, styles.rankLabel, { color: native.label }]} numberOfLines={1}>
            {row.label}
          </Text>
          <View style={[styles.rankTrack, { backgroundColor: native.fill }]}>
            <View
              style={[
                styles.rankFill,
                {
                  width: `${Math.max(row.count > 0 ? 8 : 0, (row.count / maxVal) * 100)}%`,
                  backgroundColor: row.color ?? MIX_COLORS[index % MIX_COLORS.length],
                },
              ]}
            />
          </View>
          <Text style={[type.caption, styles.rankValue, { color: native.secondaryLabel }]}>{row.count}</Text>
        </View>
      ))}
    </View>
  )
}

export function CoraHourHeatmap({
  grid,
  days,
  accent,
}: {
  grid: number[][]
  days: readonly string[]
  accent: string
}) {
  const { native, type } = useModuleTheme()
  const buckets = ["12–4a", "4–8a", "8a–12p", "12–4p", "4–8p", "8p–12a"]
  const maxH = Math.max(1, ...grid.flat())

  return (
    <View style={styles.heatWrap}>
      <View style={styles.heatHead}>
        <View style={styles.heatDayGutter} />
        {buckets.map((label) => (
          <Text key={label} style={[type.caption, styles.heatHeadLabel, { color: native.tertiaryLabel }]}>
            {label}
          </Text>
        ))}
      </View>
      {days.map((day, dow) => (
        <View key={day} style={styles.heatRow}>
          <Text style={[type.caption, styles.heatDay, { color: native.secondaryLabel }]}>{day}</Text>
          {(grid[dow] ?? []).map((value, index) => {
            const intensity = value / maxH
            return (
              <View
                key={`${day}-${index}`}
                style={[
                  styles.heatCell,
                  {
                    backgroundColor: value > 0 ? accent : native.fill,
                    opacity: value > 0 ? Math.max(0.28, intensity) : 1,
                  },
                ]}
              >
                {value > 0 ? (
                  <Text style={[type.caption, styles.heatVal, { color: native.label }]}>{value}</Text>
                ) : null}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

export function CoraMixBar({
  slices,
  unit = "students in mix",
}: {
  slices: Array<{ name: string; value: number }>
  unit?: string
}) {
  const { native, type } = useModuleTheme()
  const total = slices.reduce((sum, row) => sum + row.value, 0)
  const shown = slices.filter((row) => row.value > 0)

  return (
    <View style={styles.mixWrap}>
      <View style={[styles.mixTrack, { backgroundColor: native.fill }]}>
        {(shown.length ? shown : slices).map((row, index) => (
          <View
            key={row.name}
            style={{
              flex: Math.max(row.value, 0.0001),
              backgroundColor: MIX_COLORS[index % MIX_COLORS.length],
            }}
          />
        ))}
      </View>
      <View style={styles.mixLegend}>
        {slices.map((row, index) => (
          <View key={row.name} style={styles.mixItem}>
            <View style={[styles.mixDot, { backgroundColor: MIX_COLORS[index % MIX_COLORS.length] }]} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {row.name} · {row.value}
            </Text>
          </View>
        ))}
      </View>
      {total > 0 ? (
        <Text style={[type.caption, { color: native.tertiaryLabel }]}>{total} {unit}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  frameHead: { gap: 4 },
  hourlyWrap: { gap: 8 },
  hourlyBars: {
    height: HOURLY_H,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    paddingTop: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.28)",
  },
  hourlyCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  hourlyBar: { width: "100%", borderRadius: 3, minHeight: 0 },
  hourlyTicks: { flexDirection: "row", justifyContent: "space-between" },
  tick: { fontSize: 11, fontWeight: "600" },
  weekWrap: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 128 },
  weekCol: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  weekVal: { fontSize: 10, fontWeight: "700" },
  weekTrack: { width: "70%", height: 88, borderRadius: 6, overflow: "hidden", justifyContent: "flex-end" },
  weekFill: { width: "100%", borderRadius: 6 },
  weekLabel: { fontSize: 11, fontWeight: "600" },
  rankList: { gap: 12 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankLabel: { width: 104, fontWeight: "600" },
  rankTrack: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  rankFill: { height: "100%", borderRadius: 6 },
  rankValue: { width: 32, textAlign: "right", fontWeight: "700" },
  mixWrap: { gap: 12 },
  mixTrack: { height: 14, borderRadius: 7, overflow: "hidden", flexDirection: "row" },
  mixLegend: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  mixItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  mixDot: { width: 8, height: 8, borderRadius: 2 },
  heatWrap: { gap: 6 },
  heatHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  heatHeadLabel: { flex: 1, fontSize: 9, fontWeight: "700", textAlign: "center" },
  heatDayGutter: { width: 28 },
  heatRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heatDay: { width: 28, fontSize: 11, fontWeight: "700" },
  heatCell: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  heatVal: { fontSize: 10, fontWeight: "700" },
})
