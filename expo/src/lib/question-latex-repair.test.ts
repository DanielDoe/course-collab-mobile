import assert from "node:assert/strict"
import test from "node:test"
import {
  normalizeLatexMultiCharSubscripts,
  repairCommonLatexCommandEscapes,
  repairRmsSubscriptEscapes,
} from "./question-latex-repair"

test("repairRmsSubscriptEscapes fixes \\r corruption in rms subscripts", () => {
  const corrupted = "$P = V_\rms I_\rms \\cos(36.87^\\circ)$"
  const repaired = repairRmsSubscriptEscapes(corrupted)
  assert.match(repaired, /V_\{rms\}/)
  assert.match(repaired, /I_\{rms\}/)
  assert.doesNotMatch(repaired, /\r/)
})

test("repairCommonLatexCommandEscapes restores cos and circ", () => {
  const repaired = repairCommonLatexCommandEscapes("I_{rms} cos(36.87^circ)")
  assert.match(repaired, /\\cos\(/)
  assert.match(repaired, /\^\\circ/)
})

test("normalizeLatexMultiCharSubscripts braces rms inside inline math", () => {
  const input = "$P = V_rms I_rms \\cos(36.87^\\circ)$"
  const normalized = normalizeLatexMultiCharSubscripts(input)
  assert.match(normalized, /V_\{rms\}/)
  assert.match(normalized, /I_\{rms\}/)
  assert.doesNotMatch(normalized, /V_rms/)
})

test("repairRmsSubscriptEscapes normalizes V_rms and V_{rms}", () => {
  assert.match(repairRmsSubscriptEscapes("V_rms"), /V_\{rms\}/)
  assert.match(repairRmsSubscriptEscapes("V_{rms}"), /V_\{rms\}/)
  assert.match(repairRmsSubscriptEscapes("I_ rms"), /I_\{rms\}/)
})

test("normalizeLatexMultiCharSubscripts leaves single-char subscripts alone", () => {
  const input = "$I_s(t)$"
  assert.equal(normalizeLatexMultiCharSubscripts(input), input)
})
