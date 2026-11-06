import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"
import {
  fetchInstitutionAnalyticsSection,
  fetchInstitutionMe,
  INSTITUTION_ANALYTICS_SECTIONS,
  type InstitutionAnalyticsSection,
} from "../../lib/institution-api"
import { ApiError } from "../../lib/api"
import {
  InstitutionBarChart,
  InstitutionFunnelChart,
  InstitutionLineChart,
  InstitutionMixChart,
} from "./institution-analytics-charts"

type MetricCard = { label: string; value: string; sub?: string; pending?: boolean }

type NamedCount = { name?: string; label?: string; key?: string; value: number }

function metricValue(raw: unknown): string {
  if (raw == null) return "—"
  if (typeof raw === "number") return raw.toLocaleString()
  return String(raw)
}

function extractOverviewCards(payload: Record<string, unknown>): MetricCard[] {
  const tab = payload.overview as Record<string, unknown> | undefined
  const overview = tab?.overview as Record<string, unknown> | undefined
  const kpis = (overview?.kpis ?? {}) as Record<string, Record<string, unknown>>
  const keys = [
    ["studentsCovered", "Students covered"],
    ["activeStudents", "Active students"],
    ["aiAssistedStudents", "AI assisted students"],
    ["practiceAttempts", "Practice attempts"],
    ["assessmentsSubmitted", "Assessments submitted"],
    ["studentsNeedingAttention", "Needs attention"],
  ] as const
  return keys.map(([key, label]) => {
    const m = kpis[key]
    const insufficient = Boolean(m?.insufficientData)
    return {
      label,
      value: insufficient ? "Insufficient data" : metricValue(m?.value),
      sub: insufficient ? String(m?.unavailableReason ?? "") : undefined,
      pending: insufficient,
    }
  })
}

function extractDataQuality(payload: Record<string, unknown>): Array<{ label: string; percent: string; note: string }> {
  const tab = payload.data_quality as Record<string, unknown> | undefined
  const dq = tab?.data_quality as { coverages?: Array<{ label: string; percent: number | null; note: string }> } | undefined
  return (dq?.coverages ?? []).map((row) => ({
    label: row.label,
    percent: row.percent != null ? `${row.percent}%` : "—",
    note: row.note,
  }))
}

function extractAiAssistance(payload: Record<string, unknown>): MetricCard[] {
  const tab = payload.cora as Record<string, unknown> | undefined
  const cora = tab?.cora as Record<string, unknown> | undefined
  const assist = cora?.assistance as Record<string, unknown> | undefined
  const link = cora?.linkage as Record<string, unknown> | undefined
  const classified = cora?.classified as { available?: boolean; interactions?: number } | undefined
  return [
    { label: "Cora sessions", value: metricValue(assist?.sessions) },
    { label: "Student users", value: metricValue(assist?.studentUsers) },
    {
      label: "Practice follow-through (24h)",
      value: link?.practiceFollow24hRate != null ? `${link.practiceFollow24hRate}%` : "Insufficient data",
      pending: link?.practiceFollow24hRate == null,
    },
    {
      label: "Classified interactions",
      value: classified?.available ? metricValue(classified.interactions) : "Insufficient data",
      sub: classified?.available ? "Inferred taxonomy" : "Need ≥10 classified turns",
      pending: !classified?.available,
    },
  ]
}

function extractFeedbackCards(payload: Record<string, unknown>): MetricCard[] {
  const tab = payload.feedback as Record<string, unknown> | undefined
  const fb = tab?.feedback as Record<string, unknown> | undefined
  return [
    { label: "Feedback events", value: metricValue(fb?.feedbackEvents) },
    { label: "AI graded", value: metricValue(fb?.automatedFeedback) },
    { label: "Retry after feedback", value: metricValue(fb?.followedByRetry) },
    { label: "Improved on retry", value: metricValue(fb?.improvedAfterFeedback) },
  ]
}

function extractInterventionCards(payload: Record<string, unknown>): MetricCard[] {
  const tab = payload.interventions as Record<string, unknown> | undefined
  const iv = tab?.interventions as Record<string, unknown> | undefined
  return [
    { label: "Eligible (flagged)", value: metricValue(iv?.eligible) },
    { label: "Triggered", value: metricValue(iv?.triggered) },
    { label: "Delivered", value: metricValue(iv?.delivered) },
    { label: "Engaged", value: metricValue(iv?.engaged) },
  ]
}

function extractEngagementCards(payload: Record<string, unknown>): MetricCard[] {
  const e = (payload.engagement as Record<string, unknown> | undefined)?.engagement as Record<string, unknown> | undefined
  const wauMau = e?.wauMauRatio as { value?: number | null; insufficientData?: boolean } | undefined
  return [
    { label: "DAU", value: metricValue((e?.dau as { value?: number } | undefined)?.value) },
    { label: "WAU", value: metricValue((e?.wau as { value?: number } | undefined)?.value) },
    { label: "MAU", value: metricValue((e?.mau as { value?: number } | undefined)?.value) },
    {
      label: "WAU/MAU",
      value: wauMau?.value != null ? `${wauMau.value}%` : "Insufficient data",
      pending: Boolean(wauMau?.insufficientData ?? wauMau?.value == null),
    },
  ]
}

function extractLearningCards(payload: Record<string, unknown>): MetricCard[] {
  const l = (payload.learning as Record<string, unknown> | undefined)?.learning as Record<string, unknown> | undefined
  const practice = l?.practice as Record<string, unknown> | undefined
  const prePost = l?.prePostGain as { available?: boolean; pairedN?: number; rawGain?: number | null } | undefined
  return [
    { label: "Practice sessions", value: metricValue(practice?.sessions) },
    {
      label: "First-attempt accuracy",
      value: practice?.firstAttemptAccuracy != null ? `${practice.firstAttemptAccuracy}%` : "Insufficient data",
      pending: practice?.firstAttemptAccuracy == null,
    },
    {
      label: "Pre/post paired N",
      value: prePost?.available ? metricValue(prePost.pairedN) : "Insufficient data",
      sub: prePost?.available && prePost.rawGain != null ? `Raw gain ${prePost.rawGain}` : prePost?.available ? undefined : "Link pre/post quizzes in Research",
      pending: !prePost?.available,
    },
    { label: "Concept topics", value: metricValue((l?.concepts as unknown[] | undefined)?.length ?? 0) },
  ]
}

function extractAssessmentCards(payload: Record<string, unknown>): MetricCard[] {
  const a = (payload.assessments as Record<string, unknown> | undefined)?.assessments as Record<string, unknown> | undefined
  const kpis = (a?.kpis ?? {}) as Record<string, { value?: number; insufficientData?: boolean }>
  return [
    { label: "Completed", value: metricValue(kpis.submissions?.value) },
    { label: "Started", value: metricValue(kpis.started?.value) },
    {
      label: "Average score",
      value: kpis.avgScore?.insufficientData ? "Insufficient data" : metricValue(kpis.avgScore?.value),
      pending: Boolean(kpis.avgScore?.insufficientData),
    },
    { label: "Auto-graded", value: metricValue(kpis.autoGraded?.value) },
  ]
}

function extractCognitiveCards(payload: Record<string, unknown>): MetricCard[] {
  const c = (payload.cognitive as Record<string, unknown> | undefined)?.cognitive as Record<string, unknown> | undefined
  const surveys = c?.surveys as { available?: boolean; instruments?: number; responses?: number } | undefined
  const behavioral = c?.behavioral as { windowN?: number; patterns?: unknown[] } | undefined
  return [
    {
      label: "Survey instruments",
      value: surveys?.available ? metricValue(surveys.instruments) : "Insufficient data",
      sub: surveys?.available ? `${surveys.responses ?? 0} responses` : "Import via Research hub",
      pending: !surveys?.available,
    },
    { label: "Behavioral window N", value: metricValue(behavioral?.windowN) },
    { label: "Behavioral patterns", value: metricValue(behavioral?.patterns?.length ?? 0) },
  ]
}

function extractEquityCards(payload: Record<string, unknown>): MetricCard[] {
  const d = (payload.equity as Record<string, unknown> | undefined)?.equity as Record<string, unknown> | undefined
  if (!d?.available) {
    return [
      {
        label: "Equity subgroups",
        value: "Insufficient data",
        sub: String(d?.unavailableReason ?? "Import authorized attributes in Research"),
        pending: true,
      },
    ]
  }
  return [
    { label: "Attributes imported", value: metricValue(d.attributesImported) },
    { label: "Visible subgroups", value: metricValue((d.outcomeBySubgroup as unknown[] | undefined)?.length ?? 0) },
    { label: "Cell minimum", value: metricValue(d.cellMinimum) },
  ]
}

function extractIndependentCards(payload: Record<string, unknown>): MetricCard[] {
  const ind = (payload.independent as Record<string, unknown> | undefined)?.independent as Record<string, unknown> | undefined
  return [
    { label: "Independent attempts", value: metricValue(ind?.independentAttempts) },
    {
      label: "Independent score",
      value: ind?.independentScore != null ? `${ind.independentScore}%` : "Insufficient data",
      pending: ind?.independentScore == null,
    },
    { label: "Assisted attempts", value: metricValue(ind?.assistedAttempts) },
    {
      label: "Score difference",
      value: ind?.differencePp != null ? `${ind.differencePp} pp` : "—",
      pending: ind?.differencePp == null,
    },
  ]
}

function chartCard(title: string, children: ReactNode, native: ReturnType<typeof useThemedNative>) {
  return (
    <View style={[styles.chartCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <Text style={[styles.chartTitle, { color: native.label }]}>{title}</Text>
      {children}
    </View>
  )
}

function sectionCards(section: InstitutionAnalyticsSection, payload: Record<string, unknown>): MetricCard[] {
  if (section === "overview") return extractOverviewCards(payload)
  if (section === "engagement") return extractEngagementCards(payload)
  if (section === "learning") return extractLearningCards(payload)
  if (section === "ai_assistance") return extractAiAssistance(payload)
  if (section === "independent") return extractIndependentCards(payload)
  if (section === "cognitive") return extractCognitiveCards(payload)
  if (section === "assessment") return extractAssessmentCards(payload)
  if (section === "feedback") return extractFeedbackCards(payload)
  if (section === "interventions") return extractInterventionCards(payload)
  if (section === "equity") return extractEquityCards(payload)
  if (section === "data_quality") {
    return extractDataQuality(payload).map((row) => ({
      label: row.label,
      value: row.percent,
      sub: row.note,
    }))
  }
  return [{ label: "Summary", value: "See charts below", sub: "Open web Research hub for study configuration and exports." }]
}

function namedCounts(rows: NamedCount[] | undefined): Array<{ label: string; value: number }> {
  return (rows ?? []).map((row) => ({
    label: row.name ?? row.label ?? row.key ?? "—",
    value: row.value,
  }))
}

function InstitutionSectionCharts({
  section,
  payload,
}: {
  section: InstitutionAnalyticsSection
  payload: Record<string, unknown>
}) {
  const native = useThemedNative()

  if (section === "overview") {
    const overview = (payload.overview as Record<string, unknown> | undefined)?.overview as Record<string, unknown> | undefined
    const funnel = namedCounts(overview?.adoptionFunnel as NamedCount[] | undefined)
    const prePost = overview?.prePostGain as { available?: boolean; funnel?: NamedCount[] } | undefined
    const prePostSteps = namedCounts(prePost?.funnel)
    if (funnel.length === 0 && prePostSteps.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        {funnel.length > 0 ? chartCard("Adoption funnel", <InstitutionFunnelChart steps={funnel} />, native) : null}
        {prePost?.available && prePostSteps.length > 0
          ? chartCard("Pre/post learning gain", <InstitutionBarChart data={prePostSteps} valueLabel="Score" />, native)
          : null}
      </View>
    )
  }

  if (section === "engagement") {
    const e = (payload.engagement as Record<string, unknown> | undefined)?.engagement as
      | { dailyTrend?: Array<{ label?: string; week?: string; activeUsers?: number; value?: number }>; byDayOfWeek?: NamedCount[] }
      | undefined
    const trend = (e?.dailyTrend ?? []).map((row) => ({
      label: String(row.label ?? row.week ?? ""),
      value: Number(row.activeUsers ?? row.value ?? 0),
    }))
    const dow = namedCounts(e?.byDayOfWeek)
    if (trend.length === 0 && dow.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        {trend.length > 0 ? chartCard("Weekly active students", <InstitutionLineChart data={trend} />, native) : null}
        {dow.length > 0 ? chartCard("Activity by day of week", <InstitutionBarChart data={dow} />, native) : null}
      </View>
    )
  }

  if (section === "learning") {
    const l = (payload.learning as Record<string, unknown> | undefined)?.learning as
      | {
          practice?: { sequences?: NamedCount[] }
          conceptImprovement?: NamedCount[]
          prePostGain?: { available?: boolean; funnel?: NamedCount[] }
        }
      | undefined
    const sequences = namedCounts(l?.practice?.sequences)
    const improvement = namedCounts(l?.conceptImprovement)
    const prePost = namedCounts(l?.prePostGain?.funnel)
    if (sequences.length === 0 && improvement.length === 0 && prePost.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        {sequences.length > 0 ? chartCard("Practice sequences", <InstitutionBarChart data={sequences} valueLabel="Sessions" />, native) : null}
        {improvement.length > 0
          ? chartCard("First-to-eventual change", <InstitutionBarChart data={improvement} valueLabel="pp change" />, native)
          : null}
        {l?.prePostGain?.available && prePost.length > 0
          ? chartCard("Pre/post learning gain", <InstitutionBarChart data={prePost} valueLabel="Score" />, native)
          : null}
      </View>
    )
  }

  if (section === "assessment") {
    const a = (payload.assessments as Record<string, unknown> | undefined)?.assessments as
      | { performanceDistribution?: NamedCount[] }
      | undefined
    const dist = namedCounts(a?.performanceDistribution)
    if (dist.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        {chartCard("Score distribution", <InstitutionBarChart data={dist} valueLabel="Attempts" />, native)}
      </View>
    )
  }

  if (section === "cognitive") {
    const c = (payload.cognitive as Record<string, unknown> | undefined)?.cognitive as
      | {
          surveys?: { available?: boolean; byConstruct?: NamedCount[] }
          behavioral?: { patterns?: NamedCount[] }
        }
      | undefined
    const constructs = namedCounts(c?.surveys?.byConstruct)
    const patterns = namedCounts(c?.behavioral?.patterns)
    if (constructs.length === 0 && patterns.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        {constructs.length > 0 ? chartCard("Survey constructs", <InstitutionBarChart data={constructs} valueLabel="Mean score" />, native) : null}
        {patterns.length > 0 ? chartCard("Behavioral patterns", <InstitutionBarChart data={patterns} />, native) : null}
      </View>
    )
  }

  if (section === "equity") {
    const d = (payload.equity as Record<string, unknown> | undefined)?.equity as
      | {
          available?: boolean
          subgroups?: NamedCount[]
          outcomeBySubgroup?: Array<{ subgroup: string; meanScore: number | null }>
        }
      | undefined
    if (!d?.available) return null
    const subgroups = namedCounts(d.subgroups)
    const outcomes = (d.outcomeBySubgroup ?? []).map((row) => ({
      label: row.subgroup,
      value: row.meanScore ?? 0,
    }))
    if (subgroups.length === 0 && outcomes.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        {subgroups.length > 0 ? chartCard("Subgroup roster (N)", <InstitutionBarChart data={subgroups} valueLabel="Students" />, native) : null}
        {outcomes.length > 0
          ? chartCard("Mean score by subgroup", <InstitutionBarChart data={outcomes} valueLabel="Mean score" />, native)
          : null}
      </View>
    )
  }

  if (section === "ai_assistance") {
    const cora = (payload.cora as Record<string, unknown> | undefined)?.cora as Record<string, unknown> | undefined
    const classified = cora?.classified as { byType?: NamedCount[]; byDepth?: NamedCount[] } | undefined
    const byType = namedCounts(classified?.byType)
    const byDepth = namedCounts(classified?.byDepth)
    if (byType.length === 0 && byDepth.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        {byType.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            <Text style={[styles.chartTitle, { color: native.label }]}>Assistance taxonomy</Text>
            <InstitutionBarChart data={byType.map((d) => ({ label: d.label, value: d.value }))} />
          </View>
        ) : null}
        {byDepth.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            <Text style={[styles.chartTitle, { color: native.label }]}>Assistance depth</Text>
            <InstitutionBarChart data={byDepth.map((d) => ({ label: d.label, value: d.value }))} />
          </View>
        ) : null}
      </View>
    )
  }

  if (section === "feedback") {
    const fb = (payload.feedback as Record<string, unknown> | undefined)?.feedback as
      | { funnel?: NamedCount[] }
      | undefined
    const steps = namedCounts(fb?.funnel)
    if (steps.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        <View style={[styles.chartCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[styles.chartTitle, { color: native.label }]}>Feedback funnel</Text>
          <InstitutionFunnelChart steps={steps} />
        </View>
      </View>
    )
  }

  if (section === "interventions") {
    const iv = (payload.interventions as Record<string, unknown> | undefined)?.interventions as
      | { funnel?: NamedCount[] }
      | undefined
    const steps = namedCounts(iv?.funnel)
    if (steps.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        <View style={[styles.chartCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[styles.chartTitle, { color: native.label }]}>Intervention funnel</Text>
          <InstitutionFunnelChart steps={steps} />
        </View>
      </View>
    )
  }

  if (section === "data_quality") {
    const dq = (payload.data_quality as Record<string, unknown> | undefined)?.data_quality as
      | { coverages?: Array<{ label: string; percent: number | null }> }
      | undefined
    const segments = (dq?.coverages ?? [])
      .filter((row) => row.percent != null)
      .map((row, i) => ({
        label: row.label,
        value: row.percent ?? 0,
        color: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"][i % 5]!,
      }))
    if (segments.length === 0) return null
    return (
      <View style={styles.chartBlock}>
        <View style={[styles.chartCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[styles.chartTitle, { color: native.label }]}>Instrumentation coverage</Text>
          <InstitutionMixChart segments={segments} />
        </View>
      </View>
    )
  }

  return null
}

export function InstitutionIntelligenceScreen({ initialSection = "overview" }: { initialSection?: InstitutionAnalyticsSection }) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const [section, setSection] = useState<InstitutionAnalyticsSection>(initialSection)
  const [institutionName, setInstitutionName] = useState<string | null>(null)
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const me = await fetchInstitutionMe()
      if (!me) {
        setError("Institution admin access required. Sign in on the web institution portal or use an account with institution permissions.")
        setPayload(null)
        return
      }
      setInstitutionName(me.name)
      const data = await fetchInstitutionAnalyticsSection(section)
      setPayload(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load institution analytics")
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [section])

  useEffect(() => {
    void load()
  }, [load])

  const cards = useMemo(() => (payload ? sectionCards(section, payload) : []), [payload, section])

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Institution Intelligence" fallbackHref="/dashboard" />
      {institutionName ? (
        <Text style={[styles.institution, { color: native.secondaryLabel }]}>{institutionName}</Text>
      ) : null}
      <Text style={[styles.disclaimer, { color: native.secondaryLabel }]}>
        Aggregates only. Descriptive ≠ causal. Research outcomes stay hidden until a study and instruments exist.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {INSTITUTION_ANALYTICS_SECTIONS.map((item) => {
          const active = item.id === section
          return (
            <Pressable
              key={item.id}
              onPress={() => setSection(item.id)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? tokens.accent : native.secondaryGrouped,
                  borderColor: native.separator,
                },
              ]}
            >
              <Text style={[styles.tabText, { color: active ? "#fff" : native.label }]}>{item.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.error, { color: native.label }]}>{error}</Text>
          <Pressable onPress={() => void load()} style={[styles.retry, { backgroundColor: tokens.accent }]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.grid}>
            {cards.map((card) => (
              <View
                key={card.label}
                style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
              >
                <Text style={[styles.cardLabel, { color: native.secondaryLabel }]}>{card.label}</Text>
                <Text
                  style={[
                    styles.cardValue,
                    { color: card.pending ? native.secondaryLabel : native.label },
                    nativeType.semibold,
                  ]}
                >
                  {card.value}
                </Text>
                {card.sub ? <Text style={[styles.cardSub, { color: native.secondaryLabel }]}>{card.sub}</Text> : null}
              </View>
            ))}
          </View>
          {payload ? <InstitutionSectionCharts section={section} payload={payload} /> : null}
          <Pressable
            onPress={() => router.push("/institution/cora" as never)}
            style={[styles.linkRow, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}
          >
            <Ionicons name="sparkles-outline" size={18} color={tokens.accent} />
            <Text style={[styles.linkText, { color: tokens.accent }]}>Open Cora Usage summary</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  institution: { paddingHorizontal: 16, fontSize: 13, marginBottom: 4 },
  disclaimer: { paddingHorizontal: 16, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  tabs: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  tab: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabText: { fontSize: 12, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  error: { textAlign: "center", lineHeight: 22 },
  retry: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: "#fff", fontWeight: "600" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    minWidth: 150,
  },
  cardLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 },
  cardValue: { fontSize: 22, marginTop: 6 },
  cardSub: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  chartBlock: { gap: 12 },
  chartCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  chartTitle: { fontSize: 14, fontWeight: "600" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  linkText: { fontSize: 14, fontWeight: "600" },
})
