/** Default time limits per question type (seconds). Mirrors web quizSettings. */
export const DEFAULT_TIME_PER_TYPE = {
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
  circuit_submission: 600,
} as const

export function getDefaultTimeLimit(questionType: string): number {
  return DEFAULT_TIME_PER_TYPE[questionType as keyof typeof DEFAULT_TIME_PER_TYPE] || 60
}

export function isUntimedMultiPartQuestion(questionType?: string | null): boolean {
  return (questionType || "").toLowerCase() === "multi_part"
}
