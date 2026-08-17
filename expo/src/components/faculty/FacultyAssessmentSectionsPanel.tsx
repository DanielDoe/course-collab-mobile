import { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  ALL_QUESTION_TYPE_IDS,
  questionTypeLabel} from "../../lib/faculty-quiz-editor-config"
import {
  defaultSectionTemplate,
  sectionWeightTotal,
  type SectionConfig} from "../../lib/faculty-assessment-sections"
import type { QuizQuestionDraft } from "../../lib/faculty-quiz-editor-mapper"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_SHEET_CHIP_RADIUS } from "./faculty-collab-sheet-ui"
import { NativeSelect } from "../NativeSelect"
import { secondsSelectOptions, WEIGHT_PERCENT_OPTIONS, withCurrentOption } from "./FacultyNativePickers"
import {
  EditorNotice,
  EditorSectionCard,
  EditorTextField,
  EditorToggleRow} from "./FacultyAssessmentEditorUi"

type Props = {
  assessmentType: string
  questions: QuizQuestionDraft[]
  sectionConfig: SectionConfig[] | null
  onChange: (sections: SectionConfig[] | null) => void
}

function useSectionsPanelStyles() {
  const { native, tokens } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  const styles = useMemo(
    () =>
      StyleSheet.create({
        stack: { gap: 14 },
        weightRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        weightLabel: { fontSize: 13, fontWeight: "700", color: native.secondaryLabel },
        weightValue: { fontSize: 16, fontWeight: "600", color: FACULTY_ASSESSMENT_COLOR.link },
        weightWarn: { color: tokens.warning },
        templateBtn: { alignSelf: "flex-start" },
        templateText: { fontSize: 13, fontWeight: "700", color: FACULTY_ASSESSMENT_COLOR.link },
        sectionCard: {
          gap: 10,
          padding: 12,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        sectionIndex: { fontSize: 13, fontWeight: "600", color: native.label },
        typesLabel: {
          fontSize: 11,
          fontWeight: "600",
          color: native.secondaryLabel,
          letterSpacing: 0.4,
        },
        typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        typeChip: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        typeChipActive: { backgroundColor: linkSoft, borderColor: FACULTY_ASSESSMENT_COLOR.link },
        typeChipText: { fontSize: 12, fontWeight: "700", color: native.secondaryLabel },
        typeChipTextActive: { color: FACULTY_ASSESSMENT_COLOR.link },
        addBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
        addText: { fontSize: 14, fontWeight: "700", color: FACULTY_ASSESSMENT_COLOR.link },
      }),
    [native, tokens, linkSoft],
  )
  return { styles, tokens }
}

export function FacultyAssessmentSectionsPanel({
  assessmentType,
  questions,
  sectionConfig,
  onChange}: Props) {
  const { styles, tokens } = useSectionsPanelStyles()
  const enabled = Boolean(sectionConfig && sectionConfig.length > 0)
  const sections = sectionConfig ?? []
  const weightTotal = sectionWeightTotal(sections)
  const weightOk = Math.abs(weightTotal - 100) <= 0.01

  const usedTypes = [...new Set(questions.map((q) => q.question_type.toLowerCase()))]

  function setEnabled(next: boolean) {
    if (!next) {
      onChange(null)
      return
    }
    onChange(defaultSectionTemplate(assessmentType))
  }

  function patchSection(index: number, patch: Partial<SectionConfig>) {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s))
    onChange(next)
  }

  function toggleType(sectionIndex: number, type: string) {
    const section = sections[sectionIndex]
    const set = new Set(section.question_types)
    if (set.has(type)) set.delete(type)
    else set.add(type)
    patchSection(sectionIndex, { question_types: [...set] })
  }

  function addSection() {
    onChange([
      ...sections,
      {
        title: `Section ${sections.length + 1}`,
        question_types: [],
        weight_percent: Math.max(0, 100 - weightTotal)},
    ])
  }

  function removeSection(index: number) {
    const next = sections.filter((_, i) => i !== index)
    onChange(next.length ? next : null)
  }

  return (
    <View style={styles.stack}>
      <EditorSectionCard
        icon="layers-outline"
        title="Sectionized scoring"
        subtitle="Group questions into weighted sections (like web Sections tab)"
      >
        <EditorToggleRow
          label="Use sections"
          hint="When off, all questions use flat scoring"
          value={enabled}
          onValueChange={setEnabled}
        />

        {enabled ? (
          <>
            <View style={styles.weightRow}>
              <Text style={styles.weightLabel}>Total weight</Text>
              <Text style={[styles.weightValue, !weightOk && styles.weightWarn]}>
                {weightTotal.toFixed(1)}%
              </Text>
            </View>
            {!weightOk ? (
              <EditorNotice tone="warn" text="Section weights must sum to exactly 100% before saving." />
            ) : null}

            <Pressable style={styles.templateBtn} onPress={() => onChange(defaultSectionTemplate(assessmentType))}>
              <Text style={styles.templateText}>Apply default template</Text>
            </Pressable>

            {sections.map((section, index) => (
              <View key={`section-${index}`} style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionIndex}>Section {index + 1}</Text>
                  <Pressable onPress={() => removeSection(index)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                  </Pressable>
                </View>
                <EditorTextField
                  label="Title"
                  value={section.title}
                  onChangeText={(v) => patchSection(index, { title: v })}
                  placeholder="Section I"
                />
                <NativeSelect
                  label="Weight %"
                  placeholder="25%"
                  value={String(section.weight_percent ?? 0)}
                  options={withCurrentOption(WEIGHT_PERCENT_OPTIONS, String(section.weight_percent ?? 0), `${section.weight_percent ?? 0}%`)}
                  onChange={(v) => patchSection(index, { weight_percent: Number(v) || 0 })}
                />
                <NativeSelect
                  label="Section timer"
                  placeholder="No pooled timer"
                  value={section.total_time_seconds != null ? String(section.total_time_seconds) : ""}
                  options={[
                    { value: "", label: "No pooled timer" },
                    ...secondsSelectOptions(section.total_time_seconds),
                  ]}
                  onChange={(v) =>
                    patchSection(index, {
                      total_time_seconds: v ? Number(v) : undefined,
                      timer_mode: v ? "section_timer" : section.timer_mode,
                    })
                  }
                />
                <Text style={styles.typesLabel}>Question types in this section</Text>
                <View style={styles.typeWrap}>
                  {(usedTypes.length ? usedTypes : ALL_QUESTION_TYPE_IDS.slice(0, 12)).map((type) => {
                    const active = section.question_types.includes(type)
                    return (
                      <Pressable
                        key={`${index}-${type}`}
                        style={[styles.typeChip, active && styles.typeChipActive]}
                        onPress={() => toggleType(index, type)}
                      >
                        <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                          {questionTypeLabel(type)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <EditorToggleRow
                  label="Allow backtracking"
                  value={section.allow_backtracking !== false}
                  onValueChange={(v) => patchSection(index, { allow_backtracking: v })}
                />
              </View>
            ))}

            <Pressable style={styles.addBtn} onPress={addSection}>
              <Ionicons name="add-circle-outline" size={18} color={FACULTY_ASSESSMENT_COLOR.link} />
              <Text style={styles.addText}>Add section</Text>
            </Pressable>
          </>
        ) : (
          <EditorNotice
            tone="info"
            text="Enable sections to configure weighted parts (e.g. 20% MCQ, 40% code, 40% plots)."
          />
        )}
      </EditorSectionCard>
    </View>
  )
}
