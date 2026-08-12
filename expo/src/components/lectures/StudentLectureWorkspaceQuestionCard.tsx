import { useMemo, useState } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { SYSTEM, NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { LectureWorkspaceQuestion } from "../../lib/lecture-types"
import { categoryLabel, solutionMarkdownFromQuestion } from "../../lib/lecture-workspace-utils"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"

import { CoraSolveButton } from "../cora/CoraSolveButton"
import { useCora } from "../cora/CoraProvider"
import { buildWorkspaceCoraProblem } from "../../lib/cora-problem"
import { StudentLectureWorkspaceInkPanel } from "./StudentLectureWorkspaceInkPanel"

const ACCENTS = [SYSTEM.teal, SYSTEM.blue, SYSTEM.purple, SYSTEM.orange] as const

type Props = {
  lectureId: number
  studentDatabaseId: string
  question: LectureWorkspaceQuestion
  index: number
  expanded: boolean
  onToggle: () => void
}

export function StudentLectureWorkspaceQuestionCard({
  lectureId,
  studentDatabaseId,
  question,
  index,
  expanded,
  onToggle,
}: Props) {
  const { openCora } = useCora()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const accent = ACCENTS[index % ACCENTS.length] ?? SYSTEM.teal
  const [showSolution, setShowSolution] = useState(false)

  const solutionMarkdown = solutionMarkdownFromQuestion(question)
  const hasSolution = Boolean(solutionMarkdown.trim())
  const category = question.topic?.trim() || categoryLabel(question.category)

  const borderColor = useMemo(() => {
    if (expanded) return accent.border
    return tokens.border
  }, [accent.border, expanded, tokens.border])

  return (
    <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor }]}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && { opacity: NATIVE.pressedOpacity }]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.indexBadge, { backgroundColor: accent.soft }]}>
          <Text style={[styles.indexText, { color: accent.color }]}>{index + 1}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
            {question.title}
          </Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {category}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={native.tertiaryLabel}
        />
      </Pressable>

      {expanded ? (
        <View style={[styles.body, { borderTopColor: native.separator }]}>
          {question.question_media ? <QuestionMediaView media={question.question_media} embedded /> : null}

          {question.question_text.trim() ? (
            <View style={styles.promptBlock}>
              <QuestionContentWebView text={question.question_text} embedded />
            </View>
          ) : (
            <Text style={[type.secondary, { color: native.secondaryLabel }]}>
              Review the instructor workspace and step-by-step solution below.
            </Text>
          )}

          <StudentLectureWorkspaceInkPanel workspace={question.instructor_solution_workspace} />

          {hasSolution ? (
            <>
              <Pressable
                style={[styles.solutionToggle, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}
                onPress={() => setShowSolution((value) => !value)}
              >
                <Ionicons name="book-outline" size={16} color={tokens.accent} />
                <Text style={[type.bodyEmphasis, { color: tokens.accentDark, flex: 1 }]}>
                  {showSolution ? "Hide step-by-step solution" : "Show step-by-step solution"}
                </Text>
                <Ionicons
                  name={showSolution ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={tokens.accent}
                />
              </Pressable>

              {showSolution ? (
                <View style={[styles.solutionBlock, { borderColor: tokens.border, backgroundColor: native.groupedBackground }]}>
                  <QuestionContentWebView text={solutionMarkdown} embedded />
                </View>
              ) : null}
            </>
          ) : null}

          <CoraSolveButton
            onPress={() =>
              openCora(buildWorkspaceCoraProblem(lectureId, question, studentDatabaseId))
            }
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  indexText: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  body: {
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  promptBlock: {
    paddingHorizontal: 2,
  },
  solutionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  solutionBlock: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
})
