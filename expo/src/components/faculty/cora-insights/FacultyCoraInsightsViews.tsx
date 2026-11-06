import { useMemo } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { COLOR_HUNT } from "../../../lib/flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "../../../lib/codebench-badge-theme"
import {
  CORA_HEAT_DAYS,
  CORA_INSIGHTS_DEPENDENCE_COPY,
  CORA_INSIGHTS_HEALTH_COLORS,
  CORA_INSIGHTS_HEALTH_LABELS,
  CORA_INSIGHTS_LIVE_FILTERS,
  CORA_INSIGHTS_METRIC_LABELS,
  bucketHourHeat,
  formatCoraInsightsClock,
  formatCoraInsightsDelta,
  formatCoraInsightsKpiValue,
  formatCoraInsightsWhen,
  initialsFromName,
  interventionItems,
  coraInsightsKpiPage,
  studentsNeedingAttention,
  studentsUsingCora,
  riskBadgeTone,
  riskFillColor,
  type CoraInsightsAction,
  type CoraInsightsAssistance,
  type CoraInsightsGaps,
  type CoraInsightsKpi,
  type CoraInsightsLive,
  type CoraInsightsLiveFilter,
  type CoraInsightsMistake,
  type CoraInsightsNeedStudent,
  type CoraInsightsOverview,
  type CoraInsightsPredictions,
  type CoraInsightsStudentProfile,
  type CoraInsightsUsage,
} from "../../../lib/cora-insights-faculty"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { FacultyEmptyState } from "../faculty-shared"
import { MarkdownContentWebView } from "../../course-info/MarkdownContentWebView"
import { CoraChartFrame, CoraHourHeatmap, CoraMixBar, CoraRankedBars } from "../FacultyCoraNativeCharts"

const KPI_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "chatbubble-outline",
  "people-outline",
  "warning-outline",
  "pulse-outline",
  "locate-outline",
  "sparkles-outline",
]

const KPI_COLORS = [
  COLOR_HUNT_COOL.indigo,
  COLOR_HUNT_COOL.cyan,
  COLOR_HUNT.orange,
  COLOR_HUNT_COOL.gold,
  COLOR_HUNT.pink,
  COLOR_HUNT.pinkDeep,
] as const

function toneColor(
  tone: ReturnType<typeof riskBadgeTone>,
  native: { label: string; secondaryLabel: string },
) {
  if (tone === "danger") return COLOR_HUNT.pinkDeep ?? "#BE123C"
  if (tone === "warning") return COLOR_HUNT.orange
  if (tone === "accent") return COLOR_HUNT_COOL.indigo
  return native.secondaryLabel
}

function Card({ children }: { children: React.ReactNode }) {
  const { native } = useModuleTheme()
  return <View style={[styles.card, { backgroundColor: native.secondaryGrouped }]}>{children}</View>
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  const { native, type } = useModuleTheme()
  return (
    <View style={styles.sectionHead}>
      <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
      {hint ? <Text style={[type.caption, { color: native.secondaryLabel }]}>{hint}</Text> : null}
    </View>
  )
}

export function InsightsEmpty({ title, body }: { title: string; body: string }) {
  return <FacultyEmptyState icon="analytics-outline" title={title} body={body} />
}

export function InsightsOverview({
  data,
  onKpi,
  onStudent,
  onOpenHref,
}: {
  data: CoraInsightsOverview | null
  onKpi: (id: string) => void
  onStudent: (student: CoraInsightsNeedStudent) => void
  onOpenHref?: (href?: string | null) => void
}) {
  const { native, type } = useModuleTheme()
  if (!data) {
    return (
      <InsightsEmpty
        title="Not enough data yet"
        body="Cora Insights will fill in as students use Cora in this course."
      />
    )
  }
  const kpis = data.kpis ?? []
  const health = data.health
  return (
    <View style={styles.stack}>
      <View style={[styles.kpiGrid, { backgroundColor: native.secondaryGrouped }]}>
        {kpis.map((kpi, index) => (
          <Pressable
            key={kpi.id}
            onPress={() => onKpi(kpi.id)}
            style={[
              styles.kpiCell,
              { borderColor: native.separator },
              index % 2 === 0 && styles.kpiLeft,
              index < 4 && styles.kpiDivider,
            ]}
          >
            <View style={styles.kpiTop}>
              <Text style={[type.sheetTitle, { color: KPI_COLORS[index % KPI_COLORS.length], fontSize: 26, lineHeight: 30 }]}>
                {formatCoraInsightsKpiValue(kpi.value)}
              </Text>
              <Ionicons name={KPI_ICONS[index] ?? "ellipse-outline"} size={16} color={native.tertiaryLabel} />
            </View>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>
              {CORA_INSIGHTS_METRIC_LABELS[kpi.id] ?? kpi.id}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {formatCoraInsightsDelta(kpi.delta, kpi.sub)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <SectionHead title="Cora Class Summary" />
        {data.summary ? (
          <MarkdownContentWebView markdown={data.summary} variant="embedded" />
        ) : (
          <Text style={[type.body, { color: native.label }]}>No class summary yet for this window.</Text>
        )}
      </Card>

      <Card>
        <SectionHead title="Class Learning Health" />
        {(health?.sample ?? 0) >= 5 && (health?.bands ?? []).length ? (
          <>
            <View style={[styles.healthTrack, { backgroundColor: native.fill }]}>
              {(health?.bands ?? []).map((band) =>
                (band.pct ?? 0) > 0 ? (
                  <View
                    key={band.band}
                    style={{
                      flex: Math.max(band.pct ?? 0, 0),
                      backgroundColor: CORA_INSIGHTS_HEALTH_COLORS[band.band] ?? COLOR_HUNT_COOL.indigo,
                    }}
                  />
                ) : null,
              )}
            </View>
            <View style={styles.healthLegend}>
              {(health?.bands ?? []).map((band) => (
                <Text key={band.band} style={[type.caption, { color: native.secondaryLabel }]}>
                  {CORA_INSIGHTS_HEALTH_LABELS[band.band] ?? band.band} {band.pct ?? 0}%
                </Text>
              ))}
            </View>
          </>
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>
            Not enough scored items yet (need 5+ students with 3+ items).
          </Text>
        )}
      </Card>

      <View>
        <SectionHead title="Students needing attention" />
        <NeedsList rows={data.attentionPreview ?? []} onStudent={onStudent} compact />
      </View>

      <View>
        <SectionHead title="Recommended instructor actions" />
        <ActionList items={data.recommendedActions ?? []} onOpenHref={onOpenHref} />
      </View>
    </View>
  )
}

function NeedsList({
  rows,
  onStudent,
  compact,
  emptyTitle = "No attention flags",
  emptyBody = "No student currently meets the multi-signal attention threshold.",
}: {
  rows: CoraInsightsNeedStudent[]
  onStudent: (student: CoraInsightsNeedStudent) => void
  compact?: boolean
  emptyTitle?: string
  emptyBody?: string
}) {
  const { native, type } = useModuleTheme()
  if (!rows.length) {
    return <InsightsEmpty title={emptyTitle} body={emptyBody} />
  }
  return (
    <View style={styles.stack}>
      {rows.map((student) => {
        const tone = riskBadgeTone(student.risk)
        return (
          <Pressable
            key={student.id}
            onPress={() => onStudent(student)}
            style={[styles.card, { backgroundColor: native.secondaryGrouped }]}
          >
            <View style={styles.needTop}>
              <View style={[styles.avatar, { backgroundColor: `${riskFillColor(student.risk)}22` }]}>
                <Text style={[type.bodyEmphasis, { color: riskFillColor(student.risk) }]}>
                  {initialsFromName(student.name)}
                </Text>
              </View>
              <View style={styles.needCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{student.name}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={compact ? 2 : 4}>
                  {student.primaryConcern}
                </Text>
              </View>
              <View style={[styles.riskPill, { backgroundColor: `${riskFillColor(student.risk)}18` }]}>
                <Text style={[type.caption, { color: toneColor(tone, native), fontWeight: "800" }]}>
                  {String(student.risk ?? "low").toUpperCase()}
                </Text>
              </View>
            </View>
            {student.evidence ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={compact ? 2 : 5}>
                {compact ? String(student.evidence).slice(0, 110) : student.evidence}
              </Text>
            ) : null}
            <Text style={[type.caption, { color: native.tertiaryLabel }]}>
              {student.coraUsage ?? "None"} · {student.trend ?? "unknown"}
              {student.lastActivity ? ` · ${formatCoraInsightsWhen(student.lastActivity)}` : ""}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function InsightsNeeds({
  data,
  onStudent,
}: {
  data: { students?: CoraInsightsNeedStudent[] } | null
  onStudent: (student: CoraInsightsNeedStudent) => void
}) {
  const students = data?.students ?? []
  const bars = useMemo(
    () =>
      [...students]
        .filter((row) => Number(row.coraSessions) > 0)
        .sort((a, b) => Number(b.coraSessions) - Number(a.coraSessions))
        .slice(0, 12)
        .map((row) => ({
          label: row.name,
          count: Number(row.coraSessions ?? 0),
          color: riskFillColor(row.risk),
        })),
    [students],
  )
  return (
    <View style={styles.stack}>
      <NeedsList
        rows={students}
        onStudent={onStudent}
        emptyTitle="No student rows"
        emptyBody="No roster students in this filter window."
      />
      <CoraChartFrame title="Cora sessions by student" subtitle="Who is using Cora the most in this window.">
        {bars.length ? (
          <CoraRankedBars rows={bars} />
        ) : (
          <InsightsEmpty title="No Cora sessions" body="No Cora sessions to rank in this range." />
        )}
      </CoraChartFrame>
    </View>
  )
}

export function InsightsGaps({
  data,
  onConcept,
  onMistake,
}: {
  data: CoraInsightsGaps | null
  onConcept: (concept: string) => void
  onMistake: (mistake: CoraInsightsMistake) => void
}) {
  const { native, type } = useModuleTheme()
  const concepts = data?.concepts ?? []
  const max = Math.max(1, ...concepts.map((row) => row.students ?? 0))
  const detail = data?.conceptDetail
  return (
    <View style={styles.stack}>
      <CoraChartFrame title="Concept difficulty map" subtitle="Tap a concept for the student breakdown.">
        {concepts.length ? (
          <View style={styles.stackTight}>
            {concepts.map((row) => (
              <Pressable key={row.concept} onPress={() => onConcept(row.concept)} style={styles.conceptRow}>
                <Text style={[type.caption, styles.conceptLabel, { color: native.label }]} numberOfLines={1}>
                  {row.concept}
                </Text>
                <View style={[styles.conceptTrack, { backgroundColor: native.fill }]}>
                  <View
                    style={[
                      styles.conceptFill,
                      {
                        width: `${Math.max(8, ((row.students ?? 0) / max) * 100)}%`,
                        backgroundColor: COLOR_HUNT_COOL.indigo,
                      },
                    ]}
                  />
                </View>
                <Text style={[type.caption, { color: native.secondaryLabel, width: 72, textAlign: "right" }]}>
                  {row.students ?? 0} students
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>Not enough data yet.</Text>
        )}
      </CoraChartFrame>

      {detail && !detail.empty ? (
        <Card>
          <SectionHead title={`What students are struggling with — ${detail.concept}`} />
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {detail.students} students · {detail.sessions} sessions
            {detail.successAfter != null ? ` · ${detail.successAfter}% after Cora` : ""}
            {detail.independentSuccess != null ? ` · ${detail.independentSuccess}% independent later` : ""}
          </Text>
          {(detail.struggles ?? []).map((row) => (
            <View key={row.label} style={styles.listLine}>
              <Text style={[type.body, { color: native.label, flex: 1 }]}>{row.label}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>{row.students} students</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <CoraChartFrame title="Topic heatmap">
        {data?.heatmap?.rows?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.heatTable}>
              <View style={styles.heatTableRow}>
                <Text style={[type.caption, styles.heatConcept, { color: native.tertiaryLabel }]}>Concept</Text>
                {(data.heatmap.weeks ?? []).map((week) => (
                  <Text key={week} style={[type.caption, styles.heatWeek, { color: native.tertiaryLabel }]}>
                    {week.slice(5)}
                  </Text>
                ))}
              </View>
              {data.heatmap.rows.map((row) => (
                <View key={row.concept} style={styles.heatTableRow}>
                  <Text style={[type.caption, styles.heatConcept, { color: native.label }]} numberOfLines={1}>
                    {row.concept}
                  </Text>
                  {row.cells.map((cell) => (
                    <View
                      key={cell.week}
                      style={[
                        styles.heatDot,
                        {
                          backgroundColor: COLOR_HUNT_COOL.indigo,
                          opacity: Math.max(0.12, cell.intensity),
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>Not enough weekly concept data yet.</Text>
        )}
      </CoraChartFrame>

      <CoraChartFrame
        title="Common mistakes"
        subtitle="Scanned from actual CodeBench submissions in this range. Tap a row for the student lines."
      >
        {(data?.mistakes ?? []).length ? (
          (data?.mistakes ?? []).map((mistake) => (
            <Pressable key={mistake.id ?? mistake.label} onPress={() => onMistake(mistake)} style={styles.listLine}>
              <Text style={[type.body, { color: native.label, flex: 1 }]}>{mistake.label}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {mistake.students} students · {mistake.occurrences}×
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>
            No missing semicolons or cin/cout operator mixups in this range.
          </Text>
        )}
      </CoraChartFrame>
    </View>
  )
}

export function InsightsUsage({ data }: { data: CoraInsightsUsage | null }) {
  const { native, type } = useModuleTheme()
  const slices = data?.categories?.slices ?? []
  const heat = bucketHourHeat(data?.hourHeat)
  const timeline = (data?.timeline ?? [])
    .filter((row) => (row.interactions ?? 0) > 0 || (row.students ?? 0) > 0)
    .map((row) => ({
      label: row.dateLabel || row.date || "",
      count: row.interactions ?? 0,
    }))
  return (
    <View style={styles.stack}>
      <CoraChartFrame title="How students use Cora" subtitle={data?.categories?.total ? `${data.categories.total} sessions` : undefined}>
        {slices.length ? (
          <CoraMixBar
            unit="sessions"
            slices={slices.map((row) => ({ name: `${row.label} ${row.pct ?? 0}%`, value: row.count }))}
          />
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>No Cora sessions in this range yet.</Text>
        )}
      </CoraChartFrame>
      <CoraChartFrame
        title="Usage over time"
        subtitle={(data?.events ?? []).length ? `Course events: ${(data?.events ?? []).map((row) => row.title).join(" · ")}` : undefined}
      >
        {timeline.length ? (
          <CoraRankedBars rows={timeline} />
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>
            Usage will plot here once students start asking Cora.
          </Text>
        )}
      </CoraChartFrame>
      <CoraChartFrame
        title="Cora activity by time"
        subtitle={
          heat.peak.count > 0
            ? `Central time · Busiest: ${heat.peak.dayLabel} ${heat.peak.bucketLabel} · ${heat.peak.count} sessions`
            : "Central time — when students actually opened Cora."
        }
      >
        {heat.peak.count > 0 ? (
          <CoraHourHeatmap grid={heat.grid} days={CORA_HEAT_DAYS} accent={COLOR_HUNT_COOL.indigo} />
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>No hourly activity in this range.</Text>
        )}
      </CoraChartFrame>
    </View>
  )
}

export function InsightsAssistance({ data }: { data: CoraInsightsAssistance | null }) {
  const { native, type } = useModuleTheme()
  const outcomes = data?.outcomes ?? []
  const usageMode = outcomes.some((row) => row.usageFallback) || Boolean(data?.funnel?.usageFallback)
  const outcomeRows = outcomes.filter((row) => (row.sessions ?? 0) + (row.correct ?? 0) + (row.incorrect ?? 0) > 0)
  const compareRows = (data?.compare ?? []).filter((row) =>
    usageMode ? (row.sessions ?? row.coraAssisted ?? 0) > 0 : row.coraAssisted != null || row.independent != null,
  )
  const weeks = data?.dependence?.weeks ?? []
  const maxWeekN = Math.max(1, ...weeks.map((row) => row.n ?? 0))
  const funnel = data?.funnel
  return (
    <View style={styles.stack}>
      <CoraChartFrame
        title={usageMode ? "Cora help by tool" : "Student outcomes by assistance level"}
        subtitle={
          usageMode
            ? "Session counts from CodeBench and Cora tools in this range. Graded correct/incorrect follow-up is not recorded yet."
            : undefined
        }
      >
        {outcomeRows.length ? (
          <CoraRankedBars
            rows={outcomeRows.map((row) => ({
              label: row.bucket,
              count: usageMode ? row.sessions ?? 0 : (row.correct ?? 0) + (row.incorrect ?? 0),
            }))}
          />
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>No Cora assistance sessions in this range.</Text>
        )}
      </CoraChartFrame>

      <Card>
        <SectionHead title="Assistance → outcome funnel" />
        {funnel?.asked ? (
          <View style={styles.stackTight}>
            <Text style={[type.body, { color: native.label }]}>Asked Cora — {funnel.asked}</Text>
            <Text style={[type.body, { color: native.label }]}>
              {usageMode ? "Debugging & error help" : "Received guidance"} — {funnel.guided}
            </Text>
            <Text style={[type.body, { color: native.label }]}>
              {usageMode ? "Analysis & planning sessions" : "Retried question"} — {funnel.retried}
            </Text>
            <Text style={[type.body, { color: native.label }]}>
              {usageMode ? "CodeBench submissions" : "Solved question"} — {funnel.solved}
            </Text>
            {funnel.independent ? (
              <Text style={[type.body, { color: native.label }]}>Solved related independently — {funnel.independent}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>No Cora sessions in this range.</Text>
        )}
      </Card>

      {usageMode ? null : (
        <CoraChartFrame title="Cora-assisted vs independent" subtitle="Observational comparison — not a causal claim.">
          {compareRows.length ? (
            <CoraRankedBars
              rows={compareRows.map((row) => ({
                label: row.concept,
                count: Number(row.coraAssisted ?? row.sessions ?? 0),
              }))}
            />
          ) : (
            <Text style={[type.body, { color: native.secondaryLabel }]}>No topic-level Cora sessions in this range.</Text>
          )}
        </CoraChartFrame>
      )}

      <Card>
        <SectionHead title={usageMode ? "Weekly Cora activity" : "Assistance need trend"} />
        <Text style={[type.bodyEmphasis, { color: native.label }]}>
          {CORA_INSIGHTS_DEPENDENCE_COPY[data?.dependence?.label ?? ""] ?? "Insufficient Evidence"}
        </Text>
        {data?.dependence?.note ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{data.dependence.note}</Text>
        ) : null}
        {weeks.length ? (
          <CoraRankedBars
            rows={weeks.map((row) => ({
              label: row.week,
              count: usageMode ? row.n ?? 0 : Math.round(((row.depth ?? 0) / 5) * maxWeekN) || row.depth || 0,
            }))}
          />
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>No weekly Cora activity in this range.</Text>
        )}
      </Card>

      <Card>
        <SectionHead title="Assessment integrity" />
        {(data?.integrity ?? []).length ? (
          (data?.integrity ?? []).map((row) => (
            <View key={`${row.assessmentId}-${row.type}`} style={styles.stackTight}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>
                {row.type} {row.assessmentId ? `#${row.assessmentId}` : ""}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {row.requests} requests · {row.hints} hints · {row.concepts} explanations · {row.seeking} answer-seeking ·{" "}
                {row.blocked} protected
                {row.solvedPct != null ? ` · ${row.solvedPct}% subsequently solved` : ""}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>No Ask Cora assessment events in this window.</Text>
        )}
      </Card>
    </View>
  )
}

export function InsightsLive({
  data,
  liveFilter,
  onFilter,
  onStudent,
}: {
  data: CoraInsightsLive | null
  liveFilter: CoraInsightsLiveFilter
  onFilter: (value: CoraInsightsLiveFilter) => void
  onStudent: (student: CoraInsightsNeedStudent) => void
}) {
  const { native, type } = useModuleTheme()
  const events = (data?.events ?? []).filter((row) => liveFilter === "all" || row.kind === liveFilter)
  return (
    <View style={styles.stack}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CORA_INSIGHTS_LIVE_FILTERS.map((filter) => {
          const active = liveFilter === filter.id
          return (
            <Pressable
              key={filter.id}
              onPress={() => onFilter(filter.id)}
              style={[styles.chip, { backgroundColor: active ? native.fill : native.secondaryGrouped }]}
            >
              <Text style={[type.caption, { color: active ? native.label : native.secondaryLabel, fontWeight: "700" }]}>
                {filter.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <CoraChartFrame title="Live feed" subtitle={`Last 24 hours · ${events.length} ${events.length === 1 ? "event" : "events"}`}>
        {events.length ? (
          events.map((event, index) => (
            <Pressable
              key={`${event.at}-${index}`}
              onPress={() =>
                event.studentId
                  ? onStudent({ id: event.studentId, name: event.student ?? "Student" })
                  : undefined
              }
              style={styles.listLine}
            >
              <View style={styles.needCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{event.student}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>{event.concept || event.summary}</Text>
              </View>
              <View>
                <Text style={[type.caption, { color: native.tertiaryLabel, textAlign: "right" }]}>
                  {formatCoraInsightsClock(event.at)}
                </Text>
                <Text style={[type.caption, { color: native.tertiaryLabel, textAlign: "right" }]}>
                  {CORA_INSIGHTS_LIVE_FILTERS.find((row) => row.id === event.kind)?.label ?? "Cora"}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <InsightsEmpty title="No matching activity" body="Nothing in the last 24 hours for this filter." />
        )}
      </CoraChartFrame>

      <CoraChartFrame title="Hot topics" subtitle="Last 24 hours vs prior day">
        {(data?.hotTopics ?? []).length ? (
          (data?.hotTopics ?? []).map((topic) => (
            <View key={topic.concept} style={styles.listLine}>
              <View style={styles.needCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{topic.concept}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  {topic.requests} {topic.requests === 1 ? "request" : "requests"}
                </Text>
              </View>
              <Text style={[type.caption, { color: (topic.change ?? 0) > 0 ? COLOR_HUNT_COOL.indigo : native.secondaryLabel, fontWeight: "700" }]}>
                {(topic.change ?? 0) > 0 ? "+" : ""}
                {topic.change ?? 0}%
              </Text>
            </View>
          ))
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>
            Topics appear when Cora use concentrates over the last day.
          </Text>
        )}
      </CoraChartFrame>

      <CoraChartFrame title="Difficulty spikes" subtitle="5+ students on one concept · last 45 min">
        {(data?.spikes ?? []).length ? (
          (data?.spikes ?? []).map((spike) => (
            <View key={spike.concept} style={styles.stackTight}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>{spike.concept}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>{spike.message}</Text>
            </View>
          ))
        ) : (
          <Text style={[type.body, { color: native.secondaryLabel }]}>
            A spike appears when five or more students hit the same concept in 45 minutes.
          </Text>
        )}
      </CoraChartFrame>
    </View>
  )
}

export function InsightsPredictions({
  data,
  onStudent,
}: {
  data: CoraInsightsPredictions | null
  onStudent: (student: CoraInsightsNeedStudent) => void
}) {
  const { native, type } = useModuleTheme()
  const rows = data?.predictions ?? []
  return (
    <View style={styles.stack}>
      {data?.disclaimer ? <Text style={[type.caption, { color: native.secondaryLabel }]}>{data.disclaimer}</Text> : null}
      {rows.length ? (
        rows.map((row) => (
          <Pressable
            key={row.studentId}
            onPress={() => onStudent({ id: row.studentId, name: row.name, risk: row.level })}
            style={[styles.card, { backgroundColor: native.secondaryGrouped }]}
          >
            <Text style={[type.bodyEmphasis, { color: native.label }]}>{row.name}</Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {row.prediction}: {String(row.level ?? "").toUpperCase()}
              {row.ready && row.confidence != null ? ` · Confidence ${row.confidence}%` : ""}
            </Text>
            {row.ready ? (
              (row.evidence ?? []).map((item) => (
                <Text key={item} style={[type.body, { color: native.label }]}>
                  • {item}
                </Text>
              ))
            ) : (
              <Text style={[type.body, { color: native.secondaryLabel }]}>{row.note}</Text>
            )}
            {row.ready && row.action ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Recommended: {row.action}</Text>
            ) : null}
          </Pressable>
        ))
      ) : (
        <InsightsEmpty
          title="No validated predictions"
          body="Predictions appear only when multiple measurable features are present. We will not invent a forecast."
        />
      )}
    </View>
  )
}

export function ActionList({
  items,
  onOpenHref,
}: {
  items: CoraInsightsAction[]
  onOpenHref?: (href?: string | null) => void
}) {
  const { native, type } = useModuleTheme()
  if (!items.length) {
    return (
      <InsightsEmpty
        title="No actions yet"
        body="Recommendations appear when concepts or students cross evidence thresholds."
      />
    )
  }
  return (
    <View style={styles.stack}>
      {items.map((item, index) => (
        <Pressable
          key={item.id ?? `${item.title}-${index}`}
          onPress={() => onOpenHref?.(item.href)}
          style={[styles.card, styles.actionRow, { backgroundColor: native.secondaryGrouped }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: native.fill }]}>
            <Ionicons name="sparkles-outline" size={16} color={COLOR_HUNT_COOL.indigo} />
          </View>
          <View style={styles.needCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>{item.title}</Text>
            {item.detail ? <Text style={[type.caption, { color: native.secondaryLabel }]}>{item.detail}</Text> : null}
          </View>
          <Text style={[type.caption, { color: COLOR_HUNT_COOL.indigo, fontWeight: "800" }]}>{item.cta ?? "Open"}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export function InsightsInterventions({
  data,
  onOpenHref,
}: {
  data: unknown
  onOpenHref?: (href?: string | null) => void
}) {
  return (
    <View style={styles.stack}>
      <SectionHead title="Recommended instructor actions" />
      <ActionList items={interventionItems(data)} onOpenHref={onOpenHref} />
    </View>
  )
}

export function InsightsStudentSheet({
  visible,
  loading,
  profile,
  seed,
  assigning,
  onClose,
  onAssign,
  onOpenRecord,
}: {
  visible: boolean
  loading: boolean
  profile: CoraInsightsStudentProfile | null
  seed: CoraInsightsNeedStudent | null
  assigning: boolean
  onClose: () => void
  onAssign: () => void
  onOpenRecord: () => void
}) {
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const student = profile?.student ?? seed
  const risk = String(student?.risk ?? "low")
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: native.groupedBackground, paddingTop: 18, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHead}>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>CORA INSIGHTS</Text>
          <Text style={[type.sheetTitle, { color: native.label }]}>Student profile</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            How this student is using Cora and where they may need support.
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          {student ? (
            <Card>
              <View style={styles.needTop}>
                <View style={[styles.avatar, { backgroundColor: `${riskFillColor(risk)}22` }]}>
                  <Text style={[type.bodyEmphasis, { color: riskFillColor(risk) }]}>{initialsFromName(student.name)}</Text>
                </View>
                <View style={styles.needCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>{student.name}</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    {[student.code, student.section].filter(Boolean).join(" · ") || "Enrolled student"}
                  </Text>
                </View>
                <View style={[styles.riskPill, { backgroundColor: `${riskFillColor(risk)}18` }]}>
                  <Text style={[type.caption, { color: riskFillColor(risk), fontWeight: "800" }]}>{risk.toUpperCase()}</Text>
                </View>
              </View>
              {student.primaryConcern ? (
                <MarkdownContentWebView markdown={student.primaryConcern} variant="embedded" />
              ) : null}
              {student.evidence ? (
                <MarkdownContentWebView markdown={student.evidence} variant="embedded" />
              ) : null}
              <View style={styles.statGrid}>
                <View style={[styles.stat, { borderColor: native.separator }]}>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>Cora sessions</Text>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>{student.coraSessions ?? "—"}</Text>
                </View>
                <View style={[styles.stat, { borderColor: native.separator }]}>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>Usage</Text>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>{student.coraUsage ?? "—"}</Text>
                </View>
                <View style={[styles.stat, { borderColor: native.separator }]}>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>Performance</Text>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>
                    {student.performance != null ? `${student.performance}%` : "—"}
                  </Text>
                </View>
                <View style={[styles.stat, { borderColor: native.separator }]}>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>Last activity</Text>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>
                    {formatCoraInsightsWhen(student.lastActivity, false)}
                  </Text>
                </View>
              </View>
            </Card>
          ) : loading ? (
            <Text style={[type.body, { color: native.secondaryLabel }]}>Loading profile…</Text>
          ) : (
            <Text style={[type.body, { color: native.secondaryLabel }]}>Not enough data yet for this student.</Text>
          )}

          <SectionHead title="Cora topics" />
          {(profile?.concepts ?? []).length ? (
            <Card>
              {(profile?.concepts ?? []).map((row) => (
                <View key={row.concept} style={styles.listLine}>
                  <View style={styles.needCopy}>
                    <Text style={[type.bodyEmphasis, { color: native.label }]}>{row.concept}</Text>
                    <Text style={[type.caption, { color: native.secondaryLabel }]}>
                      {row.requests} request{row.requests === 1 ? "" : "s"}
                      {row.successAfter != null ? ` · ${row.successAfter}% after help` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Text style={[type.body, { color: native.secondaryLabel }]}>No topic breakdown in this range yet.</Text>
          )}

          <SectionHead title="Recent Cora activity" />
          {(profile?.recent ?? []).length ? (
            <Card>
              {(profile?.recent ?? []).slice(0, 8).map((row, index) => (
                <View key={`${row.at}-${index}`} style={styles.stackTight}>
                  <Text style={[type.body, { color: native.label }]}>{row.summary}</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>{formatCoraInsightsWhen(row.at)}</Text>
                </View>
              ))}
            </Card>
          ) : (profile?.timeline ?? []).length ? (
            <Card>
              {(profile?.timeline ?? []).map((row) => (
                <View key={row.week} style={styles.stackTight}>
                  <Text style={[type.body, { color: native.label }]}>{row.label}</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    Week of {row.week} · {row.requests} requests
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <Text style={[type.body, { color: native.secondaryLabel }]}>No recent Cora activity in this range.</Text>
          )}
        </ScrollView>
        <View style={styles.sheetActions}>
          <Pressable onPress={onAssign} style={[styles.cta, { backgroundColor: COLOR_HUNT_COOL.indigo }]}>
            <Text style={styles.ctaText}>{assigning ? "Assigning…" : "Assign targeted practice"}</Text>
          </Pressable>
          <Pressable onPress={onOpenRecord} style={[styles.quiet, { backgroundColor: native.fill }]}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Open student record</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.quiet}>
            <Text style={[type.body, { color: native.secondaryLabel }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

export function InsightsMistakeSheet({
  mistake,
  onClose,
}: {
  mistake: CoraInsightsMistake | null
  onClose: () => void
}) {
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={Boolean(mistake)} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose}>
        <Pressable style={[styles.dialog, { backgroundColor: native.groupedBackground, paddingBottom: insets.bottom + 16 }]} onPress={() => undefined}>
          <Text style={[type.sheetTitle, { color: native.label }]}>{mistake?.label}</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {mistake?.detail} {mistake ? `${mistake.students} students · ${mistake.occurrences} submissions.` : ""}
          </Text>
          <ScrollView style={styles.dialogList}>
            {(mistake?.examples ?? []).map((example, index) => (
              <View key={`${example.submissionId}-${example.line}-${index}`} style={[styles.card, { backgroundColor: native.secondaryGrouped }]}>
                <View style={styles.listLine}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>{example.studentName}</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>Line {example.line}</Text>
                </View>
                <Text style={[type.caption, styles.mono, { color: native.label }]}>{example.snippet}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={[styles.quiet, { backgroundColor: native.fill }]}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function InsightsKpiDetail({
  kpiId,
  kpi,
  rangeLabel,
  loading,
  needs,
  live,
  assistance,
  onStudent,
}: {
  kpiId: string
  kpi?: CoraInsightsKpi | null
  rangeLabel: string
  loading: boolean
  needs: { students?: CoraInsightsNeedStudent[] } | null
  live: CoraInsightsLive | null
  assistance: CoraInsightsAssistance | null
  onStudent: (student: CoraInsightsNeedStudent) => void
}) {
  const { native, type } = useModuleTheme()
  const page = coraInsightsKpiPage(kpiId)
  const active = studentsUsingCora(needs?.students)
  const attention = studentsNeedingAttention(needs?.students)
  const events = live?.events ?? []
  const integrity = assistance?.integrity ?? []
  const blocked = integrity.reduce((sum, row) => sum + (row.blocked ?? 0), 0)

  if (loading) {
    return (
      <View style={styles.stack}>
        <Text style={[type.body, { color: native.secondaryLabel }]}>Loading {page?.title ?? "details"}…</Text>
      </View>
    )
  }

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={[type.sheetTitle, { color: native.label, fontSize: 32, lineHeight: 36 }]}>
          {formatCoraInsightsKpiValue(kpi?.value)}
        </Text>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>
          {page?.title ?? CORA_INSIGHTS_METRIC_LABELS[kpiId] ?? kpiId}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          {formatCoraInsightsDelta(kpi?.delta, kpi?.sub) || page?.subtitle}
        </Text>
        <Text style={[type.caption, { color: native.tertiaryLabel }]}>{rangeLabel}</Text>
      </Card>

      {kpiId === "cora_sessions" ? (
        <>
          <CoraChartFrame title="Sessions by student" subtitle="Tap a student to open their Cora profile.">
            {active.length ? (
              <CoraRankedBars
                rows={active.map((row) => ({
                  label: row.name,
                  count: Number(row.coraSessions ?? 0),
                  color: riskFillColor(row.risk),
                }))}
              />
            ) : (
              <InsightsEmpty title="No Cora sessions" body="No student opened Cora in this window." />
            )}
          </CoraChartFrame>
          <NeedsList
            rows={active}
            onStudent={onStudent}
            emptyTitle="No Cora sessions"
            emptyBody="No student opened Cora in this window."
          />
          <CoraChartFrame title="Recent sessions" subtitle="Live Cora activity from the last 24 hours.">
            {events.length ? (
              events.map((event, index) => (
                <Pressable
                  key={`${event.at}-${index}`}
                  onPress={() =>
                    event.studentId
                      ? onStudent({ id: event.studentId, name: event.student ?? "Student" })
                      : undefined
                  }
                  style={styles.listLine}
                >
                  <View style={styles.needCopy}>
                    <Text style={[type.bodyEmphasis, { color: native.label }]}>{event.student}</Text>
                    <Text style={[type.caption, { color: native.secondaryLabel }]}>
                      {event.concept || event.summary}
                    </Text>
                  </View>
                  <Text style={[type.caption, { color: native.tertiaryLabel }]}>{formatCoraInsightsClock(event.at)}</Text>
                </Pressable>
              ))
            ) : (
              <InsightsEmpty title="No recent sessions" body="Nothing in the last 24 hours." />
            )}
          </CoraChartFrame>
        </>
      ) : null}

      {kpiId === "active_students" || kpiId === "avg_requests" ? (
        <NeedsList
          rows={active}
          onStudent={onStudent}
          emptyTitle="No active students"
          emptyBody="No roster student used Cora in this window."
        />
      ) : null}

      {kpiId === "students_needing_attention" ? (
        <NeedsList rows={attention} onStudent={onStudent} />
      ) : null}

      {kpiId === "assisted_success" ? <InsightsAssistance data={assistance} /> : null}

      {kpiId === "answers_blocked" ? (
        <Card>
          <SectionHead title="Assessment integrity" />
          <Text style={[type.bodyEmphasis, { color: native.label }]}>
            {blocked} answer-seeking request{blocked === 1 ? "" : "s"} blocked
          </Text>
          {integrity.length ? (
            integrity.map((row) => (
              <View key={`${row.assessmentId}-${row.type}`} style={styles.stackTight}>
                <Text style={[type.body, { color: native.label }]}>
                  {row.type} {row.assessmentId ? `#${row.assessmentId}` : ""}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  {row.requests} requests · {row.seeking} answer-seeking · {row.blocked} protected
                </Text>
              </View>
            ))
          ) : (
            <Text style={[type.body, { color: native.secondaryLabel }]}>
              No Ask Cora assessment events in this window.
            </Text>
          )}
        </Card>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  stackTight: { gap: 8 },
  card: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  sectionHead: { gap: 4 },
  kpiGrid: { borderRadius: 16, overflow: "hidden", flexDirection: "row", flexWrap: "wrap" },
  kpiCell: { width: "50%", paddingHorizontal: 14, paddingVertical: 16, gap: 4 },
  kpiLeft: { borderRightWidth: StyleSheet.hairlineWidth },
  kpiDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  kpiTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  healthTrack: { height: 12, borderRadius: 999, overflow: "hidden", flexDirection: "row" },
  healthLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  needTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  needCopy: { flex: 1, minWidth: 0, gap: 2 },
  riskPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  conceptRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  conceptLabel: { width: 92, fontWeight: "700" },
  conceptTrack: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  conceptFill: { height: "100%", borderRadius: 5 },
  listLine: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  actionRow: { flexDirection: "row", alignItems: "center" },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  heatTable: { gap: 8, paddingRight: 8 },
  heatTableRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heatConcept: { width: 88, fontWeight: "700" },
  heatWeek: { width: 28, textAlign: "center" },
  heatDot: { width: 20, height: 20, borderRadius: 4 },
  sheet: { flex: 1, paddingHorizontal: 16 },
  sheetHead: { gap: 4, marginBottom: 12 },
  sheetBody: { gap: 14, paddingBottom: 24 },
  sheetActions: { gap: 8, paddingTop: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { width: "47%", borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, gap: 4 },
  cta: { borderRadius: 12, alignItems: "center", paddingVertical: 13 },
  ctaText: { color: "#fff", fontWeight: "800" },
  quiet: { borderRadius: 12, alignItems: "center", paddingVertical: 12 },
  dim: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  dialog: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, gap: 12, maxHeight: "78%" },
  dialogList: { maxHeight: 320 },
  mono: { fontFamily: "Menlo", fontSize: 12 },
})
