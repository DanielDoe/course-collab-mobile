import assert from "node:assert/strict"
import test from "node:test"
import { quizCodeEditorHeightForKeyboard, quizKeyboardScrollDelta } from "./quiz-keyboard-scroll"

test("scrolls a covered field up above the keyboard", () => {
  assert.equal(
    quizKeyboardScrollDelta({
      fieldTop: 520,
      fieldHeight: 160,
      visibleTop: 120,
      visibleBottom: 540,
    }),
    140,
  )
})

test("does not move a field that is already visible", () => {
  assert.equal(
    quizKeyboardScrollDelta({
      fieldTop: 180,
      fieldHeight: 80,
      visibleTop: 120,
      visibleBottom: 540,
    }),
    0,
  )
})

test("pins a tall editor to the top of the visible window", () => {
  assert.equal(
    quizKeyboardScrollDelta({
      fieldTop: 200,
      fieldHeight: 500,
      visibleTop: 120,
      visibleBottom: 540,
    }),
    80,
  )
})

test("shrinks the code editor when the keyboard is open", () => {
  assert.equal(
    quizCodeEditorHeightForKeyboard({
      windowHeight: 874,
      keyboardHeight: 336,
      topReserve: 210,
      fallback: 200,
    }),
    200,
  )
  assert.ok(
    quizCodeEditorHeightForKeyboard({
      windowHeight: 700,
      keyboardHeight: 336,
      topReserve: 210,
      fallback: 200,
    }) < 200,
  )
})
