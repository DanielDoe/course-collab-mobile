import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { LectureWorkspaceConfig } from "../../lib/lecture-types"
import { groupWorkspaceQuestions } from "../../lib/lecture-workspace-utils"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { StudentLectureWorkspaceQuestionCard } from "./StudentLectureWorkspaceQuestionCard"

type Props = {
  lectureId: number
  studentDatabaseId: string
  config: LectureWorkspaceConfig
  expandedId: string | null
  loading?: boolean
  onToggle: (questionId: string) => void
}

export function StudentLectureWorkspacePanel({
  lectureId,
  studentDatabaseId,
  config,
  expandedId,
  loading = false,
  onToggle,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const label = config.button_label?.trim() || "Workspace"
  const title = config.title?.trim() || "In-Class Workspace"
  const sections = useMemo(() => groupWorkspaceQuestions(config.questions), [config.questions])
  const sectionOffsets = useMemo(() => {
    let offset = 0
    return sections.map((section) => {
      const start = offset
      offset += section.questions.length
      return start
    })
  }, [sections])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading workspace problems…</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.intro, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
        <View style={styles.introTop}>
          <View style={[styles.introIcon, { backgroundColor: tokens.accentSoft }]}>
            <Ionicons name="brush-outline" size={18} color={tokens.accent} />
          </View>
          <View style={styles.introCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>{label}</Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>{title}</Text>
          </View>
        </View>
        <Text style={[type.secondary, styles.introBody, { color: native.secondaryLabel }]}>
          Expand each problem to draw, photograph, or upload your work. Drafts save to this lecture
          and stay on your account. Instructor ink and unlocked solutions stay available below.
        </Text>
      </View>

      {config.questions.length > 0 ? (
        <View style={styles.list}>
          {sections.map((section, sectionIndex) => (
            <View key={section.label || "default"} style={styles.section}>
              {section.label ? (
                <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>
                  {section.label}
                </Text>
              ) : null}
              {section.questions.map((question, index) => (
                <StudentLectureWorkspaceQuestionCard
                  key={question.id}
                  lectureId={lectureId}
                  studentDatabaseId={studentDatabaseId}
                  question={question}
                  index={sectionOffsets[sectionIndex] + index}
                  expanded={expandedId === question.id}
                  onToggle={() => onToggle(question.id)}
                  savedAnswer={config.drafts?.[question.id] ?? null}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <FacultyEmptyState
          icon="brush-outline"
          title="No workspace problems yet"
          body="Your instructor has not published in-class workspace problems for this lecture. Sample Practice may still be available from Slide tools."
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  intro: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  introTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  introCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  introBody: {
    lineHeight: 20,
  },
  list: {
    gap: 14,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "none",
    paddingHorizontal: 2,
  },
})
