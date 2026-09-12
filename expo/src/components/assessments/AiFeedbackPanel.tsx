import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, G } from "react-native-svg"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import type { AiFeedback } from "../../lib/assessment-results-api"
import { hexToRgba } from "../../constants/app-themes"
import { hasProcessedAiFeedback } from "../../lib/ai-feedback-display"
import {
  buildAiFeedbackRubric,
  formatRubricPoints,
  scoreToneColor,
  type RubricRow,
} from "../../lib/ai-feedback-rubric"
import { prepareAssessmentReportMarkdownList } from "../../lib/assessment-report-markdown"
import { useAssessmentTheme, useThemedStudentNative } from "../../lib/themed-module-theme"
import { reportBadgeColors } from "../../lib/assessment-report-theme"
import { AssessmentReportMarkdownContent } from "./AssessmentReportMarkdownContent"

const SCORE_RING = 72
const SCORE_RADIUS = 28
const SCORE_STROKE = 6
const SCORE_CIRC = 2 * Math.PI * SCORE_RADIUS

type Props = {
  feedback: AiFeedback
  questionMaxPoints?: number
  pointsEarned?: number
}

function formatPctDisplay(value: number): string {
  return value % 1 === 0 ? `${Math.round(value)}%` : `${value.toFixed(1)}%`
}

function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const { tokens } = useAssessmentTheme()
  const clamped = Math.min(100, Math.max(0, pct))
  const arc = (clamped / 100) * SCORE_CIRC
  const display = formatPctDisplay(clamped)

  return (
    <View style={styles.scoreRingWrap}>
      <Svg width={SCORE_RING} height={SCORE_RING} viewBox="0 0 72 72">
        <Circle
          cx="36"
          cy="36"
          r={SCORE_RADIUS}
          stroke={hexToRgba(tokens.textMuted, tokens.isDark ? 0.28 : 0.14)}
          strokeWidth={SCORE_STROKE}
          fill="none"
        />
        <G transform="rotate(-90 36 36)">
          <Circle
            cx="36"
            cy="36"
            r={SCORE_RADIUS}
            stroke={color}
            strokeWidth={SCORE_STROKE}
            fill="none"
            strokeDasharray={`${arc} ${SCORE_CIRC}`}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.scoreRingCenter} pointerEvents="none">
        <Text style={[styles.scoreRingValue, { color }]} adjustsFontSizeToFit numberOfLines={1}>
          {display}
        </Text>
      </View>
    </View>
  )
}

function StatusBadge({ label }: { label: string }) {
  const { tokens } = useAssessmentTheme()
  const palette = reportBadgeColors("info", tokens)
  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.statusBadgeText, { color: palette.text }]}>{label}</Text>
    </View>
  )
}

function RubricRowView({ row, showPctPill = true }: { row: RubricRow; showPctPill?: boolean }) {
  const { tokens } = useAssessmentTheme()
  const barColor = scoreToneColor(row.pct, tokens)
  const pctLabel = formatPctDisplay(row.pct)

  return (
    <View style={[styles.rubricRow, { borderColor: tokens.border }]}>
      <View style={styles.rubricRowTop}>
        <Text style={[styles.rubricLabel, { color: tokens.text }]} numberOfLines={2}>
          {row.label}
        </Text>
        <View style={styles.rubricMetrics}>
          <Text style={[styles.rubricPoints, { color: tokens.textSecondary }]}>
            {formatRubricPoints(row.earned, row.max)}
          </Text>
          {showPctPill ? (
            <View
              style={[
                styles.rubricPctPill,
                {
                  backgroundColor: hexToRgba(barColor, tokens.isDark ? 0.2 : 0.12),
                  borderColor: hexToRgba(barColor, tokens.isDark ? 0.38 : 0.28),
                },
              ]}
            >
              <Text style={[styles.rubricPctPillText, { color: barColor }]}>{pctLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.rubricTrack, { backgroundColor: hexToRgba(tokens.textMuted, 0.12) }]}>
        <View
          style={[
            styles.rubricFill,
            {
              width: `${Math.min(100, Math.max(0, row.pct))}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  )
}

function MarkdownSection({
  title,
  markdown,
  icon,
}: {
  title: string
  markdown: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  const { tokens } = useAssessmentTheme()
  const SN = useThemedStudentNative()
  if (!markdown.trim()) return null

  return (
    <View style={[styles.markdownSection, { backgroundColor: SN.secondaryGrouped, borderColor: tokens.border }]}>
      <View style={styles.markdownSectionHead}>
        <Ionicons name={icon} size={14} color={tokens.accent} />
        <Text style={[styles.markdownSectionTitle, { color: tokens.text }]}>{title}</Text>
      </View>
      <AssessmentReportMarkdownContent markdown={markdown} />
    </View>
  )
}

export function AiFeedbackPanel({ feedback, questionMaxPoints, pointsEarned }: Props) {
  const { tokens } = useAssessmentTheme()
  const SN = useThemedStudentNative()
  const breakdown = feedback.gradeBreakdown

  if (!hasProcessedAiFeedback(feedback)) return null

  const overallPct =
    feedback.score != null
      ? Number(feedback.score)
      : questionMaxPoints != null && questionMaxPoints > 0 && pointsEarned != null
        ? (pointsEarned / questionMaxPoints) * 100
        : 0

  const scoreColor = scoreToneColor(overallPct, tokens)
  const rubricRows = buildAiFeedbackRubric(feedback, questionMaxPoints, pointsEarned)
  const displayRubricRows: RubricRow[] =
    rubricRows.length > 0
      ? rubricRows
      : questionMaxPoints != null && questionMaxPoints > 0
        ? [
            {
              id: "overall",
              label: "Overall",
              earned: pointsEarned ?? (overallPct / 100) * questionMaxPoints,
              max: questionMaxPoints,
              pct: overallPct,
            },
          ]
        : []
  const rubricTotalEarned = displayRubricRows.reduce((sum, row) => sum + row.earned, 0)
  const rubricTotalMax = displayRubricRows.reduce((sum, row) => sum + row.max, 0)

  return (
    <View style={[styles.panel, { borderColor: hexToRgba(tokens.accent, 0.2) }]}>
      <LinearGradient
        colors={[
          hexToRgba(tokens.accent, tokens.isDark ? 0.22 : 0.12),
          hexToRgba(tokens.accent, tokens.isDark ? 0.08 : 0.03),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <View style={styles.heroTitleRow}>
              <View style={[styles.heroIcon, { backgroundColor: hexToRgba(tokens.accent, 0.18) }]}>
                <Ionicons name="sparkles" size={16} color={tokens.accent} />
              </View>
              <Text style={[styles.heroTitle, { color: tokens.text }]}>AI Feedback</Text>
            </View>
            {feedback.aiGraded || feedback.requiresManualReview ? (
              <StatusBadge
                label={
                  feedback.requiresManualReview
                    ? "Provisional — instructor review"
                    : "Provisional AI grade"
                }
              />
            ) : null}
            {feedback.status ? <StatusBadge label={feedback.status} /> : null}
            {feedback.statusMessage ? (
              <Text style={[styles.heroMeta, { color: SN.secondaryLabel }]} numberOfLines={3}>
                {feedback.statusMessage}
              </Text>
            ) : null}
            {questionMaxPoints != null && pointsEarned != null ? (
              <Text style={[styles.heroPoints, { color: tokens.textSecondary }]}>
                Question points: {formatRubricPoints(pointsEarned, questionMaxPoints)}
              </Text>
            ) : null}
          </View>
          {(feedback.score != null || overallPct > 0) && (
            <ScoreRing pct={overallPct} color={scoreColor} />
          )}
        </View>
      </LinearGradient>

      {displayRubricRows.length > 0 ? (
        <View style={[styles.rubricBlock, { backgroundColor: SN.secondaryGrouped }]}>
          <View style={styles.rubricHeader}>
            <Text style={[styles.rubricHeading, { color: tokens.text }]}>Scoring rubric</Text>
            <View style={styles.rubricHeaderMetrics}>
              <Text style={[styles.rubricSummary, { color: tokens.textSecondary }]}>
                {formatRubricPoints(rubricTotalEarned, rubricTotalMax)}
              </Text>
              {rubricTotalMax > 0 ? (
                <View
                  style={[
                    styles.rubricPctPill,
                    {
                      backgroundColor: hexToRgba(scoreColor, tokens.isDark ? 0.2 : 0.12),
                      borderColor: hexToRgba(scoreColor, tokens.isDark ? 0.38 : 0.28),
                    },
                  ]}
                >
                  <Text style={[styles.rubricPctPillText, { color: scoreColor }]}>
                    {formatPctDisplay(
                      rubricTotalMax > 0 ? (rubricTotalEarned / rubricTotalMax) * 100 : overallPct,
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          {displayRubricRows.map((row) => (
            <RubricRowView key={row.id} row={row} showPctPill={displayRubricRows.length > 1} />
          ))}
        </View>
      ) : null}

      <View style={styles.body}>
        {feedback.feedback ? (
          <MarkdownSection title="Feedback" markdown={feedback.feedback} icon="chatbox-ellipses-outline" />
        ) : null}

        {feedback.detailedExplanation ? (
          <MarkdownSection
            title="Detailed explanation"
            markdown={feedback.detailedExplanation}
            icon="document-text-outline"
          />
        ) : null}

        {breakdown?.reasoning ? (
          <MarkdownSection title="Reasoning" markdown={breakdown.reasoning} icon="git-branch-outline" />
        ) : null}

        {breakdown?.strengths && breakdown.strengths.length > 0 ? (
          <MarkdownSection
            title="Strengths"
            markdown={prepareAssessmentReportMarkdownList(breakdown.strengths)}
            icon="checkmark-circle-outline"
          />
        ) : null}

        {breakdown?.weaknesses && breakdown.weaknesses.length > 0 ? (
          <MarkdownSection
            title="Areas to improve"
            markdown={prepareAssessmentReportMarkdownList(breakdown.weaknesses)}
            icon="alert-circle-outline"
          />
        ) : null}

        {breakdown?.improvements && breakdown.improvements.length > 0 ? (
          <MarkdownSection
            title="Suggestions"
            markdown={prepareAssessmentReportMarkdownList(breakdown.improvements)}
            icon="bulb-outline"
          />
        ) : null}

        {feedback.suggestions && feedback.suggestions.length > 0 ? (
          <MarkdownSection
            title="Quick tips"
            markdown={prepareAssessmentReportMarkdownList(feedback.suggestions)}
            icon="flash-outline"
          />
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  hero: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLeft: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  heroMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  heroPoints: {
    fontSize: 12,
    fontWeight: "600",
  },
  scoreRingWrap: {
    width: SCORE_RING,
    height: SCORE_RING,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  scoreRingValue: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rubricBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rubricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rubricHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rubricSummary: {
    fontSize: 12,
    fontWeight: "700",
  },
  rubricHeaderMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rubricMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  rubricPctPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center",
  },
  rubricPctPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  rubricRow: {
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rubricRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  rubricLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  rubricPoints: {
    fontSize: 12,
    fontWeight: "700",
  },
  rubricTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  rubricFill: {
    height: "100%",
    borderRadius: 999,
  },
  body: {
    padding: 12,
    gap: 10,
  },
  markdownSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  markdownSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  markdownSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
})
