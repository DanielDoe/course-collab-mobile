import assert from "node:assert/strict"
import test from "node:test"
import {
  buildAnswerForSubmit,
  buildCodeWriteAnswerForSubmit,
  codeWriteSubmissionReady,
  isAssessmentMultiSelectQuestion,
  isCodeWritePlotQuestion,
  isNativeCodeQuestion,
  isNativeSupportedQuestionType,
  parseCodeWriteSavedAnswer,
  resolveAssessmentQuestionMcqEarnedFraction,
  restoreCodeWriteFromSaved,
  restoreSelectionFromSavedAnswer,
} from "./assessment-answer-mapper"
import type { AssessmentQuestion } from "./assessment-quiz-types"

const selectAllQuestion: AssessmentQuestion = {
  id: 1,
  question_text: "Pick all correct statements.",
  question_type: "select_all",
  option_a: "The apparent power is 6.0 kVA.",
  option_b: "The apparent power is 8.4 kVA.",
  option_c: "The power factor is 0.80 lagging.",
  option_d: "The power factor is 0.80 leading.",
  correct_answer: JSON.stringify([
    "The apparent power is 6.0 kVA.",
    "The power factor is 0.80 lagging.",
  ]),
}

test("select_all questions use checkbox mode", () => {
  assert.equal(isAssessmentMultiSelectQuestion(selectAllQuestion), true)
})

test("buildAnswerForSubmit sends option text values for select_all", () => {
  assert.deepEqual(
    buildAnswerForSubmit(selectAllQuestion, "", ["A", "C"], ""),
    ["The apparent power is 6.0 kVA.", "The power factor is 0.80 lagging."],
  )
})

test("restoreSelectionFromSavedAnswer parses JSON option text arrays", () => {
  const restored = restoreSelectionFromSavedAnswer(
    selectAllQuestion,
    JSON.stringify(["The apparent power is 6.0 kVA.", "The power factor is 0.80 lagging."]),
  )
  assert.deepEqual(restored.letters, ["A", "C"])
})

test("restoreSelectionFromSavedAnswer parses letter arrays", () => {
  const restored = restoreSelectionFromSavedAnswer(selectAllQuestion, JSON.stringify(["A", "C"]))
  assert.deepEqual(restored.letters, ["A", "C"])
})

test("partial credit fraction is computed when one of two keys is selected", () => {
  const fraction = resolveAssessmentQuestionMcqEarnedFraction(selectAllQuestion, "", ["A"])
  assert.equal(fraction, 0.5)
})

test("full credit fraction when all correct options are selected", () => {
  const fraction = resolveAssessmentQuestionMcqEarnedFraction(selectAllQuestion, "", ["A", "C"])
  assert.equal(fraction, 1)
})

test("buildAnswerForSubmit sends the option letter for MCQ", () => {
  const mcq: AssessmentQuestion = {
    id: 2,
    question_text: "What is the current?",
    question_type: "mcq",
    option_a: "3 mA",
    option_b: "30 mA",
    option_c: "300 mA",
    option_d: "3 A",
    correct_answer: "B",
  }
  assert.equal(buildAnswerForSubmit(mcq, "B", [], ""), "B")
  assert.equal(buildAnswerForSubmit(mcq, "A", [], ""), "A")
})

const codeWrite: AssessmentQuestion = {
  id: 11,
  question_text: "Write a C++ program that prints Hello.",
  question_type: "code_write",
}

const codePlot: AssessmentQuestion = {
  id: 12,
  question_text: "Plot the waveform.",
  question_type: "code_write_plot",
}

test("code_write and code_write_plot are native supported", () => {
  assert.equal(isNativeSupportedQuestionType("code_write"), true)
  assert.equal(isNativeSupportedQuestionType("code_write_plot"), true)
  assert.equal(isNativeCodeQuestion(codeWrite), true)
  assert.equal(isCodeWritePlotQuestion(codePlot), true)
  assert.equal(isNativeSupportedQuestionType("code_explain"), false)
})

test("buildAnswerForSubmit sends raw source for code_write", () => {
  const source = "#include <iostream>\nint main() { return 0; }"
  assert.equal(buildAnswerForSubmit(codeWrite, "", [], source), source)
})

test("buildAnswerForSubmit wraps code_write_plot as JSON with plot", () => {
  const source = "plot(x, y);"
  const plot = "data:image/png;base64,abc"
  assert.equal(
    buildAnswerForSubmit(codePlot, "", [], source, plot),
    JSON.stringify({ code: source, plotImage: plot }),
  )
  assert.equal(buildCodeWriteAnswerForSubmit(source, plot), JSON.stringify({ code: source, plotImage: plot }))
})

test("parseCodeWriteSavedAnswer restores code and plot from JSON", () => {
  const parsed = parseCodeWriteSavedAnswer(
    JSON.stringify({ code: "int main(){}", plotImage: "data:image/png;base64,xyz" }),
  )
  assert.equal(parsed.code, "int main(){}")
  assert.equal(parsed.plotImage, "data:image/png;base64,xyz")
})

test("parseCodeWriteSavedAnswer treats plain source as code", () => {
  const parsed = parseCodeWriteSavedAnswer("cout << 1;")
  assert.equal(parsed.code, "cout << 1;")
  assert.equal(parsed.plotImage, "")
})

test("restoreSelectionFromSavedAnswer extracts code from plot JSON", () => {
  const restored = restoreSelectionFromSavedAnswer(
    codePlot,
    JSON.stringify({ code: "hold on;", plotImage: "data:image/png;base64,qq" }),
  )
  assert.equal(restored.text, "hold on;")
})

test("code_write_plot requires a plot before submit", () => {
  assert.equal(codeWriteSubmissionReady(codePlot, "plot(1)", ""), false)
  assert.equal(codeWriteSubmissionReady(codePlot, "plot(1)", "data:image/png;base64,aa"), true)
  assert.equal(codeWriteSubmissionReady(codeWrite, "int x = 1;", ""), true)
  assert.equal(codeWriteSubmissionReady(codeWrite, "   ", ""), false)
})

test("restoreCodeWriteFromSaved fills plot from answerData", () => {
  const restored = restoreCodeWriteFromSaved({
    questionId: 12,
    answer: "hold on;",
    answerData: { code: "hold on;", plotImage: "data:image/png;base64,from-data" },
  })
  assert.equal(restored.code, "hold on;")
  assert.equal(restored.plotImage, "data:image/png;base64,from-data")
})
