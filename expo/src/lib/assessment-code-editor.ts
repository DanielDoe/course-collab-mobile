export type AssessmentCodeLanguage = "cpp" | "c" | "python" | "matlab"

export function resolveAssessmentCodeLanguage(
  questionType: string | null | undefined,
  questionText?: string | null,
): AssessmentCodeLanguage {
  const type = String(questionType ?? "").toLowerCase()
  const text = String(questionText ?? "")

  if (type === "code_write_plot") return "matlab"
  if (/\b(matlab|octave)\b/i.test(text)) return "matlab"
  if (/\bpython\b/i.test(text)) return "python"
  if (/\bC\+\+|cplusplus|cpp\b/i.test(text)) return "cpp"
  if (/(^|\W)C(\W|$)/.test(text) && !/\bC\+\+/i.test(text)) return "c"
  return "cpp"
}

export function assessmentCodeLanguageLabel(language: AssessmentCodeLanguage): string {
  if (language === "matlab") return "MATLAB"
  if (language === "python") return "Python"
  if (language === "c") return "C"
  return "C++"
}

export function assessmentCodePlaceholder(language: AssessmentCodeLanguage): string {
  if (language === "matlab") return "% Write your MATLAB solution"
  if (language === "python") return "# Write your Python solution"
  if (language === "c") return "/* Write your C solution */"
  return "// Write your C++ solution"
}

export function countCodeLines(value: string): number {
  if (!value) return 1
  return value.split("\n").length
}
