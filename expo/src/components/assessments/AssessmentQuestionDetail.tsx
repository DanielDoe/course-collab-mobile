import { Image, Platform, StyleSheet, Text, View } from "react-native"
import { useMemo } from "react"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AiFeedback, AssessmentResultQuestion } from "../../lib/assessment-results-api"
import {
  hasProcessedAiFeedback,
} from "../../lib/ai-feedback-display"
import { QuestionContentWebView, QuestionMcqReportOptionsBlock, QuestionMediaView } from "../rewards/QuestionContent"
import { parseQuestionMedia, stripDuplicateMediaCaptionFromQuestion } from "../../lib/classroom-submission"
import { parseCircuitSubmissionConfig } from "../../lib/circuit-submission-utils"
import { needsQuestionRichRender } from "../../lib/classroom-submission"
import { AssessmentReportMarkdownContent } from "./AssessmentReportMarkdownContent"
import { AssessmentSubmissionReviewSection } from "./AssessmentSubmissionReviewSection"
import { AiFeedbackPanel } from "./AiFeedbackPanel"
import { hexToRgba } from "../../constants/app-themes"
import { useAssessmentTheme, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  reportAnswerBlockColors,
  reportBadgeColors,
  reportCodeBlockColors,
  reportOnSolidBadgeColors,
  reportOptionRowColors,
} from "../../lib/assessment-report-theme"
import {
  extractStudentAnswer,
  formatCorrectAnswer,
  formatDisplayAnswer,
  formatQuestionType,
  formatTimeSpent,
  getOptionRowState,
  getQuestionOptions,
  hasMcqOptions,
  isCircuitSubmissionType,
  isCodeQuestionType,
  isMultiSelectType,
  shouldShowCorrectAnswer,
  splitCodeSegments,
} from "./assessment-question-detail"

/** Monospace code block with theme-aware colors. */
function ReportCodeBlock({ value }: { value: string }) {
  const { tokens } = useAssessmentTheme()
  const colors = reportCodeBlockColors(tokens)

  return (
    <View style={[styles.codeBlock, { backgroundColor: colors.bg }]}>
      <Text style={[styles.codeText, { color: colors.text }]} selectable>
        {value}
      </Text>
    </View>
  )
}

/** Markdown + KaTeX for processed report prose (AI feedback, sample answers, etc.). */
function ReportRichText({ text }: { text: string }) {
  if (!text?.trim()) return null
  return <AssessmentReportMarkdownContent markdown={text} />
}

function RichText({ text }: { text: string }) {
  const segments = splitCodeSegments(text)
  return (
    <View style={styles.richText}>
      {segments.map((seg, i) =>
        seg.kind === "code" ? (
          <ReportCodeBlock key={i} value={seg.value} />
        ) : (
          <ReportRichText key={i} text={seg.value} />
        ),
      )}
    </View>
  )
}

function Badge({
  label,
  tone,
  onSolidInk,
}: {
  label: string
  tone: "good" | "bad" | "info" | "neutral"
  /** Set when the badge sits on a solid status fill — tone-on-tone would vanish. */
  onSolidInk?: string
}) {
  const { tokens } = useAssessmentTheme()
  const palette = onSolidInk ? reportOnSolidBadgeColors(onSolidInk) : reportBadgeColors(tone, tokens)

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  )
}

function OptionRow({ letter, text, state }: { letter: string; text: string; state: ReturnType<typeof getOptionRowState> }) {
  const { tokens } = useAssessmentTheme()
  const colors = reportOptionRowColors(state, tokens)

  return (
    <View style={[styles.optionRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.optionMain}>
        <Text style={[styles.optionLetter, { color: colors.text }]}>{letter}.</Text>
        <View style={styles.optionContent}>
          <QuestionContentWebView
            text={text}
            embedded
            compact
            textColor={state.isSelected ? colors.text : undefined}
          />
        </View>
      </View>
      {state.badge ? (
        <Badge
          label={state.badge}
          onSolidInk={state.isSelected ? colors.text : undefined}
          tone={
            state.isSelected && state.isCorrect
              ? "good"
              : state.isSelected
                ? "bad"
                : state.isCorrect
                  ? "info"
                  : "neutral"
          }
        />
      ) : null}
    </View>
  )
}

function AnswerBlock({
  label,
  value,
  tone = "neutral",
  monospace = false}: {
  label: string
  value: string
  tone?: "good" | "bad" | "info" | "neutral"
  monospace?: boolean
}) {
  const { tokens } = useAssessmentTheme()
  const palette = reportAnswerBlockColors(tone, tokens)

  return (
    <View style={[styles.answerBlock, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.fieldLabel, { color: tokens.textSecondary }]}>{label}</Text>
      {monospace ? (
        <ReportCodeBlock value={value} />
      ) : (
        <ReportRichText text={value} />
      )}
    </View>
  )
}

function MultiPartSection({ q }: { q: AssessmentResultQuestion }) {
  const { tokens } = useAssessmentTheme()
  const raw = extractStudentAnswer(q)
  let parts: unknown = null
  if (q.subquestions) parts = q.subquestions
  else if (raw) {
    try {
      parts = JSON.parse(raw)
    } catch {
      /* ignore */
    }
  }

  return (
    <View style={styles.stack}>
      <AnswerBlock label="Your response" value={formatDisplayAnswer(raw, q)} tone="neutral" monospace />
      {parts ? (
        <View style={styles.subBlock}>
          <Text style={[styles.subLabel, { color: tokens.textSecondary }]}>Parts</Text>
          <ReportCodeBlock
            value={typeof parts === "string" ? parts : JSON.stringify(parts, null, 2)}
          />
        </View>
      ) : null}
    </View>
  )
}

function SampleAnswersSection({
  samples,
}: {
  samples: Array<{ approach: string; description: string; code: string }>
}) {
  const { tokens } = useAssessmentTheme()
  return (
    <View style={styles.subBlock}>
      <Text style={[styles.subLabel, { color: tokens.textSecondary }]}>Sample answers</Text>
      {samples.map((sample, index) => (
        <View
          key={index}
          style={[styles.sampleCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
        >
          <Text style={[styles.sampleTitle, { color: tokens.text }]}>{sample.approach}</Text>
          {sample.description ? <ReportRichText text={sample.description} /> : null}
          {sample.code ? <ReportCodeBlock value={sample.code} /> : null}
        </View>
      ))}
    </View>
  )
}

function PlotImage({ uri }: { uri: string }) {
  const { tokens } = useAssessmentTheme()
  const source = uri.startsWith("data:") ? { uri } : { uri }
  return (
    <View style={styles.plotWrap}>
      <Text style={[styles.subLabel, { color: tokens.textSecondary }]}>Plot output</Text>
      <Image
        source={source}
        style={[styles.plotImage, { backgroundColor: tokens.native.fill }]}
        resizeMode="contain"
      />
    </View>
  )
}

export function AssessmentQuestionDetail({ q }: { q: AssessmentResultQuestion }) {
  const { tokens } = useAssessmentTheme()
  const SN = useThemedStudentNative()
  const type = (q.question_type ?? "").toLowerCase()
  const isCircuit = isCircuitSubmissionType(type)
  const questionMedia = useMemo(() => parseQuestionMedia(q.question_media), [q.question_media])
  const displayQuestionText = useMemo(
    () => stripDuplicateMediaCaptionFromQuestion(q.question_text ?? "", questionMedia),
    [q.question_text, questionMedia],
  )
  const uploadConfig = useMemo(
    () => parseCircuitSubmissionConfig(q.solution_upload_config),
    [q.solution_upload_config],
  )
  const options = getQuestionOptions(q)
  const studentRaw = extractStudentAnswer(q)
  const studentDisplay = formatDisplayAnswer(studentRaw, q)
  const correctDisplay = formatCorrectAnswer(q)
  const isCode = isCodeQuestionType(type)
  const feedback = q.ai_feedback as AiFeedback | null | undefined
  const showAiFeedbackOnly = hasProcessedAiFeedback(feedback)
  const qExt = q as AssessmentResultQuestion & { plotImage?: string; code?: string }
  const overridePoints = q.override_points
  const earned = Number(q.points_earned ?? 0)
  const maxPts = Number(q.max_points ?? q.points ?? 1)

  const studentTone: "good" | "bad" | "neutral" =
    q.requires_review ? "neutral" : q.is_correct ? "good" : studentRaw ? "bad" : "neutral"

  const batchRichOptions = useMemo(
    () => options.some((opt) => needsQuestionRichRender(opt.text)),
    [options],
  )
  const batchedOptionItems = useMemo(
    () =>
      options.map((opt) => {
        const state = getOptionRowState(q, opt)
        const colors = reportOptionRowColors(state, tokens)
        return {
          letter: opt.letter,
          text: opt.text,
          badge: state.badge,
          bg: colors.bg,
          border: colors.border,
          fg: state.isSelected ? colors.text : undefined,
        }
      }),
    [options, q, tokens],
  )

  return (
    <View style={styles.root}>
      <View style={styles.metaRow}>
        <Text style={[styles.typeHint, { color: SN.secondaryLabel }]}>
          {formatQuestionType(q.question_type)}
        </Text>
        {q.section_title ? (
          <Text
            style={[
              styles.sectionTag,
              {
                color: tokens.accent,
                backgroundColor: hexToRgba(tokens.accent, 0.08),
              },
            ]}
          >
            {q.section_title}
          </Text>
        ) : null}
        <Text style={[styles.timeSpent, { color: SN.secondaryLabel }]}>
          Time: {formatTimeSpent(q.time_spent_seconds)}
        </Text>
      </View>

      <View style={styles.promptBlock}>
        <Text style={[styles.fieldLabel, { color: tokens.textSecondary }]}>Question</Text>
        {questionMedia ? <QuestionMediaView media={questionMedia} embedded /> : null}
        {displayQuestionText.trim() ? (
          <QuestionContentWebView text={displayQuestionText} embedded />
        ) : null}
      </View>

      {isCircuit && uploadConfig.submission_instructions?.trim() ? (
        <View style={[styles.instructionsBox, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}>
          <Ionicons name="information-circle-outline" size={16} color={tokens.accent} />
          <View style={styles.instructionsContent}>
            <QuestionContentWebView text={uploadConfig.submission_instructions} embedded compact />
          </View>
        </View>
      ) : null}

      {q.hint && !showAiFeedbackOnly ? (
        <View
          style={[
            styles.hintBox,
            {
              backgroundColor: hexToRgba(tokens.warning, tokens.isDark ? 0.16 : 0.1),
              borderColor: hexToRgba(tokens.warning, tokens.isDark ? 0.32 : 0.25),
            },
          ]}
        >
          <Ionicons name="bulb-outline" size={14} color={tokens.warning} />
          <View style={styles.hintContent}>
            <AssessmentReportMarkdownContent markdown={String(q.hint)} />
          </View>
        </View>
      ) : null}

      {!showAiFeedbackOnly && type === "multi_part" ? (
        <MultiPartSection q={q} />
      ) : !showAiFeedbackOnly && isCircuit ? (
        <View style={styles.stack}>
          <Text style={[styles.fieldLabel, { color: tokens.textSecondary }]}>Your submission</Text>
          <AssessmentSubmissionReviewSection answerRaw={studentRaw} />
        </View>
      ) : !showAiFeedbackOnly && hasMcqOptions(q) && !isCode && !isCircuit ? (
        <View style={styles.stack}>
          <Text style={[styles.fieldLabel, { color: tokens.textSecondary }]}>Answer choices</Text>
          {batchRichOptions ? (
            <QuestionMcqReportOptionsBlock items={batchedOptionItems} compact />
          ) : (
            options.map((opt) => (
              <OptionRow
                key={opt.key}
                letter={opt.letter}
                text={opt.text}
                state={getOptionRowState(q, opt)}
              />
            ))
          )}

          {!isMultiSelectType(type) ? (
            <AnswerBlock
              label="Your answer"
              value={studentDisplay}
              tone={studentTone}
            />
          ) : null}

          {correctDisplay && (isMultiSelectType(type) || !q.is_correct) ? (
            <AnswerBlock label="Correct answer" value={correctDisplay} tone="info" />
          ) : null}
        </View>
      ) : !showAiFeedbackOnly ? (
        <View style={styles.stack}>
          <AnswerBlock
            label={isCode ? "Your code" : "Your answer"}
            value={studentDisplay}
            tone={studentTone}
            monospace={isCode || type === "fill_code"}
          />

          {shouldShowCorrectAnswer(q) && correctDisplay ? (
            <AnswerBlock
              label="Correct answer"
              value={correctDisplay}
              tone="info"
              monospace={type === "fill_code"}
            />
          ) : null}
        </View>
      ) : null}

      {!showAiFeedbackOnly && qExt.plotImage ? <PlotImage uri={qExt.plotImage} /> : null}

      {!showAiFeedbackOnly && q.sample_answers && q.sample_answers.length > 0 ? (
        <SampleAnswersSection samples={q.sample_answers} />
      ) : null}

      {feedback && hasProcessedAiFeedback(feedback) ? (
        <AiFeedbackPanel
          feedback={feedback}
          questionMaxPoints={maxPts}
          pointsEarned={earned}
        />
      ) : null}

      <View style={[styles.footerMeta, { borderTopColor: tokens.border }]}>
        <Text style={[styles.footerLine, { color: SN.secondaryLabel }]}>
          Points: {earned}/{maxPts}
          {overridePoints != null ? " (instructor adjusted)" : ""}
        </Text>
        {q.requires_review ? (
          <View
            style={[
              styles.pendingPill,
              { backgroundColor: hexToRgba(tokens.warning, tokens.isDark ? 0.18 : 0.14) },
            ]}
          >
            <Ionicons name="time-outline" size={12} color={tokens.warning} />
            <Text style={[styles.pendingText, { color: tokens.warning }]}>Pending manual review</Text>
          </View>
        ) : null}
        {q.reviewed_at ? (
          <Text style={[styles.footerLine, { color: SN.secondaryLabel }]}>
            Reviewed {new Date(q.reviewed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  stack: { gap: 10 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  typeHint: { fontSize: 11, fontWeight: "700" },
  sectionTag: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  timeSpent: { fontSize: 11, fontWeight: "600", marginLeft: "auto" },
  promptBlock: { gap: 6 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  bodyText: { fontSize: 14, lineHeight: 21 },
  richText: { gap: 8 },
  codeBlock: {
    borderRadius: 10,
    padding: 12,
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  hintBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  hintContent: { flex: 1, minWidth: 0 },
  instructionsBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  instructionsContent: { flex: 1, minWidth: 0 },
  optionRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8},
  optionMain: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  optionLetter: { fontSize: 14, fontWeight: "600", minWidth: 18 },
  optionContent: { flex: 1, minWidth: 0 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1},
  badgeText: { fontSize: 10, fontWeight: "600" },
  answerBlock: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6},
  subBlock: { gap: 4 },
  sampleCard: {
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sampleTitle: { fontSize: 13, fontWeight: "600" },
  plotWrap: { gap: 6 },
  plotImage: { width: "100%", height: 220, borderRadius: 12 },
  footerMeta: { gap: 6, paddingTop: 4, borderTopWidth: 1 },
  footerLine: { fontSize: 12, fontWeight: "600" },
  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pendingText: { fontSize: 11, fontWeight: "700" },
})
