import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { ModuleListRow, ModuleSection } from "../modules/ModuleScreen"
import type { CoraActivityRow, CoraBalance } from "../../lib/cora/credits/types"
import { formatCoraCreditsLabel } from "../../lib/cora/credits/economy"
import { publicCoraActivityLabel } from "../../lib/cora/models"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"

type TabId = "overview" | "activity" | "tokens" | "credits"

function fmt(n: number) {
  return Math.round(n).toLocaleString()
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  hint?: string
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  return (
    <View style={[styles.statTile, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.statLabelRow}>
        <Ionicons name={icon} size={14} color={SN.secondaryLabel} />
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>{label}</Text>
      </View>
      <Text style={[type.bodyEmphasis, styles.statValue, { color: native.label }]}>{value}</Text>
      {hint ? <Text style={[type.caption, styles.statHint, { color: SN.secondaryLabel }]}>{hint}</Text> : null}
    </View>
  )
}

function activityLabel(row: CoraActivityRow): string {
  if (row.title?.trim()) return row.title
  if (row.toolName) return row.toolName.replace(/_/g, " ")
  if (row.operation && !["agent_turn", "runCoraAgent"].includes(row.operation)) {
    return row.operation.replace(/_/g, " ")
  }
  return row.feature
}

type Props = {
  balance: CoraBalance | null
  activity: CoraActivityRow[]
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  activityPage?: number
  activityTotalPages?: number
  activityTotal?: number
  activityLoadingPage?: boolean
  onActivityPageChange?: (page: number) => void
  /** Deep link to full searchable history (settings). */
  historyHref?: string
}

export function CoraUsagePanel({
  balance,
  activity,
  loading,
  error,
  onRefresh,
  activityPage = 1,
  activityTotalPages = 1,
  activityTotal = 0,
  activityLoadingPage,
  onActivityPageChange,
  historyHref = "/settings/cora-usage",
}: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const router = useRouter()
  const [tab, setTab] = useState<TabId>("overview")

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity" },
    { id: "tokens", label: "Tokens" },
    { id: "credits", label: "Credits" },
  ]

  const onSelectTab = useCallback((id: TabId) => setTab(id), [])
  const canPrev = activityPage > 1
  const canNext = activityPage < activityTotalPages

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: hexToRgba("#F59E0B", 0.14) }]}>
          <Ionicons name="sparkles" size={18} color="#D97706" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Cora Usage</Text>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 18 }]}>
            Credits meter your plan. Tokens measure processing — not your bill.
          </Text>
        </View>
        {onRefresh ? (
          <Pressable onPress={onRefresh} hitSlop={10} accessibilityLabel="Refresh usage">
            <Ionicons name="refresh-outline" size={20} color={SN.accent} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.tabRow, { borderColor: native.separator }]}>
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <Pressable
              key={t.id}
              onPress={() => onSelectTab(t.id)}
              style={[styles.tab, active ? { backgroundColor: hexToRgba(SN.accent, 0.12) } : null]}
            >
              <Text
                style={[
                  type.caption,
                  { fontWeight: active ? "700" : "500", color: active ? SN.accent : SN.secondaryLabel },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {loading && !balance ? (
        <View style={styles.center}>
          <ActivityIndicator color={SN.accent} />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading usage…</Text>
        </View>
      ) : null}

      {error ? <Text style={[type.caption, { color: "#DC2626" }]}>{error}</Text> : null}

      {balance && tab === "overview" ? (
        <View style={styles.grid}>
          <StatTile
            icon="flash-outline"
            label="Available"
            value={formatCoraCreditsLabel(balance.credits, balance.coraMode)}
            hint={balance.isLow ? "Low balance" : balance.periodKey || undefined}
          />
          <StatTile
            icon="pulse-outline"
            label="This period used"
            value={fmt(balance.month.creditsUsed)}
            hint={`${balance.month.interactions} interactions`}
          />
          <StatTile
            icon="layers-outline"
            label="Lifetime used"
            value={fmt(balance.lifetimeCreditsUsed)}
            hint={balance.membershipTier || "—"}
          />
        </View>
      ) : null}

      {balance && tab === "activity" ? (
        <View style={styles.activityBlock}>
          {activity.length === 0 && !activityLoadingPage ? (
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>No AI activity recorded yet.</Text>
          ) : activityLoadingPage ? (
            <View style={styles.center}>
              <ActivityIndicator color={SN.accent} size="small" />
            </View>
          ) : (
            <ModuleSection>
              {activity.map((row, index) => (
                <ModuleListRow
                  key={row.id}
                  title={activityLabel(row)}
                  subtitle={`${publicCoraActivityLabel({ model: row.model, profile: row.profile })} · ${relativeTime(row.createdAt)}`}
                  meta={`${row.creditsCharged} cr · ${fmt(row.tokens.total)} tok`}
                  icon="analytics-outline"
                  last={index === activity.length - 1}
                />
              ))}
            </ModuleSection>
          )}

          {onActivityPageChange && activityTotal > 0 ? (
            <View style={styles.pager}>
              <Pressable
                onPress={() => onActivityPageChange(activityPage - 1)}
                disabled={!canPrev || activityLoadingPage}
                hitSlop={8}
                style={[styles.pagerBtn, { opacity: canPrev ? 1 : 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
              >
                <Ionicons name="chevron-back" size={18} color={SN.accent} />
                <Text style={[type.caption, { color: SN.accent, fontWeight: "600" }]}>Prev</Text>
              </Pressable>
              <Text style={[type.caption, { color: SN.secondaryLabel }]}>
                Page {activityPage} of {activityTotalPages}
                {activityTotal > 0 ? ` · ${fmt(activityTotal)}` : ""}
              </Text>
              <Pressable
                onPress={() => onActivityPageChange(activityPage + 1)}
                disabled={!canNext || activityLoadingPage}
                hitSlop={8}
                style={[styles.pagerBtn, { opacity: canNext ? 1 : 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Next page"
              >
                <Text style={[type.caption, { color: SN.accent, fontWeight: "600" }]}>Next</Text>
                <Ionicons name="chevron-forward" size={18} color={SN.accent} />
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push(historyHref as never)}
            style={styles.historyLink}
            accessibilityRole="button"
            accessibilityLabel="Open detailed Cora usage history"
          >
            <Ionicons name="time-outline" size={16} color={SN.accent} />
            <Text style={[type.caption, { color: SN.accent, fontWeight: "700", flex: 1 }]}>
              Detailed history & search
            </Text>
            <Ionicons name="chevron-forward" size={16} color={SN.accent} />
          </Pressable>
        </View>
      ) : null}

      {balance && tab === "tokens" ? (
        <View style={styles.grid}>
          <StatTile icon="arrow-down-outline" label="Input" value={fmt(balance.month.inputTokens)} />
          <StatTile icon="archive-outline" label="Cached input" value={fmt(balance.month.cachedInputTokens)} />
          <StatTile icon="arrow-up-outline" label="Output" value={fmt(balance.month.outputTokens)} />
          <StatTile icon="git-branch-outline" label="Reasoning" value={fmt(balance.month.reasoningTokens)} />
          <Text style={[type.caption, styles.footnote, { color: SN.secondaryLabel }]}>
            Total processed this month: {fmt(balance.month.tokensProcessed)} tokens. Provider dollar cost is
            not shown.
          </Text>
        </View>
      ) : null}

      {balance && tab === "credits" ? (
        <ModuleSection>
          <ModuleListRow
            title="Included remaining"
            meta={fmt(balance.includedBalance)}
            icon="gift-outline"
          />
          <ModuleListRow
            title="Purchased remaining"
            meta={fmt(balance.purchasedBalance)}
            icon="cart-outline"
          />
          <ModuleListRow
            title="Reserved (in flight)"
            meta={fmt(balance.reservedCredits)}
            icon="time-outline"
          />
          <ModuleListRow
            title="Available"
            meta={fmt(balance.credits)}
            icon="checkmark-circle-outline"
            last
          />
        </ModuleSection>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 2 },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  grid: { gap: 10 },
  activityBlock: { gap: 10 },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pagerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 64,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  statTile: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statValue: { fontSize: 20, fontVariant: ["tabular-nums"] },
  statHint: { fontWeight: "500" },
  center: { alignItems: "center", gap: 8, paddingVertical: 20 },
  footnote: { lineHeight: 18, marginTop: 4 },
})
