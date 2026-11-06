/** How far to scroll so a focused field stays inside the visible window above the keyboard. */
export function quizKeyboardScrollDelta(input: {
  fieldTop: number
  fieldHeight: number
  visibleTop: number
  visibleBottom: number
}): number {
  const fieldBottom = input.fieldTop + input.fieldHeight
  const visibleHeight = input.visibleBottom - input.visibleTop
  if (visibleHeight <= 0) return 0
  if (input.fieldHeight >= visibleHeight) {
    return input.fieldTop - input.visibleTop
  }
  if (fieldBottom > input.visibleBottom) return fieldBottom - input.visibleBottom
  if (input.fieldTop < input.visibleTop) return input.fieldTop - input.visibleTop
  return 0
}

/** Shrink the code box so it fits between the quiz chrome and the keyboard. */
export function quizCodeEditorHeightForKeyboard(input: {
  windowHeight: number
  keyboardHeight: number
  topReserve: number
  fallback: number
}): number {
  if (input.keyboardHeight <= 0) return input.fallback
  const remaining = input.windowHeight - input.keyboardHeight - input.topReserve
  return Math.max(132, Math.min(input.fallback, remaining))
}
