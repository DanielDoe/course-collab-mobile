import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import type { TradeCenterTrader } from "../../lib/instructor-api"
import {
  formatTradeLogWhen,
  humanizeTradeStatus,
  tradeTransactionPoints,
  tradeTransactionTitle,
} from "../../lib/faculty-trade-center-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  facultyTradeCenterTraderThumb,
} from "../../lib/faculty-trade-center-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import {
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
} from "./faculty-collab-sheet-ui"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  trader: TradeCenterTrader | null
  transactions: Array<Record<string, unknown>>
  onClose: () => void
}

function requestStatusTone(status: string): "success" | "warning" | "danger" | "neutral" | "live" {
  const s = status.toLowerCase()
  if (s.includes("pending")) return "warning"
  if (s.includes("approved") || s.includes("complete")) return "live"
  if (s.includes("reject") || s.includes("fail")) return "danger"
  return "neutral"
}

export function FacultyTradeCenterTraderSheet({ visible, trader, transactions, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()

  const recentTrades = useMemo(
    () =>
      transactions
        .slice()
        .sort((a, b) => {
          const aTime = new Date(String(a.created_at ?? a.timestamp ?? 0)).getTime()
          const bTime = new Date(String(b.created_at ?? b.timestamp ?? 0)).getTime()
          return bTime - aTime
        })
        .slice(0, 12),
    [transactions],
  )

  if (!trader) return null

  const thumb = facultyTradeCenterTraderThumb(trader.id ?? trader.full_name)
  const ec = Number(trader.engagement_credits ?? 0)
  const points = Number(trader.total_points ?? 0)
  const trades = trader.total_trades_count ?? 0
  const donations = trader.total_donations_count ?? 0

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable
      accessibilityLabel="Close trader details"
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <GlassSheetHandle />
        <FacultySheetHero
          title={trader.full_name}
          subtitle={[trader.student_number, trader.section].filter(Boolean).join(" · ") || "Student trader"}
          initials={studentInitials(trader.full_name)}
          thumbColor={thumb.fill}
        />

        <FacultySheetSection label="Trading summary" tone={SHEET_SECTION.roster}>
          <FacultySheetGroupedList>
            <FacultySheetMetricRow
              icon="ribbon-outline"
              label="Engagement credits"
              value={`${ec.toFixed(1)} EC`}
            />
            <FacultySheetMetricRow icon="sparkles-outline" label="Total points" value={String(points)} />
            <FacultySheetMetricRow icon="swap-horizontal-outline" label="Completed trades" value={String(trades)} />
            <FacultySheetMetricRow
              icon="gift-outline"
              label="Donations"
              value={String(donations)}
              isLast
            />
          </FacultySheetGroupedList>
        </FacultySheetSection>

        <FacultySheetSection label="Recent trades" tone={SHEET_SECTION.edit}>
          {recentTrades.length === 0 ? (
            <FacultyEmptyState
              icon="list-outline"
              title="No trades in this period"
              body="Recent trade activity for this student will appear here when available."
            />
          ) : (
            <View style={[styles.tradeList, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
              {recentTrades.map((row, index) => {
                const title = tradeTransactionTitle(row)
                const when = formatTradeLogWhen(row.created_at ?? row.timestamp ?? row.reviewed_at)
                const pointsLabel = tradeTransactionPoints(row)
                const status = String(row.status ?? row.transaction_type ?? row.type ?? "").trim()
                return (
                  <View
                    key={`trader-trade-${String(row.id ?? index)}-${when}`}
                    style={[
                      styles.tradeRow,
                      index > 0 ? { borderTopColor: native.separator, borderTopWidth: StyleSheet.hairlineWidth } : null,
                    ]}
                  >
                    <View style={styles.tradeCopy}>
                      <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
                        {title}
                      </Text>
                      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                        {when}
                        {pointsLabel ? ` · ${pointsLabel}` : ""}
                      </Text>
                    </View>
                    {status ? (
                      <FacultyStatusPill label={humanizeTradeStatus(status)} tone={requestStatusTone(status)} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </FacultySheetSection>

        <Text style={[type.caption, styles.footerNote, { color: native.tertiaryLabel }]}>
          Showing activity from the current trade center reporting window.
        </Text>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheetHost: { alignSelf: "stretch" },
  sheet: { paddingHorizontal: 16, paddingTop: 4, gap: 4 },
  tradeList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  tradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tradeCopy: { flex: 1, gap: 2 },
  footerNote: { lineHeight: 17, marginTop: 8, marginBottom: 4 },
})
