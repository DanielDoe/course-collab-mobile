import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import type { LectureWorkspaceQuestion } from "../../lib/lecture-types"
import { categoryLabel, solutionMarkdownFromQuestion } from "../../lib/lecture-workspace-utils"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"

/** Student-facing preview for in-lecture workspace problems — markdown, KaTeX, diagrams. */
export function FacultyLectureWorkspacePreview({
  question,
}: {
  question: LectureWorkspaceQuestion
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const solutionMarkdown = solutionMarkdownFromQuestion(question)

  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: tokens.accentSoft }]}>
          <Text style={[styles.badgeText, { color: tokens.accentDark }]}>Student preview</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: native.fill }]}>
          <Text style={[styles.categoryText, { color: native.secondaryLabel }]}>
            {question.topic?.trim() || categoryLabel(question.category)}
          </Text>
        </View>
      </View>

      {question.question_media ? <QuestionMediaView media={question.question_media} embedded /> : null}

      {question.question_text.trim() ? (
        <View style={[styles.problemBlock, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
          <QuestionContentWebView text={question.question_text} embedded />
        </View>
      ) : null}

      <View style={[styles.workspaceHint, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
        <Ionicons name="easel-outline" size={18} color={tokens.accent} />
        <Text style={[styles.workspaceHintText, { color: native.secondaryLabel }]}>
          Ink workspace — instructor publishes worked solutions for students (view-only on mobile)
        </Text>
      </View>

      {solutionMarkdown.trim() ? (
        <View style={styles.solutionBlock}>
          <Text style={[styles.solutionTitle, { color: tokens.text }]}>Step-by-step solution</Text>
          <View style={[styles.solutionBody, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
            <QuestionContentWebView text={solutionMarkdown} embedded />
          </View>
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: native.separator }]}>
        <Ionicons name="eye-outline" size={14} color={native.secondaryLabel} />
        <Text style={[styles.footerText, { color: native.secondaryLabel }]}>
          Preview mode — matches the slide workspace layout
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  categoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "55%",
  },
  categoryText: { fontSize: 11, fontWeight: "700", textAlign: "right" },
  problemBlock: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  workspaceHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  workspaceHintText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  solutionBlock: { gap: 8 },
  solutionTitle: { fontSize: 13, fontWeight: "700" },
  solutionBody: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 16 },
})
