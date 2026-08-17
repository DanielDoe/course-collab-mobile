import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { questionTypeLabel } from "../../lib/faculty-quiz-editor-config"
import type { QuizEditorDraft, QuizQuestionDraft } from "../../lib/faculty-quiz-editor-mapper"
import { instructorApi, type InstructorQuestionTimeSetting } from "../../lib/instructor-api"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSelect } from "../NativeSelect"
import { secondsSelectOptions } from "./FacultyNativePickers"
import {
  EditorNotice,
  EditorSectionCard} from "./FacultyAssessmentEditorUi"

type Scope = { instructorId: number; courseId: number }

type Props = {
  scope: Scope
  assessmentType: string
  draft: QuizEditorDraft
  onPatchDraft: (patch: Partial<QuizEditorDraft>) => void
  onPatchQuestion: (index: number, patch: Partial<QuizQuestionDraft>) => void
}

function useTimePanelStyles() {
  const { native, tokens, type } = useModuleTheme()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        stack: { gap: 14 },
        defaultsList: { gap: 8 },
        defaultRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          paddingVertical: 6,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        defaultType: { fontSize: 13, fontWeight: "600", color: native.label },
        defaultTime: { fontSize: 13, fontWeight: "600", color: FACULTY_ASSESSMENT_COLOR.link },
        questionRow: {
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          paddingVertical: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        questionCopy: { flex: 1, gap: 2 },
        questionTitle: { fontSize: 13, fontWeight: "700", color: native.label },
        questionHint: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        timeInput: {
          width: 72,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 14,
          fontWeight: "700",
          color: native.label,
          backgroundColor: native.fill,
          textAlign: "center",
        },
      }),
    [native, tokens, type],
  )
  return { styles, tokens }
}

export function FacultyAssessmentTimePanel({
  scope,
  assessmentType,
  draft,
  onPatchDraft,
  onPatchQuestion}: Props) {
  const { styles, tokens } = useTimePanelStyles()
  const [courseDefaults, setCourseDefaults] = useState<InstructorQuestionTimeSetting[]>([])
  const [loadingDefaults, setLoadingDefaults] = useState(true)

  const loadDefaults = useCallback(async () => {
    setLoadingDefaults(true)
    try {
      const rows = await instructorApi.getQuestionTimeSettings(scope)
      setCourseDefaults(rows.filter((r) => r.assessment_type === assessmentType))
    } catch {
      setCourseDefaults([])
    } finally {
      setLoadingDefaults(false)
    }
  }, [scope, assessmentType])

  useEffect(() => {
    void loadDefaults()
  }, [loadDefaults])

  const defaultsByType = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of courseDefaults) map.set(row.question_type, row.time_limit)
    return map
  }, [courseDefaults])

  return (
    <View style={styles.stack}>
      <EditorSectionCard
        icon="timer-outline"
        title="Assessment default"
        subtitle="Used when a question has no time override"
      >
        <NativeSelect
          label="Default time per question"
          placeholder="1 minute"
          value={String(draft.time_per_question)}
          options={secondsSelectOptions(draft.time_per_question)}
          onChange={(v) => onPatchDraft({ time_per_question: Math.max(10, Number(v) || 60) })}
        />
      </EditorSectionCard>

      <EditorSectionCard
        icon="library-outline"
        title="Course time defaults"
        subtitle="Per question type for this assessment category"
      >
        {loadingDefaults ? (
          <ActivityIndicator color={FACULTY_ASSESSMENT_COLOR.link} />
        ) : courseDefaults.length === 0 ? (
          <EditorNotice tone="info" text="No course defaults configured for this assessment type." />
        ) : (
          <View style={styles.defaultsList}>
            {courseDefaults.slice(0, 16).map((row) => (
              <View key={row.id} style={styles.defaultRow}>
                <Text style={styles.defaultType}>{questionTypeLabel(row.question_type)}</Text>
                <Text style={styles.defaultTime}>{row.time_limit}s</Text>
              </View>
            ))}
          </View>
        )}
        <EditorNotice tone="info" text="Edit course-wide defaults on the web under Time Settings." />
      </EditorSectionCard>

      <EditorSectionCard
        icon="list-outline"
        title="Per-question overrides"
        subtitle="Blank uses the assessment default above"
      >
        {draft.questions.map((question, index) => {
          const type = question.question_type.toLowerCase()
          const courseDefault = defaultsByType.get(type)
          return (
            <View key={question.id ?? `q-${index}`} style={styles.questionRow}>
              <View style={styles.questionCopy}>
                <Text style={styles.questionTitle}>
                  Q{index + 1} · {questionTypeLabel(type)}
                </Text>
                <Text style={styles.questionHint}>
                  Default {draft.time_per_question}s
                  {courseDefault != null ? ` · course ${courseDefault}s` : ""}
                </Text>
              </View>
              <View style={{ width: 148 }}>
                <NativeSelect
                  placeholder="Default"
                  value={question.time_limit != null ? String(question.time_limit) : ""}
                  options={[
                    { value: "", label: "Default" },
                    ...secondsSelectOptions(question.time_limit),
                  ]}
                  onChange={(v) =>
                    onPatchQuestion(index, {
                      time_limit: v ? Math.max(10, Number(v) || 60) : null,
                    })
                  }
                />
              </View>
            </View>
          )
        })}
      </EditorSectionCard>
    </View>
  )
}
