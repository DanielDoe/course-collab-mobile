import { StyleSheet, Text, View } from "react-native"
import { useCourseInfoTheme } from "../course-info/course-info-shared"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { ScheduleAdjustmentDetail } from "../../lib/schedule-adjustment-api"

type ConsentStats = NonNullable<ScheduleAdjustmentDetail["consentStats"]>

export function bumpConsentStats(stats: ConsentStats): ConsentStats {
  const agreed = stats.agreed + 1
  const pending = Math.max(0, stats.pending - 1)
  const remaining = Math.max(0, stats.required - agreed)
  const percentOfClass = stats.total > 0 ? Math.round((agreed / stats.total) * 100) : 0
  const percentTowardThreshold =
    stats.required > 0 ? Math.min(100, Math.round((agreed / stats.required) * 100)) : 0
  const thresholdMet = stats.declined === 0 && agreed >= stats.required
  return {
    ...stats,
    agreed,
    pending,
    remaining,
    percentOfClass,
    percentTowardThreshold,
    thresholdMet,
  }
}

export function ConsentProgressCard({
  stats,
  requestStatus,
}: {
  stats: ConsentStats
  requestStatus?: string | null
}) {
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()

  const finalized = requestStatus === "FINALIZED" || requestStatus === "COMPLETED"
  const awaitingFinalize =
    requestStatus === "CONSENT_COMPLETE" ||
    requestStatus === "READY_TO_FINALIZE" ||
    (stats.thresholdMet && requestStatus === "COLLECTING_CONSENT")

  if (finalized) {
    return (
      <View style={[styles.card, styles.completeCard, { borderColor: "rgba(16,185,129,0.35)" }]}>
        <Text style={[type.bodyEmphasis, { color: "#047857" }]}>Schedule change complete</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 4 }]}>
          {stats.agreed} of {stats.total} students consented. Calendars are updated for the section.
        </Text>
      </View>
    )
  }

  if (awaitingFinalize) {
    return (
      <View style={[styles.card, { backgroundColor: "rgba(124,58,237,0.08)", borderColor: native.separator }]}>
        <Text style={type.bodyEmphasis}>Consent threshold reached</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 4 }]}>
          {stats.agreed} of {stats.total} students ({stats.percentOfClass}%) have consented — meeting the{" "}
          {stats.thresholdPercent}% requirement. Waiting for the instructor to finalize so everyone's calendar
          updates together.
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.header}>
        <Text style={type.bodyEmphasis}>Class consent progress</Text>
        <Text style={[type.caption, { color: theme.primary }]}>{stats.percentTowardThreshold}% toward finalize</Text>
      </View>
      <View style={[styles.track, { backgroundColor: native.separator }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: theme.primary,
              width: `${Math.min(100, stats.percentTowardThreshold)}%`,
            },
          ]}
        />
      </View>
      <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 8 }]}>
        <Text style={type.bodyEmphasis}>
          {stats.agreed} of {stats.required}
        </Text>{" "}
        consents needed ({stats.thresholdPercent}% of {stats.total} enrolled) ·{" "}
        <Text style={type.bodyEmphasis}>{stats.remaining} more</Text> until the instructor can finalize and update
        calendars for everyone.
        {stats.declined > 0
          ? ` · ${stats.declined} concern${stats.declined === 1 ? "" : "s"} recorded (must be resolved).`
          : ""}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  completeCard: {
    backgroundColor: "rgba(16,185,129,0.1)",
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
})
