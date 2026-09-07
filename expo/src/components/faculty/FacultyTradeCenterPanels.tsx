import { useEffect, useMemo, useState } from "react"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
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
  transactionMatchesTrader,
  isTradeCenterDevFixtureId,
  isTradeCenterRequestPending,
  parseTradeCenterRequestRow,
  parseTradeCenterRolloverRow,
  rolloverTradeListDescription,
  rolloverTradeListMeta,
  buildTradeLogSections,
  tradeLogRowDescription,
  tradeLogRowStatus,
  tradeLogRowTitle,
  tradeLogRowWhen,
  tradeLogSectionTitle,
  type TradeLogSectionKey,
  type TradeCenterRequestKind,
  type TradeCenterRolloverTradeView,
  type TradeCenterConfig,
} from "../../lib/faculty-trade-center-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import type { useFacultyScope } from "../../hooks/useFacultyScope"
import { NativeSwitch } from "../NativeSwitch"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSelect } from "../NativeSelect"
import {
  TRADE_CAP_OPTIONS,
  TRADE_MAX_EC_OPTIONS,
  TRADE_WEIGHT_OPTIONS,
  withCurrentOption,
} from "./FacultyNativePickers"
import {
  FACULTY_TRADE_CENTER_COLOR,
  facultyTradeCenterDonationThumb,
  facultyTradeCenterKpiSolid,
  facultyTradeCenterRequestStatusColor,
  facultyTradeCenterTraderThumb,
  tradeCenterHistoryTheme,
} from "../../lib/faculty-trade-center-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { FacultyTradeCenterTraderSheet } from "./FacultyTradeCenterTraderSheet"
import { FacultyTradeCenterDonationActionSheet } from "./FacultyTradeCenterDonationActionSheet"
import { FacultyTradeCenterRolloverActionSheet } from "./FacultyTradeCenterRolloverActionSheet"
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
  onPress,
}: {
  trader: TradeCenterTrader
  showEc?: boolean
  onPress?: () => void
}) {
  const { native, type } = useModuleTheme()
  const ec = trader.engagement_credits ?? 0
  const points = trader.total_points ?? 0
  const thumb = facultyTradeCenterTraderThumb(trader.id ?? trader.full_name)

  const row = (
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
      {onPress ? <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} /> : null}
    </View>
  )

  if (!onPress) return row

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trader.full_name}, view trade details`}
      android_ripple={{ color: `${native.label}14`, borderless: false }}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
    >
      {row}
    </Pressable>
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
  const lowEngagementPager = useFacultyListPager(lowEngagement, search, "students")
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
          {lowEngagementPager.items.map((trader, index) => (
            <View
              key={`low-${trader.id}`}
              style={index > 0 ? [localStyles.rowDivider, { borderTopColor: native.separator }] : undefined}
            >
              <TradeCenterTraderRow trader={trader} />
            </View>
          ))}
          <FacultyListPagerFooter pager={lowEngagementPager} />
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
  options,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const { native, type } = useModuleTheme()
  return (
    <View style={localStyles.configField}>
      {hint ? (
        <Text style={[type.caption, { color: native.tertiaryLabel, lineHeight: 17 }]}>{hint}</Text>
      ) : null}
      <NativeSelect
        label={label}
        placeholder={value}
        value={value}
        options={withCurrentOption(options, value)}
        onChange={onChange}
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
          options={TRADE_WEIGHT_OPTIONS}
          onChange={(v) =>
            setDraft((c) => ({ ...c, ec_conversion_multiplier: Number(v) || c.ec_conversion_multiplier }))
          }
        />
        <ConfigField
          label="Max engagement credits"
          value={String(draft.max_engagement_credits)}
          options={TRADE_MAX_EC_OPTIONS}
          onChange={(v) =>
            setDraft((c) => ({ ...c, max_engagement_credits: parseInt(v, 10) || c.max_engagement_credits }))
          }
        />
        <ConfigField
          label="Minimum donation points"
          value={String(draft.min_donation_points)}
          options={TRADE_CAP_OPTIONS}
          onChange={(v) =>
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
          options={TRADE_WEIGHT_OPTIONS}
          onChange={(v) => setDraft((c) => ({ ...c, practice_weight: Number(v) || c.practice_weight }))}
        />
        <ConfigField
          label="Playground weight"
          value={String(draft.playground_weight)}
          options={TRADE_WEIGHT_OPTIONS}
          onChange={(v) => setDraft((c) => ({ ...c, playground_weight: Number(v) || c.playground_weight }))}
        />
        <ConfigField
          label="Reading weight"
          value={String(draft.reading_weight)}
          options={TRADE_WEIGHT_OPTIONS}
          onChange={(v) => setDraft((c) => ({ ...c, reading_weight: Number(v) || c.reading_weight }))}
        />
        <ConfigField
          label="Weekly practice cap"
          value={String(draft.weekly_practice_cap)}
          options={TRADE_CAP_OPTIONS}
          onChange={(v) =>
            setDraft((c) => ({ ...c, weekly_practice_cap: parseInt(v, 10) || c.weekly_practice_cap }))
          }
        />
        <ConfigField
          label="Weekly playground cap"
          value={String(draft.weekly_playground_cap)}
          options={TRADE_CAP_OPTIONS}
          onChange={(v) =>
            setDraft((c) => ({ ...c, weekly_playground_cap: parseInt(v, 10) || c.weekly_playground_cap }))
          }
        />
        <ConfigField
          label="Weekly reading cap"
          value={String(draft.weekly_reading_cap)}
          options={TRADE_CAP_OPTIONS}
          onChange={(v) =>
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
  const [selectedTrader, setSelectedTrader] = useState<TradeCenterTrader | null>(null)
  const traders = useMemo(
    () => (analytics?.topTraders ?? []).filter((t) => traderMatchesSearch(t, search)),
    [analytics?.topTraders, search],
  )
  const tradersPager = useFacultyListPager(traders, search, "traders")
  const selectedTransactions = useMemo(() => {
    if (!selectedTrader) return []
    return (analytics?.transactions ?? []).filter((row) => transactionMatchesTrader(selectedTrader, row))
  }, [analytics?.transactions, selectedTrader])

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
    <>
      <View style={moduleStyles.card}>
        <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>
          Top traders by EC
        </Text>
        {tradersPager.items.map((trader, index) => (
          <View
            key={trader.id}
            style={index > 0 ? [localStyles.rowDivider, { borderTopColor: native.separator }] : undefined}
          >
            <TradeCenterTraderRow
              trader={trader}
              showEc
              onPress={() => setSelectedTrader(trader)}
            />
          </View>
        ))}
        <FacultyListPagerFooter pager={tradersPager} />
      </View>

      <FacultyTradeCenterTraderSheet
        visible={selectedTrader != null}
        trader={selectedTrader}
        transactions={selectedTransactions}
        onClose={() => setSelectedTrader(null)}
      />
    </>
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
  onPress,
}: {
  title: string
  subtitle: string
  status: string
  meta?: string
  onPress: () => void
}) {
  const pending = isTradeCenterRequestPending(status)
  const thumb = facultyTradeCenterDonationThumb()

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="gift-outline"
      title={title}
      description={subtitle}
      metaLine={meta}
      onPress={onPress}
      status={{
        label: humanizeTradeStatus(status),
        color: facultyTradeCenterRequestStatusColor(status),
        icon: pending ? "time-outline" : status.toLowerCase().includes("reject") ? "close-circle-outline" : "checkmark-circle",
      }}
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
  onDevFixtureUpdated,
}: {
  scope: Scope
  donations: Array<Record<string, unknown>>
  pointRequests: Array<Record<string, unknown>>
  loading: boolean
  search: string
  onChanged: () => void
  onDevFixtureUpdated?: (id: number, patch: Record<string, unknown>) => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selectedKind, setSelectedKind] = useState<TradeCenterRequestKind | null>(null)
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  const filteredDonations = useMemo(
    () => donations.filter((row) => rowMatchesTradeSearch(row, search)),
    [donations, search],
  )
  const filteredPoints = useMemo(
    () => pointRequests.filter((row) => rowMatchesTradeSearch(row, search)),
    [pointRequests, search],
  )
  const requestRows = useMemo(
    () => [
      ...filteredDonations.map((row) => ({ kind: "donation" as const, row })),
      ...filteredPoints.map((row) => ({ kind: "point" as const, row })),
    ],
    [filteredDonations, filteredPoints],
  )
  const requestsPager = useFacultyListPager(requestRows, search, "requests")

  function openRequest(kind: TradeCenterRequestKind, row: Record<string, unknown>) {
    setSelectedKind(kind)
    setSelectedRow(row)
  }

  function closeRequest() {
    setSelectedKind(null)
    setSelectedRow(null)
  }

  async function act(kind: TradeCenterRequestKind, id: number, action: "approve" | "reject", reason?: string) {
    const key = `${kind}-${id}-${action}`
    setBusyId(key)
    try {
      if (__DEV__ && isTradeCenterDevFixtureId(id)) {
        const resolvedStatus =
          kind === "point"
            ? action === "approve"
              ? "approved_by_instructor"
              : "rejected_by_instructor"
            : action === "approve"
              ? "approved"
              : "rejected"
        onDevFixtureUpdated?.(id, {
          status: resolvedStatus,
          reviewed_at: new Date().toISOString(),
          instructor_responded_at: new Date().toISOString(),
          ...(action === "reject" ? { rejection_reason: reason ?? "Rejected by instructor" } : {}),
        })
        closeRequest()
        AppAlert.alert(
          action === "approve" ? "Approved" : "Declined",
          "Simulator QA request updated locally.",
        )
        return
      }
      if (kind === "donation") {
        if (action === "approve") await instructorApi.approveTradeCenterDonation(scope, id)
        else await instructorApi.rejectTradeCenterDonation(scope, id, reason)
      } else {
        if (action === "approve") await instructorApi.approveTradeCenterPointRequest(scope, id)
        else await instructorApi.rejectTradeCenterPointRequest(scope, id, reason)
      }
      closeRequest()
      onChanged()
      AppAlert.alert(
        action === "approve" ? "Approved" : "Declined",
        action === "approve" ? "The request was approved." : "The request was declined.",
      )
    } catch (err) {
      AppAlert.alert("Action failed", err instanceof ApiError ? err.message : "Could not update request.")
    } finally {
      setBusyId(null)
    }
  }

  const selectedRequest =
    selectedKind && selectedRow ? parseTradeCenterRequestRow(selectedKind, selectedRow) : null
  const acting = selectedRequest ? busyId != null : false

  if (loading) {
    return <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
  }

  if (filteredDonations.length === 0 && filteredPoints.length === 0) {
    return (
      <FacultyEmptyState
        icon="gift-outline"
        title={search.trim() ? "No matches" : "No donation requests"}
        body={
          search.trim()
            ? "Try a different search term."
            : "Pending donation and point requests appear first. Recently reviewed requests stay visible for 90 days."
        }
      />
    )
  }

  return (
    <>
      <View style={localStyles.panelGap}>
        {requestsPager.items.map(({ kind, row }) => {
          const view = parseTradeCenterRequestRow(kind, row)
          return (
            <RequestCard
              key={`${kind}-${view.id}`}
              title={view.title}
              subtitle={view.subtitle}
              status={view.status}
              meta={view.meta}
              onPress={() => openRequest(kind, row)}
            />
          )
        })}
        <FacultyListPagerFooter pager={requestsPager} />
      </View>

      <FacultyTradeCenterDonationActionSheet
        visible={selectedRequest != null}
        kind={selectedKind}
        row={selectedRow}
        acting={acting}
        onClose={closeRequest}
        onApprove={() => {
          if (!selectedRequest) return
          void act(selectedRequest.kind, selectedRequest.id, "approve")
        }}
        onReject={(reason) => {
          if (!selectedRequest) return
          void act(selectedRequest.kind, selectedRequest.id, "reject", reason)
        }}
      />
    </>
  )
}

const TRADE_LOG_SECTION_ICONS: Record<
  TradeLogSectionKey,
  keyof typeof Ionicons.glyphMap
> = {
  transactions: "swap-horizontal-outline",
  rollovers: "refresh-outline",
  donationRequests: "gift-outline",
  pointRequests: "hand-left-outline",
}

function tradeLogSectionThumb(key: TradeLogSectionKey, row: Record<string, unknown>) {
  switch (key) {
    case "transactions":
      return facultyTradeCenterTraderThumb(String(row.student_id ?? row.id ?? row.summary ?? "trade"))
    case "rollovers":
      return facultyTradeCenterTraderThumb(String(row.student_id ?? row.student_name ?? "rollover"))
    case "donationRequests":
      return facultyTradeCenterDonationThumb()
    case "pointRequests":
      return facultyTradeCenterTraderThumb(String(row.requester_id ?? row.id ?? "point"))
    default:
      return facultyTradeCenterDonationThumb()
  }
}

function TradeLogSectionHeader({ title, count }: { title: string; count: number }) {
  const { native, type } = useModuleTheme()
  return (
    <View style={localStyles.logSectionHeader}>
      <Text style={[type.sectionHeader, localStyles.sectionLabel, { color: native.secondaryLabel }]}>{title}</Text>
      <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "700" }]}>{count}</Text>
    </View>
  )
}

export function TradeCenterTradeLogPanel({
  tradeLog,
  loading,
  search,
}: {
  tradeLog: TradeCenterTradeLog | null
  loading: boolean
  search: string
}) {
  const sections = useMemo(() => buildTradeLogSections(tradeLog, search), [tradeLog, search])
  const logRows = useMemo(
    () =>
      sections.flatMap((section) =>
        section.rows.map((row, index) => ({ sectionKey: section.key, row, index })),
      ),
    [sections],
  )
  const logPager = useFacultyListPager(logRows, search, "entries")
  const pagedLogSections = useMemo(() => {
    const grouped = new Map<TradeLogSectionKey, typeof logPager.items>()
    for (const item of logPager.items) {
      const existing = grouped.get(item.sectionKey) ?? []
      existing.push(item)
      grouped.set(item.sectionKey, existing)
    }
    return sections
      .map((section) => ({
        ...section,
        totalCount: section.rows.length,
        rows: (grouped.get(section.key) ?? []).map((item) => item.row),
      }))
      .filter((section) => section.rows.length > 0)
  }, [logPager.items, sections])

  if (loading) {
    return <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
  }

  if (sections.length === 0) {
    return (
      <FacultyEmptyState
        icon="list-outline"
        title={search.trim() ? "No matches" : "No trade log entries"}
        body={
          search.trim()
            ? "Try a different search term."
            : "Trades, rollovers, donations, and point requests will appear here as grouped activity."
        }
      />
    )
  }

  return (
    <View style={localStyles.panelGap}>
      {pagedLogSections.map((section) => (
        <View key={section.key} style={localStyles.logSectionBlock}>
          <TradeLogSectionHeader title={tradeLogSectionTitle(section.key)} count={section.totalCount} />
          {section.rows.map((row, index) => {
            const status = tradeLogRowStatus(row)
            const pending = status ? isTradeCenterRequestPending(status) : false
            return (
              <FacultySignatureListCard
                key={`log-${section.key}-${String(row.id ?? index)}-${tradeLogRowWhen(row)}`}
                thumb={tradeLogSectionThumb(section.key, row)}
                icon={TRADE_LOG_SECTION_ICONS[section.key]}
                title={tradeLogRowTitle(section.key, row)}
                description={tradeLogRowDescription(section.key, row)}
                status={
                  status
                    ? {
                        label: humanizeTradeStatus(status),
                        color: facultyTradeCenterRequestStatusColor(status),
                        icon: pending
                          ? "time-outline"
                          : status.toLowerCase().includes("reject")
                            ? "close-circle-outline"
                            : "checkmark-circle",
                      }
                    : undefined
                }
              />
            )
          })}
        </View>
      ))}
      <FacultyListPagerFooter pager={logPager} />
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
  const [selectedTrade, setSelectedTrade] = useState<TradeCenterRolloverTradeView | null>(null)
  const { native } = useModuleTheme()

  const trades = useMemo(() => {
    const parsed = (rollover?.trades ?? []).map((row) =>
      parseTradeCenterRolloverRow(row as Record<string, unknown>),
    )
    const q = search.trim().toLowerCase()
    if (!q) return parsed
    return parsed.filter((trade) =>
      [
        trade.studentName,
        trade.studentNumber,
        trade.section,
        trade.quizTitle,
        trade.sourceLabel,
        trade.assessmentType,
      ].some((field) => field.toLowerCase().includes(q)),
    )
  }, [rollover?.trades, search])
  const tradesPager = useFacultyListPager(trades, search, "trades")

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
    <>
      <View style={localStyles.panelGap}>
        {tradesPager.items.map((trade) => {
          const thumb = facultyTradeCenterTraderThumb(trade.studentId || trade.studentName)
          return (
            <FacultySignatureListCard
              key={`rollover-${trade.id}-${trade.studentId}-${trade.quizId}`}
              thumb={thumb}
              icon="refresh-outline"
              title={trade.studentName}
              description={rolloverTradeListDescription(trade)}
              metaLine={rolloverTradeListMeta(trade)}
              onPress={() => setSelectedTrade(trade)}
              status={{
                label: trade.isActive ? "Active" : "Expired",
                color: trade.isActive
                  ? facultyTradeCenterRequestStatusColor("approved")
                  : native.tertiaryLabel,
                icon: trade.isActive ? "checkmark-circle" : "time-outline",
              }}
            />
          )
        })}
        <FacultyListPagerFooter pager={tradesPager} />
      </View>

      <FacultyTradeCenterRolloverActionSheet
        visible={selectedTrade != null}
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />
    </>
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
  logSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  logSectionBlock: { gap: 10 },
  errorBox: { padding: 12 },
})
