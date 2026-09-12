import assert from "node:assert/strict"
import test from "node:test"
import { countCodeLines, resolveAssessmentCodeLanguage } from "./assessment-code-editor"

test("code_write_plot uses MATLAB", () => {
  assert.equal(resolveAssessmentCodeLanguage("code_write_plot", "Plot y = sin(x)"), "matlab")
})

test("code_write defaults to C++ unless the prompt names another language", () => {
  assert.equal(resolveAssessmentCodeLanguage("code_write", "Write a factorial function"), "cpp")
  assert.equal(resolveAssessmentCodeLanguage("code_write", "Write a Python function"), "python")
  assert.equal(resolveAssessmentCodeLanguage("code_write", "Use MATLAB to compute zeros"), "matlab")
})

test("countCodeLines treats empty as one line", () => {
  assert.equal(countCodeLines(""), 1)
  assert.equal(countCodeLines("a\nb\nc"), 3)
})
