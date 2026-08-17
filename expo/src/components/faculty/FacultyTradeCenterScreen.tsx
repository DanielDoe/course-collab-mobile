import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type TradeCenterAnalytics,
  type TradeCenterRolloverResponse,
  type TradeCenterTradeLog,
} from "../../lib/instructor-api"
import {
  parseTradeCenterConfig,
  TRADE_CENTER_TABS,
  mergeTradeCenterDevDonationFixtures,
  mergeTradeCenterDevPointFixtures,
  mergeTradeCenterDevRolloverResponse,
  isTradeCenterRequestPending,
  type TradeCenterConfig,
  type TradeCenterMenuTab,
} from "../../lib/faculty-trade-center-utils"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyTradeCenterActionSheet } from "./FacultyTradeCenterActionSheet"
import {
  TradeCenterActivitySettingsPanel,
  TradeCenterAnalyticsPanel,
  TradeCenterConfigPanel,
  TradeCenterDonationsPanel,
  TradeCenterOverviewPanel,
  TradeCenterRolloverPanel,
  TradeCenterTradeLogPanel,
} from "./FacultyTradeCenterPanels"
import { FACULTY_TRADE_CENTER_COLOR } from "../../lib/faculty-trade-center-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { semanticSoft } from "../../lib/themed-module-theme"
import {
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"

const SEARCH_TABS: TradeCenterMenuTab[] = [
  "overview",
  "analytics",
  "donations",
  "trade-log",
  "rollover-trades",
]

export function FacultyTradeCenterScreen() {
  const { styles: moduleStyles, tokens, type } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<TradeCenterMenuTab>("overview")
  const [search, setSearch] = useState("")
  const [actionSheetOpen, setActionSheetOpen] = useState(false)

  const [analytics, setAnalytics] = useState<TradeCenterAnalytics | null>(null)
  const [config, setConfig] = useState<TradeCenterConfig | null>(null)
  const [donations, setDonations] = useState<Array<Record<string, unknown>>>([])
  const [pointRequests, setPointRequests] = useState<Array<Record<string, unknown>>>([])
  const [tradeLog, setTradeLog] = useState<TradeCenterTradeLog | null>(null)
  const [rollover, setRollover] = useState<TradeCenterRolloverResponse | null>(null)

  const [loadingCore, setLoadingCore] = useState(true)
  const [loadingDonations, setLoadingDonations] = useState(false)
  const [loadingTradeLog, setLoadingTradeLog] = useState(false)
  const [loadingRollover, setLoadingRollover] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [devFixturePatches, setDevFixturePatches] = useState<Record<number, Record<string, unknown>>>({})

  const mergedDonations = useMemo(
    () => mergeTradeCenterDevDonationFixtures(donations, devFixturePatches),
    [donations, devFixturePatches],
  )
  const mergedPointRequests = useMemo(
    () => mergeTradeCenterDevPointFixtures(pointRequests, devFixturePatches),
    [pointRequests, devFixturePatches],
  )

  const mergedRollover = useMemo(() => mergeTradeCenterDevRolloverResponse(rollover), [rollover])

  const pendingDonations = useMemo(() => {
    const countPending = (rows: Array<Record<string, unknown>>) =>
      rows.filter((row) => isTradeCenterRequestPending(row.status)).length
    return countPending(mergedDonations) + countPending(mergedPointRequests)
  }, [mergedDonations, mergedPointRequests])

  const tabItems = useMemo(
    () =>
      TRADE_CENTER_TABS.map((item) => ({
        ...item,
        count: item.id === "donations" && pendingDonations > 0 ? pendingDonations : undefined,
      })),
    [pendingDonations],
  )

  const searchPlaceholder = useMemo(() => {
    switch (tab) {
      case "overview":
        return "Filter students by name, ID, or section…"
      case "analytics":
        return "Filter top traders…"
      case "donations":
        return "Filter donation & point requests…"
      case "trade-log":
        return "Search trades, rollovers, donations…"
      case "rollover-trades":
        return "Filter rollover trades…"
      default:
        return "Search"
    }
  }, [tab])

  const loadAnalytics = useCallback(async () => {
    if (!scope) return
    setAnalytics(await instructorApi.getTradeCenterAnalytics(scope))
  }, [scope])

  const loadConfig = useCallback(async () => {
    if (!scope) return
    const raw = await instructorApi.getTradeCenterConfig(scope)
    setConfig(parseTradeCenterConfig(raw))
  }, [scope])

  const loadDonations = useCallback(async () => {
    if (!scope) return
    setLoadingDonations(true)
    try {
      const [dr, pr] = await Promise.all([
        instructorApi.getTradeCenterDonationRequests(scope),
        instructorApi.getTradeCenterPointRequests(scope),
      ])
      setDonations(dr)
      setPointRequests(pr)
    } finally {
      setLoadingDonations(false)
    }
  }, [scope])

  const loadTradeLog = useCallback(async () => {
    if (!scope) return
    setLoadingTradeLog(true)
    try {
      setTradeLog(await instructorApi.getTradeCenterTradeLog(scope))
    } finally {
      setLoadingTradeLog(false)
    }
  }, [scope])

  const loadRollover = useCallback(async () => {
    if (!scope) return
    setLoadingRollover(true)
    try {
      setRollover(
        await instructorApi.getTradeCenterRolloverTrades(scope, {
          search: search.trim() || undefined,
          limit: 50,
        }),
      )
    } finally {
      setLoadingRollover(false)
    }
  }, [scope, search])

  const loadCore = useCallback(async () => {
    if (!scope) return
    setError("")
    await Promise.all([loadAnalytics(), loadConfig(), loadDonations()])
  }, [scope, loadAnalytics, loadConfig, loadDonations])

  const refreshAll = useCallback(async () => {
    if (!scope) return
    setError("")
    await Promise.all([loadAnalytics(), loadConfig(), loadDonations(), loadTradeLog(), loadRollover()])
  }, [scope, loadAnalytics, loadConfig, loadDonations, loadTradeLog, loadRollover])

  useEffect(() => {
    if (!ready) {
      setLoadingCore(false)
      return
    }
    setLoadingCore(true)
    loadCore()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load trade center."))
      .finally(() => setLoadingCore(false))
  }, [ready, loadCore])

  useEffect(() => {
    if (!ready || !scope) return
    if (tab === "trade-log" && !tradeLog && !loadingTradeLog) {
      loadTradeLog().catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load trade log."),
      )
    }
    if (tab === "rollover-trades" && !rollover && !loadingRollover) {
      loadRollover().catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load rollover trades."),
      )
    }
  }, [tab, ready, scope, tradeLog, rollover, loadingTradeLog, loadingRollover, loadTradeLog, loadRollover])

  useEffect(() => {
    if (!ready || tab !== "rollover-trades") return
    const timer = setTimeout(() => {
      loadRollover().catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not search rollover trades."),
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [search, tab, ready, loadRollover])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }, [refreshAll])

  useNotificationModuleRefresh("trade-center", handleRefresh)

  function jumpToTab(next: TradeCenterMenuTab) {
    setTab(next)
    setSearch("")
  }

  const showSearch = SEARCH_TABS.includes(tab)
  const panelLoading =
    loadingCore ||
    (tab === "donations" && loadingDonations) ||
    (tab === "trade-log" && loadingTradeLog) ||
    (tab === "rollover-trades" && loadingRollover)

  if (!ready) {
    return (
      <View style={[moduleStyles.center, localStyles.center]}>
        <FacultyEmptyState
          icon="diamond-outline"
          title="Select a course"
          body="Trade center analytics require an active course."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, localStyles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={tab} onChange={setTab} scrollable />

        {showSearch ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            showFilter={false}
            trailingAction={{
              onPress: () => setActionSheetOpen(true),
              accessibilityLabel: "Trade center actions",
            }}
          />
        ) : null}

        {pendingDonations > 0 && tab !== "donations" ? (
          <Pressable
            style={[
              localStyles.nudgeBanner,
              {
                backgroundColor: semanticSoft(tokens.warning, tokens.isDark),
                borderColor: `${tokens.warning}33`,
              },
            ]}
            onPress={() => jumpToTab("donations")}
          >
            <Ionicons name="gift-outline" size={18} color={tokens.warning} />
            <Text style={[type.caption, localStyles.nudgeText, { color: tokens.warning }]}>
              {pendingDonations} pending request{pendingDonations === 1 ? "" : "s"} awaiting review
            </Text>
            <Ionicons name="chevron-forward" size={16} color={tokens.warning} />
          </Pressable>
        ) : null}

        {error ? (
          <View style={[moduleStyles.errorBox, localStyles.errorBox]}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={[type.caption, { color: tokens.danger, flex: 1 }]}>{error}</Text>
          </View>
        ) : null}
      </FacultyModuleStickyHeader>

      <ScrollView
        style={localStyles.scroll}
        contentContainerStyle={[localStyles.scrollContent, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_TRADE_CENTER_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {panelLoading && tab !== "config" && tab !== "activity-settings" ? (
          <ActivityIndicator color={FACULTY_TRADE_CENTER_COLOR.link} style={localStyles.loader} />
        ) : null}

        {!panelLoading || tab === "config" || tab === "activity-settings" ? (
          <>
            {tab === "overview" ? <TradeCenterOverviewPanel analytics={analytics} search={search} /> : null}
            {tab === "config" && scope ? (
              <TradeCenterConfigPanel
                scope={scope}
                config={config}
                loading={loadingCore}
                onSaved={setConfig}
              />
            ) : null}
            {tab === "analytics" ? <TradeCenterAnalyticsPanel analytics={analytics} search={search} /> : null}
            {tab === "donations" && scope ? (
              <TradeCenterDonationsPanel
                scope={scope}
                donations={mergedDonations}
                pointRequests={mergedPointRequests}
                loading={loadingDonations}
                search={search}
                onChanged={() => void loadDonations()}
                onDevFixtureUpdated={(id, patch) =>
                  setDevFixturePatches((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
                }
              />
            ) : null}
            {tab === "trade-log" ? (
              <TradeCenterTradeLogPanel tradeLog={tradeLog} loading={loadingTradeLog} search={search} />
            ) : null}
            {tab === "rollover-trades" ? (
              <TradeCenterRolloverPanel rollover={mergedRollover} loading={loadingRollover} search={search} />
            ) : null}
            {tab === "activity-settings" && scope ? (
              <TradeCenterActivitySettingsPanel
                scope={scope}
                config={config}
                loading={loadingCore}
                onSaved={setConfig}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <FacultyTradeCenterActionSheet
        visible={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        pendingDonations={pendingDonations}
        onRefresh={() => void refreshAll()}
        onJump={jumpToTab}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  headerZone: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 14 },
  loader: { marginVertical: 32 },
  nudgeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nudgeText: { flex: 1, fontWeight: "700" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
})
