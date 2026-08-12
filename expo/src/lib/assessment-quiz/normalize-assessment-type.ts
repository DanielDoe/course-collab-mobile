/** Map UI / list kinds to API route segments (matches web quiz-taker). */
export function normalizeAssessmentType(type: string): string {
  const mapping: Record<string, string> = {
    quiz: "quiz",
    homework: "homework",
    mid_semester: "midsem",
    midsem: "midsem",
    final: "final",
    finals: "final",
  }
  return mapping[type.toLowerCase()] ?? "quiz"
}
