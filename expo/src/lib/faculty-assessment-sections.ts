export type SectionTimerMode = "per_question" | "section_timer"
export type SectionScoringMode = "all" | "student_pick"

export type SectionQuestionTimers = {
  mcq?: number
  true_false?: number
  select_all?: number
  [key: string]: number | undefined
}

export type SectionConfig = {
  title: string
  question_types: string[]
  weight_percent: number
  question_order_start?: number
  question_order_end?: number
  timer_mode?: SectionTimerMode
  total_time_seconds?: number
  /** When set on the first section, one pooled countdown spans all section_timer sections. */
  exam_shared_timer_seconds?: number
  timers?: SectionQuestionTimers
  allow_backtracking?: boolean
  auto_submit_on_expire?: boolean
  questions_required?: number
  section_scoring_mode?: SectionScoringMode
}

export const DEFAULT_SECTION_CONFIG: SectionConfig[] = [
  {
    title: "Section I",
    question_types: ["mcq", "true_false", "select_all", "fill_blank"],
    weight_percent: 20},
  {
    title: "Section II",
    question_types: ["code_write", "code_problem", "debug_code", "code_debug", "code_explain"],
    weight_percent: 40},
  {
    title: "Section III",
    question_types: ["code_write_plot"],
    weight_percent: 40},
]

export const DEFAULT_FINAL_SECTION_CONFIG: SectionConfig[] = [
  {
    title: "Section I",
    question_types: ["mcq", "true_false", "select_all", "fill_blank", "code_output", "trace_output"],
    weight_percent: 20},
  {
    title: "Section II",
    question_types: ["code_write", "code_problem", "debug_code", "code_debug", "code_explain"],
    weight_percent: 40},
  {
    title: "Section III",
    question_types: ["code_write_plot", "code_write"],
    weight_percent: 40},
]

export function defaultSectionTemplate(assessmentType: string): SectionConfig[] {
  return assessmentType === "final"
    ? DEFAULT_FINAL_SECTION_CONFIG.map((s) => ({ ...s, question_types: [...s.question_types] }))
    : DEFAULT_SECTION_CONFIG.map((s) => ({ ...s, question_types: [...s.question_types] }))
}

export function sectionWeightTotal(sections: SectionConfig[]): number {
  return sections.reduce((sum, s) => sum + (s.weight_percent ?? 0), 0)
}

export function validateSectionConfig(sections: SectionConfig[] | null): string | null {
  if (!sections || sections.length === 0) return null
  const total = sectionWeightTotal(sections)
  if (Math.abs(total - 100) > 0.01) {
    return `Section weights must sum to 100% (currently ${total.toFixed(1)}%).`
  }
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    if (!s.title.trim()) return `Section ${i + 1}: enter a title.`
    if (!s.question_types.length) return `Section ${i + 1}: select at least one question type.`
  }
  return null
}

export function parseSectionConfig(raw: unknown): SectionConfig[] | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    try {
      return parseSectionConfig(JSON.parse(raw))
    } catch {
      return null
    }
  }
  if (!Array.isArray(raw)) return null
  return raw.filter((s) => s && typeof s === "object") as SectionConfig[]
}
