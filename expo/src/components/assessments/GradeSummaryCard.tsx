import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, G } from "react-native-svg"
import { Ionicons } from "@/components/icons/AppIcon"
import { hexToRgba } from "../../constants/app-themes"
import type { AssessmentSectionBreakdown } from "../../lib/assessment-results-api"
import type { AssessmentListKind } from "./assessment-config"
import { formatAssessmentType } from "./assessment-config"
import { useAssessmentTheme, useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  REPORT_SOLID,
  reportCorrectPillStyle,
  reportDonutInnerFill,
  reportDonutTrackStroke,
  reportPerformanceColor,
  reportSectionTheme,
} from "../../lib/assessment-report-theme"

const DONUT_SIZE = 188
const DONUT_RADIUS = 75
const DONUT_STROKE = 12
const DONUT_CIRC = 2 * Math.PI * DONUT_RADIUS

function performanceLabel(kind: AssessmentListKind): string {
  switch (kind) {
    case "homework":
      return "Homework Performance Summary"
    case "mid_semester":
      return "Mid-Semester Exam Summary"
    case "final":
      return "Final Exam Summary"
    default:
      return "Quiz Performance Summary"
  }
}

function formatWhen(value?: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function formatPct(value: number): string {
  return Number(value) % 1 === 0 ? `${Math.round(value)}%` : `${value.toFixed(1)}%`
}

function formatPts(value: number): string {
  return Number(value) % 1 === 0 ? String(Math.round(value)) : value.toFixed(1)
}

type GradeSummaryCardProps = {
  title: string
  kind: AssessmentListKind
  percentage: number
  score: number
  totalPoints: number
  correctAnswers?: number | null
  totalQuestions: number
  completedAt?: string | null
  showPnd: boolean
  pendingCount: number
  autoSubmitted?: boolean
  violationReason?: string | null
  sectionBreakdown?: AssessmentSectionBreakdown[]
  locked?: boolean
  selectedSection?: string | null
  onSectionPress?: (title: string) => void
}

export function GradeSummaryCard({
  title,
  kind,
  percentage,
  score,
  totalPoints,
  correctAnswers,
  totalQuestions,
  completedAt,
  showPnd,
  pendingCount,
  autoSubmitted,
  violationReason,
  sectionBreakdown,
  locked,
  selectedSection,
  onSectionPress}: GradeSummaryCardProps) {
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const { tokens } = useAssessmentTheme()
  const gradedPct = Math.min(100, Math.max(0, percentage))
  const progressLength = showPnd ? 0 : (gradedPct / 100) * DONUT_CIRC
  const arcColor = showPnd ? REPORT_SOLID.pending : reportPerformanceColor(gradedPct)
  const correctPill = reportCorrectPillStyle(tokens)
  const displayPct = showPnd ? "PND" : String(Math.round(gradedPct))
  const when = formatWhen(completedAt)

  return (
    <View style={[styles.card, { backgroundColor: SN.secondaryGrouped }]}>
      <Text style={[type.sheetTitle, styles.title, { color: tokens.text }]} numberOfLines={3}>
        {title}
      </Text>
      <Text style={[type.caption, styles.subtitle, { color: tokens.textSecondary }]}>
        {performanceLabel(kind)}
      </Text>
      {when ? (
        <Text style={[type.footnote, styles.dateLine, { color: SN.secondaryLabel }]}>
          {formatAssessmentType(kind)} · Completed {when}
        </Text>
      ) : null}

      <View style={styles.gaugeWrap}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox="0 0 200 200">
          <Circle
            cx="100"
            cy="100"
            r="62"
            fill={reportDonutInnerFill(tokens, showPnd, gradedPct)}
          />
          <G transform="rotate(-90 100 100)">
            <Circle
              cx="100"
              cy="100"
              r={DONUT_RADIUS}
              stroke={reportDonutTrackStroke(tokens)}
              strokeWidth={DONUT_STROKE}
              fill="none"
            />
            {!showPnd ? (
              <Circle
                cx="100"
                cy="100"
                r={DONUT_RADIUS}
                stroke={arcColor}
                strokeWidth={DONUT_STROKE}
                fill="none"
                strokeDasharray={`${progressLength} ${DONUT_CIRC}`}
                strokeLinecap="butt"
              />
            ) : null}
          </G>
        </Svg>
        <View style={styles.gaugeCenter} pointerEvents="none">
          {showPnd ? (
            <Text style={[styles.pndText, { color: tokens.warning }]}>PND%</Text>
          ) : (
            <View style={styles.pctRow}>
              <Text style={[styles.pctValue, { color: tokens.text }]}>{displayPct}</Text>
              <Text style={[styles.pctSymbol, { color: tokens.textSecondary }]}>%</Text>
            </View>
          )}
        </View>
      </View>

      {showPnd ? (
        <Text style={[styles.pndNote, { color: tokens.textSecondary }]}>
          Your answers are saved. Score is pending review — this is not a final grade.
        </Text>
      ) : null}

      {autoSubmitted || violationReason ? (
        <View
          style={[
            styles.warnRow,
            { backgroundColor: hexToRgba(tokens.warning, tokens.isDark ? 0.18 : 0.12) },
          ]}
        >
          <Ionicons name="warning-outline" size={16} color={tokens.warning} />
          <Text style={[styles.warnText, { color: tokens.warning }]}>
            Auto-submitted{violationReason ? `: ${violationReason}` : "."}
          </Text>
        </View>
      ) : null}

      <View
        style={
          showPnd
            ? [
                styles.scoreCardPending,
                {
                  borderColor: hexToRgba(tokens.warning, tokens.isDark ? 0.38 : 0.35),
                  backgroundColor: hexToRgba(tokens.warning, tokens.isDark ? 0.14 : 0.08),
                },
              ]
            : [
                styles.scoreCard,
                {
                  borderColor: hexToRgba(tokens.accent, 0.15),
                  backgroundColor: hexToRgba(tokens.accent, 0.04),
                },
              ]
        }
      >
        <View style={styles.scoreCardTop}>
          <View style={styles.scoreLabelRow}>
            <Ionicons
              name={showPnd ? "time-outline" : "trophy-outline"}
              size={18}
              color={showPnd ? tokens.warning : tokens.accent}
            />
            <Text style={[styles.scoreLabel, { color: tokens.text }]}>
              {showPnd ? "Score pending" : "Points on this attempt"}
            </Text>
          </View>
          <View style={styles.scoreValues}>
            {showPnd ? (
              <>
                <Text style={[styles.scoreMain, { color: tokens.warning }]}>Pending</Text>
                <Text style={[styles.scoreSlash, { color: tokens.textSecondary }]}>/</Text>
                <Text style={[styles.scoreTotal, { color: tokens.textSecondary }]}>
                  {totalPoints || totalQuestions}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.scoreMain, { color: tokens.text }]}>{formatPts(score)}</Text>
                <Text style={[styles.scoreSlash, { color: tokens.textSecondary }]}>/</Text>
                <Text style={[styles.scoreTotal, { color: tokens.textSecondary }]}>
                  {totalPoints || totalQuestions}
                </Text>
              </>
            )}
            <Text style={[styles.scorePts, { color: tokens.textSecondary }]}>pts</Text>
          </View>
        </View>

        {!showPnd ? (
          <View style={[styles.progressTrack, { backgroundColor: hexToRgba(tokens.accent, 0.1) }]}>
            <View style={[styles.progressFill, { width: `${gradedPct}%`, backgroundColor: arcColor }]} />
          </View>
        ) : null}

        {!locked && correctAnswers != null && !showPnd ? (
          <View style={[styles.correctRow, { backgroundColor: correctPill.backgroundColor, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={correctPill.color} />
            <Text style={[styles.correctText, { color: correctPill.color }]}>
              {correctAnswers} / {totalQuestions} correct
            </Text>
          </View>
        ) : null}

        {pendingCount > 0 && !showPnd ? (
          <View style={styles.pendingInline}>
            <Ionicons name="time-outline" size={14} color={tokens.warning} />
            <Text style={[styles.pendingInlineText, { color: tokens.warning }]}>
              {pendingCount} question{pendingCount === 1 ? "" : "s"} awaiting manual review
            </Text>
          </View>
        ) : null}
      </View>

      {!showPnd && !locked ? (
        <View style={[styles.attemptScoreRow, { borderTopColor: tokens.border }]}>
          <Text style={[type.sectionHeader, { color: SN.secondaryLabel }]}>Attempt score</Text>
          <Text
            style={[
              styles.attemptPct,
              { color: reportPerformanceColor(gradedPct) },
            ]}
          >
            {Math.round(gradedPct)}%
          </Text>
        </View>
      ) : null}

      {sectionBreakdown && sectionBreakdown.length > 0 && !locked ? (
        <View style={styles.sectionsBlock}>
          <Text style={[type.sectionHeader, styles.sectionsHeading, { color: tokens.textSecondary }]}>
            Section Breakdown
          </Text>
          <View style={styles.sectionsGrid}>
            {sectionBreakdown.map((section) => {
              const theme = reportSectionTheme(section.sectionPercentage, tokens)
              const contribution =
                section.weightPercent > 0 && section.max > 0
                  ? ((section.earned / section.max) * section.weightPercent).toFixed(1)
                  : "0"
              const selected = selectedSection === section.title
              return (
                <Pressable
                  key={section.title}
                  style={[
                    styles.sectionCard,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                    selected && styles.sectionCardSelected,
                  ]}
                  onPress={() => onSectionPress?.(section.title)}
                >
                  <Text style={[styles.sectionCardTitle, { color: theme.title }]} numberOfLines={2}>
                    {section.title}
                  </Text>
                  <Text style={[styles.sectionWeight, { color: theme.muted }]}>
                    {section.weightPercent}% weight
                  </Text>
                  <Text style={[styles.sectionPct, { color: theme.pct }]}>
                    {formatPct(section.sectionPercentage)}
                  </Text>
                  <View style={styles.sectionPtsRow}>
                    <Text style={[styles.sectionPtsLabel, { color: theme.muted }]}>Points</Text>
                    <Text style={[styles.sectionPtsValue, { color: theme.title }]}>
                      {formatPts(section.earned)} / {formatPts(section.max)}
                    </Text>
                  </View>
                  <View style={[styles.sectionBadge, { backgroundColor: theme.badge }]}>
                    <Text style={[styles.sectionBadgeText, { color: theme.badgeText }]}>
                      +{contribution} to total
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  title: {
    textAlign: "center",
    lineHeight: 28,
  },
  subtitle: {
    fontWeight: "600",
    textAlign: "center",
  },
  dateLine: {
    fontWeight: "600",
    textAlign: "center",
    marginTop: -4,
  },
  gaugeWrap: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4},
  gaugeCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"},
  pctRow: {
    flexDirection: "row",
    alignItems: "baseline"},
  pctValue: {
    fontSize: 44,
    fontWeight: "600",
    letterSpacing: -1,
  },
  pctSymbol: {
    fontSize: 22,
    fontWeight: "600",
    marginLeft: 1,
  },
  pndText: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  pndNote: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  warnRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "stretch",
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  scoreCard: {
    alignSelf: "stretch",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  scoreCardPending: {
    alignSelf: "stretch",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  scoreCardTop: {
    gap: 10,
  },
  scoreLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  scoreValues: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    alignSelf: "flex-end",
  },
  scoreMain: {
    fontSize: 22,
    fontWeight: "600",
  },
  scoreSlash: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 2,
  },
  scoreTotal: {
    fontSize: 18,
    fontWeight: "700",
  },
  scorePts: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999},
  correctRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6},
  correctText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pendingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2},
  pendingInlineText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  attemptScoreRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
  },
  attemptPct: {
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  sectionsBlock: {
    alignSelf: "stretch",
    gap: 12,
    marginTop: 4},
  sectionsHeading: {
    textAlign: "center",
  },
  sectionsGrid: {
    gap: 10},
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  sectionCardSelected: {
    borderWidth: 2,
    borderColor: REPORT_SOLID.selectedRing,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  sectionWeight: {
    fontSize: 11,
    fontWeight: "600",
    alignSelf: "flex-end",
    marginTop: -2,
  },
  sectionPct: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center"},
  sectionPtsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"},
  sectionPtsLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionPtsValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionBadge: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10},
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "700"}})
