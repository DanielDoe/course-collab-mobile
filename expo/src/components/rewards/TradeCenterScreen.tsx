import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { CollabSearch } from "../collaboration/collab-shared"
import { SignatureListCard } from "../theme/SignatureListCard"
import { PillSwipeTabs } from "../theme/PillSwipeTabs"
import type { MobbinPillSegmentOption } from "../theme/MobbinPillSegmentControl"
import { signatureListStyles } from "../theme/TabbedModuleLayout"
import {
  formatRelativeTime,
  rewardsApi,
  type PointRequest,
  type TradeCenterConfig,
  type TradeCenterPoints,
  type TradeHistoryItem} from "../../lib/rewards-api"
import { EmptyBlock, SectionLabel, useRewardsTheme } from "./rewards-shared"
import {
  TRADE_CENTER_ACTION,
  TRADE_CENTER_BALANCE_THEMES,
  tradeCenterHistoryTheme,
  tradeCenterProgressTrack,
  type TradeCenterBalanceKey,
} from "../../lib/trade-center-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { NativeSelect } from "../NativeSelect"
import { TRADE_CAP_OPTIONS, withCurrentOption } from "../faculty/FacultyNativePickers"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Tab = "overview" | "trade" | "donate" | "requests" | "history"

const TAB_OPTIONS: MobbinPillSegmentOption<Tab>[] = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "trade", label: "Trade", icon: "trophy-outline" },
  { id: "donate", label: "Donate", icon: "heart-outline" },
  { id: "requests", label: "Requests", icon: "mail-outline" },
  { id: "history", label: "History", icon: "time-outline" },
]

function BalanceTile({
  statKey,
  label,
  value,
  cap,
  capLabel = "weekly cap",
}: {
  statKey: TradeCenterBalanceKey
  label: string
  value: number
  cap?: number
  capLabel?: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const stat = TRADE_CENTER_BALANCE_THEMES[statKey]
  const thumb = solidListThumbFixed(stat.fill, stat.iconInk)
  const pct = cap ? Math.min(100, (value / cap) * 100) : 0

  return (
    <View style={[styles.balanceTile, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.balanceHead}>
        <SolidListThumbTile thumb={thumb} icon={stat.icon} size="compact" />
        <Text style={[type.bodyEmphasis, styles.balanceLabel, { color: native.label }]}>{label}</Text>
        <Text style={[styles.balanceValue, { color: stat.valueInk }]}>{value}</Text>
      </View>
      {cap ? (
        <>
          <View style={[styles.track, { backgroundColor: tradeCenterProgressTrack(stat.fill, tokens.isDark) }]}>
            <View style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: stat.fill }]} />
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {value} / {cap} {capLabel}
          </Text>
        </>
      ) : null}
    </View>
  )
}

function HistoryListCard({ item, index }: { item: TradeHistoryItem; index: number }) {
  const historyTheme = tradeCenterHistoryTheme(item.transaction_type)
  return (
    <SignatureListCard
      index={index}
      title={item.summary ?? item.transaction_type ?? "Activity"}
      meta={formatRelativeTime(item.created_at)}
      statusLabel={item.transaction_type === "DONATION" ? "Donation" : "Trade"}
      statusColor={historyTheme.valueInk}
      statusIcon={item.transaction_type === "DONATION" ? "heart" : "swap-horizontal-outline"}
      icon={historyTheme.icon}
      accent={historyTheme.fill}
      trailingValue={item.points_used != null ? `-${item.points_used}` : undefined}
      trailingValueColor={historyTheme.valueInk}
      showChevron={false}
    />
  )
}

function ActionButton({
  variant,
  label,
  onPress,
  disabled,
}: {
  variant: keyof typeof TRADE_CENTER_ACTION
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const action = TRADE_CENTER_ACTION[variant]
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: action.fill },
        disabled && styles.actionBtnDisabled,
        pressed && !disabled && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Ionicons name={action.icon} size={18} color={action.ink} />
      <Text style={[styles.actionBtnText, { color: action.ink }]}>{label}</Text>
    </Pressable>
  )
}

function RequestRow({
  req,
  onApprove,
  onReject}: {
  req: PointRequest
  onApprove?: () => void
  onReject?: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const pending = req.status?.toLowerCase() === "pending"
  return (
    <View style={[styles.requestRow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.rowBody}>
        <Text style={[type.bodyEmphasis, styles.rowTitle]}>
          {req.requester_name ?? "Student"} → {req.requestee_name ?? "You"}
        </Text>
        <Text style={type.caption}>
          {req.points ?? 0} pts · {req.source ?? "total"} · {req.status}
        </Text>
        {req.message ? (
          <Text style={[type.caption, styles.requestMsg]} numberOfLines={2}>
            {req.message}
          </Text>
        ) : null}
      </View>
      {pending && onApprove && onReject ? (
        <View style={styles.requestActions}>
          <Pressable style={styles.approveBtn} onPress={onApprove}>
            <Ionicons name="checkmark" size={18} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.rejectBtn} onPress={onReject}>
            <Ionicons name="close" size={18} color="#dc2626" />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

export function TradeCenterScreen() {
  const session = useStudentSession()
  const theme = useRewardsTheme()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const scrollPad = useModuleScrollContentPadding()
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [points, setPoints] = useState<TradeCenterPoints>({})
  const [config, setConfig] = useState<TradeCenterConfig>({})
  const [canTrade, setCanTrade] = useState(false)
  const [tradingEnabled, setTradingEnabled] = useState(true)
  const [donationsEnabled, setDonationsEnabled] = useState(true)
  const [pointsPerEc, setPointsPerEc] = useState(100)
  const [lifetimeEc, setLifetimeEc] = useState(0)
  const [ecAvailable, setEcAvailable] = useState(0)
  const [history, setHistory] = useState<TradeHistoryItem[]>([])
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([])
  const [tradeAmount, setTradeAmount] = useState("")
  const [donateAmount, setDonateAmount] = useState("")
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [pointsData, historyData, requestsData] = await Promise.all([
        rewardsApi.getTradeCenterPoints(session),
        rewardsApi.getTradeHistory(session),
        rewardsApi.getPointRequests(session),
      ])
      setPoints(pointsData.points ?? {})
      setConfig(pointsData.config ?? {})
      setCanTrade(!!pointsData.canTrade)
      setTradingEnabled(pointsData.tradingEnabled !== false)
      setDonationsEnabled(pointsData.donationsEnabled !== false)
      setPointsPerEc(pointsData.pointsPerEc ?? 100)
      setLifetimeEc(
        pointsData.lifetimeEngagementCredits ??
          Number(pointsData.points?.engagement_credits ?? 0),
      )
      setEcAvailable(Number(pointsData.ecAvailable ?? 0))
      setHistory(historyData.transactions ?? [])
      setPointRequests(requestsData.requests ?? historyData.pointRequests ?? [])
      setError("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load trade center.")
    }
  }, [session])

  useNotificationModuleRefresh("trade-center", load)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  // Match web: prefer server tradable_points; else total + carried-over activity.
  const tradable = Number(
    points.tradable_points ??
      Number(points.total_points ?? 0) + Number(points.carried_over_points ?? 0),
  )
  const maxTradedEc = Number(config.max_engagement_credits ?? 10)
  const engagementCredits = Number(lifetimeEc || points.engagement_credits || 0)

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return history
    return history.filter(
      (item) =>
        (item.summary ?? item.transaction_type ?? "Activity").toLowerCase().includes(q) ||
        (item.transaction_type ?? "").toLowerCase().includes(q),
    )
  }, [history, search])

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pointRequests
    return pointRequests.filter(
      (req) =>
        (req.requester_name ?? "Student").toLowerCase().includes(q) ||
        (req.requestee_name ?? "You").toLowerCase().includes(q) ||
        (req.message ?? "").toLowerCase().includes(q),
    )
  }, [pointRequests, search])

  async function handleSync() {
    if (!session) return
    setBusy(true)
    try {
      await rewardsApi.syncTradePoints(session)
      await load()
      AppAlert.alert("Synced", "Your point balances are up to date.")
    } catch (err) {
      AppAlert.alert("Sync failed", err instanceof ApiError ? err.message : "Could not sync points.")
    } finally {
      setBusy(false)
    }
  }

  async function handleTrade() {
    if (!session) return
    const amt = Number(tradeAmount)
    if (!amt || amt <= 0) {
      AppAlert.alert("Invalid amount", "Enter how many points to trade.")
      return
    }
    setBusy(true)
    try {
      const result = await rewardsApi.tradePoints(session, amt)
      AppAlert.alert(
        "Trade complete",
        result.message ?? `Gained ${result.creditsGained ?? 0} engagement credit(s).`,
      )
      setTradeAmount("")
      await load()
    } catch (err) {
      AppAlert.alert("Trade failed", err instanceof ApiError ? err.message : "Could not complete trade.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDonate() {
    if (!session) return
    const amt = Number(donateAmount)
    const min = config.min_donation_points ?? 100
    if (!amt || amt < min) {
      AppAlert.alert("Invalid amount", `Minimum community donation is ${min} points.`)
      return
    }
    setBusy(true)
    try {
      const result = await rewardsApi.donateToCommunity(session, amt)
      AppAlert.alert("Donated", result.message ?? "Thank you for contributing to the community pool.")
      setDonateAmount("")
      await load()
    } catch (err) {
      AppAlert.alert("Donation failed", err instanceof ApiError ? err.message : "Could not donate points.")
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove(id: number) {
    if (!session) return
    try {
      const result = await rewardsApi.approvePointRequest(session, id)
      await load()
      AppAlert.alert(
        "Approved",
        result.message ?? "Request approved. Awaiting instructor approval to finalize.",
      )
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not approve request.")
    }
  }

  async function handleReject(id: number) {
    if (!session) return
    try {
      const result = await rewardsApi.rejectPointRequest(session, id)
      await load()
      if (result.message) AppAlert.alert("Rejected", result.message)
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not reject request.")
    }
  }

  const pageScrollStyle = useMemo(
    () => ({
      paddingBottom: scrollPad.paddingBottom,
      flexGrow: 1 as const,
    }),
    [scrollPad.paddingBottom],
  )

  function wrapPage(content: ReactNode) {
    if (loading && !refreshing) {
      return (
        <View style={styles.pageCenter}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading trade center…</Text>
        </View>
      )
    }

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageScrollStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        directionalLockEnabled
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        {content}
      </ScrollView>
    )
  }

  function handlePillChange(next: Tab) {
    setTab(next)
  }

  function renderOverviewPage() {
    return (
      <View style={styles.section}>
        <SectionLabel title="Engagement credits" hint="Updated after successful trades (gradebook uses /100)" />
        <BalanceTile
          statKey="lifetimeEc"
          label="Lifetime EC"
          value={engagementCredits}
        />
        {maxTradedEc > 0 ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            Point trades cap at {maxTradedEc} EC. Lifetime total also includes evaluations and other awards.
          </Text>
        ) : null}
        <View style={[styles.totalRow, { borderTopColor: native.separator }]}>
          <Text style={[type.secondary, styles.totalLabel]}>EC available to earn</Text>
          <Text style={[type.bodyEmphasis, styles.totalValue, { color: theme.primary }]}>
            {Math.max(0, Math.round(ecAvailable))}
          </Text>
        </View>
        <View style={[styles.totalRow, { borderTopColor: native.separator }]}>
          <Text style={[type.secondary, styles.totalLabel]}>Tradable activity points</Text>
          <Text style={[type.bodyEmphasis, styles.totalValue, { color: theme.primary }]}>
            {Math.round(tradable)}
          </Text>
        </View>

        <SectionLabel title="Weekly activity points" hint="Earn from practice, playground, and reading" />
        <BalanceTile
          statKey="practice"
          label="Practice"
          value={Number(points.practice_points ?? 0)}
          cap={config.weekly_practice_cap}
        />
        <BalanceTile
          statKey="playground"
          label="Playground"
          value={Number(points.playground_points ?? 0)}
          cap={config.weekly_playground_cap}
        />
        <BalanceTile
          statKey="reading"
          label="Reading"
          value={Number(points.reading_points ?? 0)}
          cap={config.weekly_reading_cap}
        />
        <View style={[styles.totalRow, { borderTopColor: native.separator }]}>
          <Text style={[type.secondary, styles.totalLabel]}>Carried over</Text>
          <Text style={[type.bodyEmphasis, styles.totalValue, { color: theme.primary }]}>
            {Number(points.carried_over_points ?? 0)}
          </Text>
        </View>
        <View style={[styles.totalRow, { borderTopColor: native.separator }]}>
          <Text style={[type.secondary, styles.totalLabel]}>This week total</Text>
          <Text style={[type.bodyEmphasis, styles.totalValue, { color: theme.primary }]}>
            {Number(points.total_points ?? 0)}
          </Text>
        </View>
      </View>
    )
  }

  function renderTradePage() {
    return (
      <View style={[styles.actionCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        {!tradingEnabled ? (
          <Text style={type.secondary}>Trading is currently disabled by your instructor.</Text>
        ) : (
          <>
            <Text style={type.bodyEmphasis}>Trade for engagement credits</Text>
            <Text style={[type.secondary, styles.actionHint]}>
              {pointsPerEc} activity points = 1 EC. You have {Math.round(tradable)} tradable points
              {engagementCredits > 0 ? ` · ${engagementCredits} EC earned` : ""}.
            </Text>
            <NativeSelect
              placeholder="Points to trade"
              value={tradeAmount}
              options={withCurrentOption(TRADE_CAP_OPTIONS, tradeAmount, `${tradeAmount} pts`)}
              onChange={setTradeAmount}
            />
            <ActionButton
              variant="trade"
              label={busy ? "Trading…" : "Trade points"}
              onPress={handleTrade}
              disabled={!canTrade || busy}
            />
          </>
        )}
      </View>
    )
  }

  function renderDonatePage() {
    return (
      <View style={[styles.actionCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        {!donationsEnabled ? (
          <Text style={type.secondary}>Donations are currently disabled.</Text>
        ) : (
          <>
            <Text style={type.bodyEmphasis}>Donate to community pool</Text>
            <Text style={[type.secondary, styles.actionHint]}>
              Minimum donation: {config.min_donation_points ?? 100} points. Helps classmates who need support.
            </Text>
            <NativeSelect
              placeholder="Points to donate"
              value={donateAmount}
              options={withCurrentOption(TRADE_CAP_OPTIONS, donateAmount, `${donateAmount} pts`)}
              onChange={setDonateAmount}
            />
            <ActionButton
              variant="donate"
              label={busy ? "Donating…" : "Donate"}
              onPress={handleDonate}
              disabled={busy}
            />
          </>
        )}
      </View>
    )
  }

  function renderRequestsPage() {
    if (filteredRequests.length === 0) {
      return (
        <EmptyBlock
          icon="mail-outline"
          title="No point requests"
          body="Peer requests to share points will appear here for you to approve or decline."
        />
      )
    }
    return (
      <View style={signatureListStyles.list}>
        {filteredRequests.map((req) => (
          <RequestRow
            key={req.id}
            req={req}
            onApprove={() => handleApprove(req.id)}
            onReject={() => handleReject(req.id)}
          />
        ))}
      </View>
    )
  }

  function renderHistoryPage() {
    if (filteredHistory.length === 0) {
      return (
        <EmptyBlock
          icon="time-outline"
          title="No activity yet"
          body="Trades and donations will show up in your history."
        />
      )
    }
    return (
      <View style={signatureListStyles.list}>
        {filteredHistory.map((item, index) => (
          <HistoryListCard key={item.id} item={item} index={index} />
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View
        style={[
          styles.chrome,
          {
            paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding,
            paddingHorizontal: NATIVE.pagePadding,
          },
        ]}
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}18` }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}

        <CollabSearch
          value={search}
          onChange={setSearch}
          placeholder={
            tab === "history"
              ? "Search trade history…"
              : tab === "requests"
                ? "Search point requests…"
                : "Search trade center…"
          }
          trailingAction={{
            onPress: () => void handleSync(),
            accessibilityLabel: "Sync balances",
            icon: "refresh-outline",
          }}
        />
      </View>

      <View style={styles.topBar}>
        <PillSwipeTabs
          options={TAB_OPTIONS}
          value={tab}
          onChange={handlePillChange}
          pagePaddingHorizontal={NATIVE.pagePadding}
          scrollable
          visibleSegmentCount={3}
          pages={[
            wrapPage(renderOverviewPage()),
            wrapPage(renderTradePage()),
            wrapPage(renderDonatePage()),
            wrapPage(renderRequestsPage()),
            wrapPage(renderHistoryPage()),
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { gap: 12, paddingBottom: 4 },
  topBar: { flex: 1 },
  pageScroll: { flex: 1 },
  pageCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  errorBox: { padding: 12, borderRadius: NATIVE.sectionRadius },
  errorText: { fontSize: 14, lineHeight: 20 },
  section: { gap: 10 },
  balanceTile: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  balanceHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  balanceLabel: { flex: 1, fontSize: 14 },
  balanceValue: { fontSize: 16, fontWeight: "600" },
  track: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 999,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 13, fontWeight: "600" },
  totalValue: { fontSize: 15, fontWeight: "600" },
  actionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  actionHint: { lineHeight: 18 },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: { fontSize: 15, fontWeight: "600" },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 999,
    padding: 14,
    borderWidth: 1,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"},
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14 },
  historyPts: { fontSize: 14, fontWeight: "600", color: "#dc2626" },
  requestRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  requestMsg: { marginTop: 4, fontStyle: "italic" },
  requestActions: { flexDirection: "row", gap: 6 },
  approveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center"},
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca"}})
