export const DEFAULT_TIME_PER_TYPE: Record<string, number> = {
  true_false: 30,
  mcq: 40,
  select_all: 40,
  fill_blank: 45,
  code_write: 420,
  code_write_plot: 420,
  code_explain: 180,
  code_problem: 420,
  debug_code: 240,
  code_debug: 240,
  fill_code: 120,
  trace_logic: 90,
  scenario_match: 60,
  multi_output: 90,
  code_reorder: 120,
  trace_output: 90,
  code_output: 60,
  multi_part: 300,
  circuit_numeric: 120,
  circuit_worked_solution: 480,
  circuit_diagram_analysis: 420,
  circuit_multi_part: 540,
  circuit_fill_equation: 180,
  circuit_transfer_function: 480,
  circuit_phasor_power: 420,
  circuit_transient_response: 420,
  circuit_upload_work: 600,
  circuit_submission: 600}

export const QUESTION_TYPE_GROUPS = [
  {
    label: "General",
    types: [
      { id: "mcq", label: "Multiple choice" },
      { id: "true_false", label: "True / false" },
      { id: "select_all", label: "Select all that apply" },
      { id: "fill_blank", label: "Fill in blank" },
      { id: "scenario_match", label: "Scenario match" },
      { id: "multi_output", label: "Multi output" },
    ]},
  {
    label: "Code",
    types: [
      { id: "code_output", label: "Code output" },
      { id: "trace_logic", label: "Trace logic" },
      { id: "trace_output", label: "Trace output" },
      { id: "fill_code", label: "Fill in code" },
      { id: "code_reorder", label: "Code reorder" },
      { id: "code_problem", label: "Code problem" },
      { id: "debug_code", label: "Debug code" },
      { id: "code_debug", label: "Code debug" },
      { id: "code_write", label: "Code write" },
      { id: "code_explain", label: "Code explain" },
      { id: "code_write_plot", label: "Code write + plot" },
    ]},
  {
    label: "Circuits",
    types: [
      { id: "circuit_numeric", label: "Circuit numeric" },
      { id: "circuit_worked_solution", label: "Worked solution" },
      { id: "circuit_fill_equation", label: "Fill equation" },
      { id: "circuit_transfer_function", label: "Transfer function" },
      { id: "circuit_phasor_power", label: "Phasor / power" },
      { id: "circuit_transient_response", label: "Transient response" },
      { id: "circuit_multi_part", label: "Circuit multi-part" },
      { id: "circuit_upload_work", label: "Upload work" },
      { id: "circuit_submission", label: "Circuit submission" },
      { id: "multi_part", label: "Multi-part (bank)" },
    ]},
] as const

export const ALL_QUESTION_TYPE_IDS = QUESTION_TYPE_GROUPS.flatMap((g) =>
  g.types.map((t) => t.id),
)

export const TEXT_ANSWER_QUESTION_TYPES = new Set([
  "fill_blank",
  "code_output",
  "trace_output",
  "trace_logic",
  "fill_code",
  "scenario_match",
  "debug_code",
  "code_explain",
  "code_reorder",
  "code_problem",
  "code_write",
  "code_write_plot",
  "code_debug",
])

export const CIRCUIT_QUESTION_TYPES = new Set([
  "circuit_numeric",
  "circuit_worked_solution",
  "circuit_diagram_analysis",
  "circuit_multi_part",
  "circuit_fill_equation",
  "circuit_transfer_function",
  "circuit_phasor_power",
  "circuit_transient_response",
  "circuit_upload_work",
  "circuit_submission",
])

/** Sentinel stored in legacy rows; treated as disabled AI code grading. */
export const CODE_LANGUAGE_NONE = "none"

export const CODE_LANGUAGE_OPTIONS = [
  { id: "cpp", label: "C++" },
  { id: "matlab", label: "MATLAB" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "c", label: "C" },
] as const

/** Assessment-wide allowed languages — includes None/N/A for circuit-only courses. */
export const ASSESSMENT_CODE_LANGUAGE_OPTIONS = [
  { id: CODE_LANGUAGE_NONE, label: "None / N/A" },
  ...CODE_LANGUAGE_OPTIONS,
] as const

/** Per-question override — null in API means use assessment default. */
export const QUESTION_AI_LANGUAGE_OPTIONS = [
  { id: "__quiz_default__", label: "Use assessment default" },
  ...CODE_LANGUAGE_OPTIONS,
] as const

export const AI_MODEL_OPTIONS = [
  { id: "auto", label: "Smart routing" },
  { id: "auto-openai", label: "Smart (OpenAI)" },
  { id: "auto-claude", label: "Smart (Claude)" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
  { id: "gpt-5.5", label: "GPT-5.5" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
] as const

export const SUPERPOWER_OPTIONS = [
  { id: "copy_paste", label: "Copy / paste" },
  { id: "disable_tab_tracking", label: "No tab tracking" },
  { id: "disable_ai_detection", label: "No AI detection" },
  { id: "increase_strikes", label: "Extra strikes" },
  { id: "extra_retake", label: "+1 retake" },
  { id: "extra_time", label: "+5 min coding" },
] as const

export function questionTypeAbbrev(type: string): string {
  const t = type.toLowerCase()
  if (t === "mcq") return "MCQ"
  if (t === "true_false") return "T/F"
  if (t === "select_all") return "SAA"
  if (t.startsWith("circuit_")) return "CKT"
  if (t.startsWith("code_") || t.includes("code")) return "CODE"
  return questionTypeLabel(t).slice(0, 4).toUpperCase()
}

export const QUESTION_TYPES_WITH_AI_LANGUAGE = new Set([
  "code_write",
  "code_problem",
  "debug_code",
  "code_debug",
  "code_explain",
])

export const AI_EVAL_MODES = [
  { id: "relaxed", label: "Relaxed" },
  { id: "standard", label: "Standard" },
  { id: "strict", label: "Strict" },
  { id: "very_strict", label: "Very strict" },
] as const

export function questionTypeLabel(type: string): string {
  for (const group of QUESTION_TYPE_GROUPS) {
    const found = group.types.find((t) => t.id === type.toLowerCase())
    if (found) return found.label
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isCircuitQuestionType(type: string): boolean {
  return CIRCUIT_QUESTION_TYPES.has(type.toLowerCase())
}

export function isTextAnswerType(type: string): boolean {
  return TEXT_ANSWER_QUESTION_TYPES.has(type.toLowerCase())
}

export function isMcqStyleType(type: string): boolean {
  const t = type.toLowerCase()
  return !isTextAnswerType(t) && !isCircuitQuestionType(t) && t !== "multi_part" && t !== "circuit_submission"
}

export function defaultTimeLimit(type: string): number {
  return DEFAULT_TIME_PER_TYPE[type.toLowerCase()] ?? 60
}
