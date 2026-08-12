import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type TradeCenterAnalytics,
  type TradeCenterRolloverResponse,
  type TradeCenterTradeLog,
  type TradeCenterTrader,
} from "../../lib/instructor-api"
import {
  DEFAULT_TRADE_CENTER_CONFIG,
  formatTradeLogWhen,
  humanizeTradeStatus,
  parseTradeCenterConfig,
  pointsPerEngagementCredit,
  rowMatchesTradeSearch,
  TRADE_SOURCE_LABELS,
  type TradeCenterConfig,
} from "../../lib/faculty-trade-center-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import type { useFacultyScope } from "../../hooks/useFacultyScope"
import { NativeSwitch } from "../NativeSwitch"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultyAdaptiveSegmentNav } from "./faculty-module-shell"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_TRADE_CENTER_COLOR,
  facultyTradeCenterDonationThumb,
  facultyTradeCenterKpiSolid,
  facultyTradeCenterRequestStatusColor,
  facultyTradeCenterTraderThumb,
  tradeCenterHistoryTheme,
} from "../../lib/faculty-trade-center-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type Scope = NonNullable<ReturnType<typeof useFacultyScope>["scope"]>

function formatWeekStart(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function TradeCenterKpiTile({
  icon,
  label,
  value,
  fill,
  iconInk,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  fill: string
  iconInk: string
}) {
  const { native, type } = useModuleTheme()

  return (
    <View
      style={[
        localStyles.kpiTile,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      <View style={[localStyles.kpiIcon, { backgroundColor: fill }]}>
        <Ionicons name={icon} size={18} color={iconInk} />
      </View>
      <View style={localStyles.kpiCopy}>
        <Text style={[localStyles.kpiValue, { color: native.label }]} numberOfLines={1}>
          {value}
        </Text>
        <Text
          style={[type.caption, localStyles.kpiLabel, { color: native.secondaryLabel }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </View>
  )
}

function TradeCenterOverviewKpis({
  stats,
  weekLabel,
  weekNote,
}: {
  stats: NonNullable<TradeCenterAnalytics["stats"]>
  weekLabel: string
  weekNote?: string
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()

  return (
    <View style={moduleStyles.sectionCard}>
      <View style={localStyles.kpiHeader}>
        <Text style={[type.caption, localStyles.kpiSectionTitle, { color: native.secondaryLabel }]}>
          This week
        </Text>
        <Text style={[type.caption, { color: native.tertiaryLabel, lineHeight: 17 }]}>
          {weekLabel}
          {weekNote ? ` ${weekNote}` : null}
        </Text>
      </View>
      <View style={localStyles.kpiStack}>
        <View style={localStyles.kpiRow}>
          <TradeCenterKpiTile
            icon="people-outline"
            label="Active students"
            value={String(stats.total_students ?? 0)}
            fill={facultyTradeCenterKpiSolid("students").fill}
            iconInk={facultyTradeCenterKpiSolid("students").iconInk}
          />
          <TradeCenterKpiTile
            icon="trending-up-outline"
            label="Avg EC / student"
            value={Number(stats.avg_ec_per_student ?? 0).toFixed(1)}
            fill={facultyTradeCenterKpiSolid("avgEc").fill}
            iconInk={facultyTradeCenterKpiSolid("avgEc").iconInk}
          />
        </View>
        <TradeCenterKpiTile
          icon="ribbon-outline"
          label="At EC cap"
          value={String(stats.students_at_cap ?? 0)}
          fill={facultyTradeCenterKpiSolid("donations").fill}
          iconInk={facultyTradeCenterKpiSolid("donations").iconInk}
        />
      </View>
    </View>
  )
}

function traderMatchesSearch(trader: TradeCenterTrader, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [trader.full_name, trader.student_number, trader.section].some((field) =>
    String(field ?? "")
      .toLowerCase()
      .includes(q),
  )
}

export function TradeCenterTraderRow({
  trader,
  showEc,
}: {
  trader: TradeCenterTrader
  showEc?: boolean
}) {
  const { native, type } = useModuleTheme()
  const ec = trader.engagement_credits ?? 0
  const points = trader.total_points ?? 0
  const thumb = facultyTradeCenterTraderThumb(trader.id ?? trader.full_name)

  return (
    <View style={localStyles.traderRow}>
      <SolidListThumbTile thumb={thumb} size="compact">
        <Text style={[type.caption, localStyles.avatarText, { color: thumb.icon }]}>
          {studentInitials(trader.full_name)}
        </Text>
      </SolidListThumbTile>
      <View style={localStyles.traderCopy}>
        <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
          {trader.full_name}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
          {trader.student_number ?? "—"}
          {trader.section ? ` · ${trader.section}` : ""}
        </Text>
      </View>
      <View style={localStyles.traderStats}>
        {showEc ? (
          <>
            <Text style={[type.bodyEmphasis, { color: FACULTY_TRADE_CENTER_COLOR.ec }]}>{Number(ec).toFixed(1)}</Text>
            <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "700" }]}>EC</Text>
          </>
        ) : (
          <>
            <Text style={[type.bodyEmphasis, { color: FACULTY_TRADE_CENTER_COLOR.points }]}>{points}</Text>
            <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "700" }]}>pts</Text>
          </>
        )}
      </View>
    </View>
  )
}

export function TradeCenterOverviewPanel({
  analytics,
  search,
}: {
  analytics: TradeCenterAnalytics | null
  search: string
}) {
  const { styles: moduleStyles, native, type } = useModuleTheme()
  const stats = analytics?.stats
  const lowEngagement = useMemo(
    () => (analytics?.lowEngagement ?? []).filter((t) => traderMatchesSearch(t, search)),
    [analytics?.lowEngagement, search],
  )
  const topPreview = useMemo(
    () => (analytics?.topTraders ?? []).slice(0, 5).filter((t) => traderMatchesSearch(t, search)),
    [analytics?.topTraders, search],
  )
  const reportingWeekDiffers =
    analytics?.usedFallbackWeek ||
    (analytics?.weekStartDate &&
      analytics?.calendarWeekStart &&
      analytics.weekStartDate !== analytics.calendarWeekStart)

  if (!analytics) {
    return (
      <FacultyEmptyState
        icon="diamond-outline"
        title="No overview data"
        body="Trade center analytics will appear once students begin earning points."
      />
    )
  }

  const weekLabel = `Week starting ${formatWeekStart(analytics.weekStartDate)}.`
  const weekNote = reportingWeekDiffers
    ? `Showing the most recent week with activity (current week: ${formatWeekStart(analytics.calendarWeekStart)}).`
    : undefined

  return (
    <View style={localStyles.panelGap}>
      {stats ? (
        <TradeCenterOverviewKpis stats={stats} weekLabel={weekLabel} weekNote={weekNote} />
      ) : null}

      {lowEngagement.length > 0 ? (
        <View style={moduleStyles.card}>
          <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>
            Low engagement
          </Text>
          {lowEngagement.map((trader, index) => (
            <View
              key={`low-${trader.id}`}
              style={index > 0 ? [localStyles.rowDivider, { borderTopColor: native.separator }] : undefined}
            >
              <TradeCenterTraderRow trader={trader} />
            </View>
          ))}
        </View>
      ) : null}

      {topPreview.length > 0 ? (
        <View style={moduleStyles.card}>
          <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>
            Top traders preview
          </Text>
          {topPreview.map((trader, index) => (
            <View
              key={`top-${trader.id}`}
              style={index > 0 ? [localStyles.rowDivider, { borderTopColor: native.separator }] : undefined}
            >
              <TradeCenterTraderRow trader={trader} showEc />
            </View>
          ))}
        </View>
      ) : null}

      {lowEngagement.length === 0 && topPreview.length === 0 ? (
        <FacultyEmptyState
          icon="diamond-outline"
          title="No matching students"
          body="Try a different search term or check back after activity begins."
        />
      ) : null}
    </View>
  )
}

function ConfigField({
  label,
  hint,
  value,
  onChangeText,
  keyboardType = "decimal-pad",
}: {
  label: string
  hint?: string
  value: string
  onChangeText: (v: string) => void
  keyboardType?: "decimal-pad" | "number-pad"
}) {
  const { native, type } = useModuleTheme()
  return (
    <View style={localStyles.configField}>
      <Text style={[type.body, { color: native.label }]}>{label}</Text>
      {hint ? (
        <Text style={[type.caption, { color: native.tertiaryLabel, lineHeight: 17 }]}>{hint}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={native.tertiaryLabel}
        style={[
          localStyles.configInput,
          {
            color: native.label,
            borderColor: native.separator,
            backgroundColor: native.secondaryGrouped,
          },
        ]}
      />
    </View>
  )
}

function ConfigToggleRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string
  detail?: string
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  const { native, type } = useModuleTheme()
  return (
    <View style={localStyles.toggleRow}>
      <View style={localStyles.toggleCopy}>
        <Text style={[type.body, { color: native.label }]}>{label}</Text>
        {detail ? (
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 17 }]}>{detail}</Text>
        ) : null}
      </View>
      <NativeSwitch value={value} onValueChange={onValueChange} />
    </View>
  )
}

export function TradeCenterConfigPanel({
  scope,
  config,
  loading,
  onSaved,
}: {
  scope: Scope
  config: TradeCenterConfig | null
  loading: boolean
  onSaved: (config: TradeCenterConfig) => void
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const [draft, setDraft] = useState<TradeCenterConfig>(config ?? DEFAULT_TRADE_CENTER_CONFIG)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  const ptsPerEc = pointsPerEngagementCredit(draft.ec_conversion_multiplier)

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      const result = await instructorApi.saveTradeCenterConfig(scope, draft as unknown as Record<string, unknown>)
      const next = parseTradeCenterConfig(result.config ?? (draft as unknown as Record<string, unknown>))
      setDraft(next)
      onSaved(next)
      AppAlert.alert("Saved", "Conversion rules updated.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save conversion rules.")
    } finally {
      setSaving(false)
    }
  }

  if (loading && !config) {
    return <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
  }

  return (
    <View style={localStyles.panelGap}>
      {error ? (
        <View style={[moduleStyles.errorBox, localStyles.errorBox]}>
          <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
        </View>
      ) : null}

      <View style={moduleStyles.card}>
        <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>
          Engagement credit conversion
        </Text>
        <ConfigField
          label="EC conversion multiplier"
          hint={`${ptsPerEc} pts → 1 EC at current multiplier`}
          value={String(draft.ec_conversion_multiplier)}
          onChangeText={(v) =>
            setDraft((c) => ({ ...c, ec_conversion_multiplier: Number(v) || c.ec_conversion_multiplier }))
          }
        />
        <ConfigField
          label="Max engagement credits"
          value={String(draft.max_engagement_credits)}
          keyboardType="number-pad"
          onChangeText={(v) =>
            setDraft((c) => ({ ...c, max_engagement_credits: parseInt(v, 10) || c.max_engagement_credits }))
          }
        />
        <ConfigField
          label="Minimum donation points"
          value={String(draft.min_donation_points)}
          keyboardType="number-pad"
          onChangeText={(v) =>
            setDraft((c) => ({ ...c, min_donation_points: parseInt(v, 10) || c.min_donation_points }))
          }
        />
      </View>

      <View style={moduleStyles.card}>
        <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>
          Activity weights & weekly caps
        </Text>
        <ConfigField
          label="Practice weight"
          value={String(draft.practice_weight)}
          onChangeText={(v) => setDraft((c) => ({ ...c, practice_weight: Number(v) || c.practice_weight }))}
        />
        <ConfigField
          label="Playground weight"
          value={String(draft.playground_weight)}
          onChangeText={(v) => setDraft((c) => ({ ...c, playground_weight: Number(v) || c.playground_weight }))}
        />
        <ConfigField
          label="Reading weight"
          value={String(draft.reading_weight)}
          onChangeText={(v) => setDraft((c) => ({ ...c, reading_weight: Number(v) || c.reading_weight }))}
        />
        <ConfigField
          label="Weekly practice cap"
          value={String(draft.weekly_practice_cap)}
          keyboardType="number-pad"
          onChangeText={(v) =>
            setDraft((c) => ({ ...c, weekly_practice_cap: parseInt(v, 10) || c.weekly_practice_cap }))
          }
        />
        <ConfigField
          label="Weekly playground cap"
          value={String(draft.weekly_playground_cap)}
          keyboardType="number-pad"
          onChangeText={(v) =>
            setDraft((c) => ({ ...c, weekly_playground_cap: parseInt(v, 10) || c.weekly_playground_cap }))
          }
        />
        <ConfigField
          label="Weekly reading cap"
          value={String(draft.weekly_reading_cap)}
          keyboardType="number-pad"
          onChangeText={(v) =>
            setDraft((c) => ({ ...c, weekly_reading_cap: parseInt(v, 10) || c.weekly_reading_cap }))
          }
        />
      </View>

      <View style={moduleStyles.card}>
        <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>
          Trading & donations
        </Text>
        <ConfigToggleRow
          label="Trade center active"
          value={draft.is_active}
          onValueChange={(v) => setDraft((c) => ({ ...c, is_active: v }))}
        />
        <ConfigToggleRow
          label="Trading enabled"
          value={draft.trading_enabled}
          onValueChange={(v) => setDraft((c) => ({ ...c, trading_enabled: v }))}
        />
        <ConfigToggleRow
          label="Donations enabled"
          value={draft.donations_enabled}
          onValueChange={(v) => setDraft((c) => ({ ...c, donations_enabled: v }))}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          localStyles.saveBtn,
          { backgroundColor: FACULTY_TRADE_CENTER_COLOR.action, opacity: pressed || saving ? 0.85 : 1 },
        ]}
        disabled={saving}
        onPress={() => void handleSave()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={localStyles.saveBtnText}>Save conversion rules</Text>
          </>
        )}
      </Pressable>
    </View>
  )
}

export function TradeCenterAnalyticsPanel({
  analytics,
  search,
}: {
  analytics: TradeCenterAnalytics | null
  search: string
}) {
  const { styles: moduleStyles, native, type } = useModuleTheme()
  const traders = useMemo(
    () => (analytics?.topTraders ?? []).filter((t) => traderMatchesSearch(t, search)),
    [analytics?.topTraders, search],
  )

  if (!analytics) {
    return (
      <FacultyEmptyState
        icon="bar-chart-outline"
        title="No analytics yet"
        body="Student rankings will appear after trade activity begins."
      />
    )
  }

  if (traders.length === 0) {
    return (
      <FacultyEmptyState
        icon="trophy-outline"
        title={search.trim() ? "No matches" : "No top traders yet"}
        body={
          search.trim()
            ? "Try a different search term."
            : "Leaderboard rankings will appear after students begin trading."
        }
      />
    )
  }

  return (
    <View style={moduleStyles.card}>
      <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>
        Top traders by EC
      </Text>
      {traders.map((trader, index) => (
        <View
          key={trader.id}
          style={index > 0 ? [localStyles.rowDivider, { borderTopColor: native.separator }] : undefined}
        >
          <TradeCenterTraderRow trader={trader} showEc />
        </View>
      ))}
    </View>
  )
}

function requestStatusTone(status: string): "success" | "warning" | "danger" | "neutral" | "live" {
  const s = status.toLowerCase()
  if (s.includes("pending")) return "warning"
  if (s.includes("approved")) return "live"
  if (s.includes("reject")) return "danger"
  return "neutral"
}

function RequestCard({
  title,
  subtitle,
  status,
  meta,
  onApprove,
  onReject,
  busy,
}: {
  title: string
  subtitle: string
  status: string
  meta?: string
  onApprove?: () => void
  onReject?: () => void
  busy?: boolean
}) {
  const { native, tokens, type } = useModuleTheme()
  const pending = status.toLowerCase().includes("pending")
  const thumb = facultyTradeCenterDonationThumb()

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="gift-outline"
      title={title}
      description={subtitle}
      metaLine={meta}
      status={{
        label: humanizeTradeStatus(status),
        color: facultyTradeCenterRequestStatusColor(status),
        icon: pending ? "time-outline" : status.toLowerCase().includes("reject") ? "close-circle-outline" : "checkmark-circle",
      }}
      footer={
        pending && onApprove && onReject ? (
          <View style={localStyles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                localStyles.actionBtn,
                { borderColor: native.separator, opacity: pressed || busy ? 0.7 : 1 },
              ]}
              disabled={busy}
              onPress={onReject}
            >
              <Text style={[type.caption, { color: tokens.danger, fontWeight: "700" }]}>Reject</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                localStyles.actionBtn,
                localStyles.actionBtnPrimary,
                { backgroundColor: FACULTY_TRADE_CENTER_COLOR.action, opacity: pressed || busy ? 0.85 : 1 },
              ]}
              disabled={busy}
              onPress={onApprove}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[type.caption, { color: "#fff", fontWeight: "700" }]}>Approve</Text>
              )}
            </Pressable>
          </View>
        ) : undefined
      }
    />
  )
}

export function TradeCenterDonationsPanel({
  scope,
  donations,
  pointRequests,
  loading,
  search,
  onChanged,
}: {
  scope: Scope
  donations: Array<Record<string, unknown>>
  pointRequests: Array<Record<string, unknown>>
  loading: boolean
  search: string
  onChanged: () => void
}) {
  const { tokens } = useModuleTheme()
  const [busyId, setBusyId] = useState<string | null>(null)

  const filteredDonations = useMemo(
    () => donations.filter((row) => rowMatchesTradeSearch(row, search)),
    [donations, search],
  )
  const filteredPoints = useMemo(
    () => pointRequests.filter((row) => rowMatchesTradeSearch(row, search)),
    [pointRequests, search],
  )

  async function act(kind: "donation" | "point", id: number, action: "approve" | "reject") {
    const key = `${kind}-${id}-${action}`
    setBusyId(key)
    try {
      if (kind === "donation") {
        if (action === "approve") await instructorApi.approveTradeCenterDonation(scope, id)
        else await instructorApi.rejectTradeCenterDonation(scope, id)
      } else {
        if (action === "approve") await instructorApi.approveTradeCenterPointRequest(scope, id)
        else await instructorApi.rejectTradeCenterPointRequest(scope, id)
      }
      onChanged()
    } catch (err) {
      AppAlert.alert("Action failed", err instanceof ApiError ? err.message : "Could not update request.")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
  }

  if (filteredDonations.length === 0 && filteredPoints.length === 0) {
    return (
      <FacultyEmptyState
        icon="gift-outline"
        title={search.trim() ? "No matches" : "No pending requests"}
        body={
          search.trim()
            ? "Try a different search term."
            : "Donation and point requests awaiting your review will appear here."
        }
      />
    )
  }

  return (
    <View style={localStyles.panelGap}>
      {filteredDonations.map((row) => {
        const id = Number(row.id)
        const source = TRADE_SOURCE_LABELS[String(row.source ?? row.point_source ?? "")] ?? String(row.source ?? "")
        return (
          <RequestCard
            key={`donation-${id}`}
            title={String(row.student_name ?? row.donor_name ?? "Student")}
            subtitle={`${row.points ?? row.amount ?? 0} pts · ${source}`}
            status={String(row.status ?? "pending")}
            meta={row.recipient_name ? `To ${row.recipient_name}` : undefined}
            onApprove={() => void act("donation", id, "approve")}
            onReject={() => void act("donation", id, "reject")}
            busy={busyId?.startsWith(`donation-${id}`) ?? false}
          />
        )
      })}
      {filteredPoints.map((row) => {
        const id = Number(row.id)
        const source = TRADE_SOURCE_LABELS[String(row.source ?? row.point_source ?? "")] ?? String(row.source ?? "")
        return (
          <RequestCard
            key={`point-${id}`}
            title={String(row.student_name ?? row.requester_name ?? "Student")}
            subtitle={`${row.points ?? row.amount ?? 0} pts · ${source}`}
            status={String(row.status ?? "pending")}
            meta={row.reason ? String(row.reason) : "Peer-approved point request"}
            onApprove={() => void act("point", id, "approve")}
            onReject={() => void act("point", id, "reject")}
            busy={busyId?.startsWith(`point-${id}`) ?? false}
          />
        )
      })}
    </View>
  )
}

type TradeLogSegment = "transactions" | "rollovers" | "donations" | "points"

export function TradeCenterTradeLogPanel({
  tradeLog,
  loading,
  search,
}: {
  tradeLog: TradeCenterTradeLog | null
  loading: boolean
  search: string
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const [segment, setSegment] = useState<TradeLogSegment>("transactions")

  const rows = useMemo(() => {
    const key =
      segment === "transactions"
        ? "transactions"
        : segment === "rollovers"
          ? "rollovers"
          : segment === "donations"
            ? "donationRequests"
            : "pointRequests"
    return (tradeLog?.[key] ?? []).filter((row) => rowMatchesTradeSearch(row, search))
  }, [tradeLog, segment, search])

  if (loading) {
    return <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
  }

  return (
    <View style={localStyles.panelGap}>
      <FacultyAdaptiveSegmentNav
        tabs={[
          { id: "transactions", label: "Trades" },
          { id: "rollovers", label: "Rollovers" },
          { id: "donations", label: "Donations" },
          { id: "points", label: "Points" },
        ]}
        tab={segment}
        onChange={setSegment}
      />

      {rows.length === 0 ? (
        <FacultyEmptyState
          icon="list-outline"
          title="No log entries"
          body="Trade activity for this filter will appear here."
        />
      ) : (
        <View style={moduleStyles.card}>
          {rows.map((row, index) => {
            const title = String(
              row.student_name ?? row.full_name ?? row.donor_name ?? row.type ?? row.action ?? "Activity",
            )
            const when = formatTradeLogWhen(row.created_at ?? row.timestamp ?? row.reviewed_at)
            const status = String(row.status ?? row.type ?? "")
            return (
              <View
                key={`log-${segment}-${index}-${String(row.id ?? title)}`}
                style={index > 0 ? [localStyles.rowDivider, { borderTopColor: native.separator }] : undefined}
              >
                <View style={localStyles.logRow}>
                  <View style={localStyles.logCopy}>
                    <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                      {when}
                      {row.points != null ? ` · ${row.points} pts` : ""}
                    </Text>
                  </View>
                  {status ? (
                    <FacultyStatusPill label={humanizeTradeStatus(status)} tone={requestStatusTone(status)} />
                  ) : null}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export function TradeCenterRolloverPanel({
  rollover,
  loading,
  search,
}: {
  rollover: TradeCenterRolloverResponse | null
  loading: boolean
  search: string
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const trades = useMemo(
    () => (rollover?.trades ?? []).filter((row) => rowMatchesTradeSearch(row, search)),
    [rollover?.trades, search],
  )

  if (loading) {
    return <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
  }

  if (trades.length === 0) {
    return (
      <FacultyEmptyState
        icon="refresh-outline"
        title={search.trim() ? "No matches" : "No rollover trades"}
        body={
          search.trim()
            ? "Try a different search term."
            : "Students with rollover extensions will appear here."
        }
      />
    )
  }

  return (
    <View style={moduleStyles.card}>
      {trades.map((row, index) => (
        <View
          key={`rollover-${String(row.id ?? index)}`}
          style={index > 0 ? [localStyles.rowDivider, { borderTopColor: native.separator }] : undefined}
        >
          <View style={localStyles.logRow}>
            <View style={localStyles.logCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                {String(row.student_name ?? row.full_name ?? "Student")}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                {row.section ? String(row.section) : "—"}
                {row.points != null ? ` · ${row.points} pts` : ""}
              </Text>
              {row.reason || row.rollover_type ? (
                <Text style={[type.caption, { color: FACULTY_TRADE_CENTER_COLOR.link, fontWeight: "600" }]}>
                  {String(row.reason ?? row.rollover_type)}
                </Text>
              ) : null}
            </View>
            {row.status ? (
              <FacultyStatusPill label={humanizeTradeStatus(String(row.status))} tone="live" />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

export function TradeCenterActivitySettingsPanel({
  scope,
  config,
  loading,
  onSaved,
}: {
  scope: Scope
  config: TradeCenterConfig | null
  loading: boolean
  onSaved: (config: TradeCenterConfig) => void
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const [draft, setDraft] = useState({
    practice_enabled: config?.practice_enabled ?? true,
    playground_enabled: config?.playground_enabled ?? true,
    reading_enabled: config?.reading_enabled ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (config) {
      setDraft({
        practice_enabled: config.practice_enabled,
        playground_enabled: config.playground_enabled,
        reading_enabled: config.reading_enabled,
      })
    }
  }, [config])

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      const base = config ?? DEFAULT_TRADE_CENTER_CONFIG
      const payload = { ...base, ...draft, session: base.session ?? "ALL" }
      const result = await instructorApi.saveTradeCenterConfig(scope, payload as unknown as Record<string, unknown>)
      const next = parseTradeCenterConfig(result.config ?? (payload as unknown as Record<string, unknown>))
      onSaved(next)
      AppAlert.alert("Saved", "Activity settings updated.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save activity settings.")
    } finally {
      setSaving(false)
    }
  }

  if (loading && !config) {
    return <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
  }

  return (
    <View style={localStyles.panelGap}>
      {error ? (
        <View style={[moduleStyles.errorBox, localStyles.errorBox]}>
          <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
        </View>
      ) : null}

      <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
        Control which activity sources earn trade-center points this term.
      </Text>

      <View style={moduleStyles.card}>
        <ConfigToggleRow
          label="Practice Hub"
          detail="Quizzes and practice sessions"
          value={draft.practice_enabled}
          onValueChange={(v) => setDraft((d) => ({ ...d, practice_enabled: v }))}
        />
        <ConfigToggleRow
          label="Playground"
          detail="Collaborative coding games"
          value={draft.playground_enabled}
          onValueChange={(v) => setDraft((d) => ({ ...d, playground_enabled: v }))}
        />
        <ConfigToggleRow
          label="Lecture reading"
          detail="Assigned reading progress"
          value={draft.reading_enabled}
          onValueChange={(v) => setDraft((d) => ({ ...d, reading_enabled: v }))}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          localStyles.saveBtn,
          { backgroundColor: FACULTY_TRADE_CENTER_COLOR.action, opacity: pressed || saving ? 0.85 : 1 },
        ]}
        disabled={saving}
        onPress={() => void handleSave()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={localStyles.saveBtnText}>Save activity settings</Text>
          </>
        )}
      </Pressable>
    </View>
  )
}

const localStyles = StyleSheet.create({
  panelGap: { gap: 14 },
  loader: { marginVertical: 32 },
  kpiHeader: { gap: 4, paddingHorizontal: 12, paddingTop: 12 },
  kpiSectionTitle: { fontWeight: "700", textTransform: "none" },
  kpiStack: { gap: 10, padding: 12, paddingTop: 10 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiTile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: NATIVE.sectionRadius - 2,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 72,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiCopy: { flex: 1, minWidth: 0, gap: 2 },
  kpiValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  kpiLabel: { fontWeight: "600", lineHeight: 15 },
  sectionLabel: { fontWeight: "700", textTransform: "none", marginBottom: 4 },
  traderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700" },
  traderCopy: { flex: 1, gap: 2 },
  traderStats: { alignItems: "flex-end" },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  configField: { gap: 6, marginTop: 10 },
  configInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  toggleCopy: { flex: 1, gap: 2 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionBtnPrimary: { borderWidth: 0 },
  logRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  logCopy: { flex: 1, gap: 2 },
  errorBox: { padding: 12 },
})
