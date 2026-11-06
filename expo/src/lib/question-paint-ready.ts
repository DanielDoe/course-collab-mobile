export const QUESTION_PAINT_FALLBACK_MS = 900

export function countQuestionPaintTargets(args: {
  promptText?: string | null
  optionTexts?: Array<string | null | undefined>
}): number {
  let count = 0
  if ((args.promptText ?? "").trim()) count += 1
  for (const text of args.optionTexts ?? []) {
    if ((text ?? "").trim()) count += 1
  }
  return count
}

export function questionPaintReadyAfterMark(received: number, expected: number): boolean {
  return expected <= 0 || received >= expected
}
