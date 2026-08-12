import { type ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { hasActiveQuestionMedia, type QuestionMedia } from "../../lib/classroom-submission"
import {
  evaluationModeLabel,
  formatBankCorrectAnswerDisplay,
  formatBankDate,
  isBankOptionCorrect,
  parseBankGuidelines,
  parseBankOptions,
  parseBankQuestionMedia,
  parseBankSolutionConfig,
  parseBankSubquestions,
  questionBankTypeLabel} from "../../lib/faculty-question-bank-utils"
import type { InstructorBankQuestion } from "../../lib/instructor-api"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultySheetSection } from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { semanticSoft } from "../../lib/themed-module-theme"

function RichText({ text, compact }: { text: string; compact?: boolean }) {
  if (!text.trim()) return null
  return (
    <View style={styles.richWrap}>
      <QuestionContentWebView text={text} embedded compact={compact} />
    </View>
  )
}

function Section({
  label,
  tone,
  children}: {
  label: string
  tone?: (typeof SHEET_SECTION)[keyof typeof SHEET_SECTION]
  children: ReactNode
}) {
  return (
    <FacultySheetSection label={label} tone={tone ?? SHEET_SECTION.review}>
      {children}
    </FacultySheetSection>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { native, type } = useModuleTheme()
  return (
    <View style={[styles.metaRow, { borderBottomColor: native.separator }]}>
      <Text style={[type.body, { color: native.secondaryLabel, fontWeight: "600", flex: 1 }]}>{label}</Text>
      <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "right", flexShrink: 1 }]}>{value}</Text>
    </View>
  )
}

export function FacultyQuestionBankDetailContent({
  question,
  loading}: {
  question: InstructorBankQuestion
  loading?: boolean
}) {
  const { native, tokens, type } = useModuleTheme()
  const typeName = (question.question_type ?? "").toLowerCase()
  const options = parseBankOptions(question.options)
  const media = parseBankQuestionMedia(question.question_media)
  const guidelines = parseBankGuidelines(question.answer_guidelines)
  const subquestions = parseBankSubquestions(question.subquestions)
  const uploadConfig = parseBankSolutionConfig(question.solution_upload_config)
  const correctDisplay = formatBankCorrectAnswerDisplay(question.correct_answer, options, typeName)
  const isCircuit = typeName === "circuit_submission"
  const isMultiPart = typeName === "multi_part"

  return (
    <View style={styles.stack}>
      <View
        style={[
          styles.hero,
          tokens.cardShadow,
          { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
        ]}
      >
        <View style={styles.heroPills}>
          <FacultyStatusPill label={questionBankTypeLabel(question.question_type)} tone="neutral" />
          <FacultyStatusPill label={question.difficulty ?? "medium"} tone="neutral" />
          {question.topic ? <FacultyStatusPill label={question.topic} tone="live" /> : null}
          <FacultyStatusPill label={evaluationModeLabel(question.evaluation_mode)} tone="neutral" />
        </View>

        {loading ? (
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Refreshing details…</Text>
        ) : null}

        {hasActiveQuestionMedia(media) ? <QuestionMediaView media={media as QuestionMedia} embedded /> : null}

        {question.question_text.trim() ? <RichText text={question.question_text} /> : null}
      </View>

      <Section label="Question info">
        <MetaRow label="Question ID" value={`#${question.id}`} />
        <MetaRow label="Used in quizzes" value={String(question.quiz_usage_count ?? 0)} />
        <MetaRow label="Created" value={formatBankDate(question.created_at)} />
        <MetaRow label="Updated" value={formatBankDate(question.updated_at)} />
      </Section>

      {isMultiPart && subquestions.length > 0 ? (
        <Section label="Sub-questions">
          {subquestions.map((part, index) => (
            <PartCard key={`${part.label}-${index}`} label={part.label} points={part.points} text={part.text} />
          ))}
        </Section>
      ) : null}

      {isCircuit ? (
        <Section label="Submission requirements">
          {uploadConfig?.submission_instructions ? (
            <RichText text={uploadConfig.submission_instructions} compact />
          ) : (
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20, fontWeight: "600" }]}>
              Students upload circuit diagrams, photos, or PDFs of their work.
            </Text>
          )}
          {uploadConfig?.max_files ? (
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20, fontWeight: "600" }]}>
              Up to {uploadConfig.max_files} files allowed
            </Text>
          ) : null}
        </Section>
      ) : null}

      {options.length > 0 ? (
        <Section label="Answer choices">
          {options.map((opt, index) => {
            const correct = isBankOptionCorrect(index, question.correct_answer, options)
            const letter = String.fromCharCode(65 + index)
            return (
              <OptionRow
                key={`${letter}-${index}`}
                letter={letter}
                text={opt}
                correct={correct}
              />
            )
          })}
          <MetaRow label="Correct answer" value={correctDisplay} />
        </Section>
      ) : correctDisplay !== "—" ? (
        <Section label="Correct answer">
          <RichText text={correctDisplay} compact />
        </Section>
      ) : null}

      {question.expected_answer?.trim() ? (
        <Section label="Expected answer">
          <RichText text={String(question.expected_answer)} compact />
        </Section>
      ) : null}

      {question.sample_answer?.trim() ? (
        <Section label="Sample answer">
          <RichText text={String(question.sample_answer)} compact />
        </Section>
      ) : null}

      {guidelines.length > 0 ? (
        <Section label="Grading guidelines">
          {guidelines.map((item, index) => (
            <GuidelineRow key={`${index}-${item.slice(0, 12)}`} index={index} text={item} />
          ))}
        </Section>
      ) : null}

      {question.hint?.trim() ? (
        <Section label="Hint">
          <HintBox text={String(question.hint)} />
        </Section>
      ) : null}

      {question.explanation?.trim() ? (
        <Section label="Explanation">
          <RichText text={String(question.explanation)} compact />
        </Section>
      ) : null}

      {!hasActiveQuestionMedia(media) && !question.hint && !question.explanation && options.length === 0 ? (
        <Section label="Details">
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20, fontWeight: "600" }]}>
            No diagram, options, or supplemental fields are attached to this question.
          </Text>
        </Section>
      ) : null}
    </View>
  )
}

function PartCard({
  label,
  points,
  text}: {
  label: string
  points?: number | null
  text?: string
}) {
  const { native, type } = useModuleTheme()
  return (
    <View
      style={[
        styles.partCard,
        { backgroundColor: native.fill, borderColor: native.separator },
      ]}
    >
      <View style={styles.partHeader}>
        <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 13 }]}>{label}</Text>
        {points != null ? (
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>{points} pts</Text>
        ) : null}
      </View>
      {text ? <RichText text={text} compact /> : null}
    </View>
  )
}

function OptionRow({ letter, text, correct }: { letter: string; text: string; correct: boolean }) {
  const { native, tokens, type } = useModuleTheme()
  return (
    <View
      style={[
        styles.optionRow,
        {
          borderColor: correct ? `${tokens.success}55` : native.separator,
          backgroundColor: correct ? semanticSoft(tokens.success, tokens.isDark) : native.fill,
        },
      ]}
    >
      <View
        style={[
          styles.optionLetter,
          {
            backgroundColor: correct ? tokens.success : native.secondaryGrouped,
          },
        ]}
      >
        <Text
          style={[
            type.caption,
            {
              fontWeight: "600",
              color: correct ? "#ffffff" : native.secondaryLabel,
            },
          ]}
        >
          {letter}
        </Text>
      </View>
      <View style={styles.optionBody}>
        <RichText text={text} compact />
      </View>
      {correct ? (
        <View style={styles.correctBadge}>
          <Ionicons name="checkmark-circle" size={16} color={tokens.success} />
          <Text style={[type.caption, { color: tokens.success, fontWeight: "600" }]}>Correct</Text>
        </View>
      ) : null}
    </View>
  )
}

function GuidelineRow({ index, text }: { index: number; text: string }) {
  const { native, type } = useModuleTheme()
  return (
    <View style={styles.guidelineRow}>
      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 20 }]}>
        {index + 1}.
      </Text>
      <RichText text={text} compact />
    </View>
  )
}

function HintBox({ text }: { text: string }) {
  const { tokens } = useModuleTheme()
  return (
    <View
      style={[
        styles.hintBox,
        {
          backgroundColor: semanticSoft(tokens.warning, tokens.isDark),
          borderColor: `${tokens.warning}44`,
        },
      ]}
    >
      <Ionicons name="bulb-outline" size={16} color={tokens.warning} />
      <View style={styles.hintContent}>
        <RichText text={text} compact />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  hero: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  richWrap: { minWidth: 0, width: "100%" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  partCard: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  partHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBody: { flex: 1, minWidth: 0 },
  correctBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 4 },
  guidelineRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  hintBox: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hintContent: { flex: 1, minWidth: 0 },
})
