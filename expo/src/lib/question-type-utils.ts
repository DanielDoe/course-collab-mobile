export function normalizeQuestionType(type: string): string {
  return type.toLowerCase().replace(/-/g, "_").trim()
}

export function isMultiSelectType(type: string): boolean {
  const t = normalizeQuestionType(type)
  return t === "select_all" || t === "multi_output"
}
