import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canonicalizeSelectAllCorrectAnswers,
  formatEvaluateCorrectAnswer,
  formatMcqSubquestionCorrectAnswer,
  gradeSelectAllAnswer,
  initialSamplePracticeSelection,
  isMcqSubquestionCorrect,
  isQuizMcqOptionCorrect,
  normalizeGradableSubquestionAnswers,
  normalizeSamplePracticeSelectAllResult,
  normalizeStructuredOptions,
  optionLetterIsCorrectForEvaluateResult,
  parseSamplePracticeStudentAnswer,
  resolveCorrectLetterFromEvaluateAnswer,
  resolveMcqCorrectLetter,
  resolveMcqEarnedFractionForSubmission,
  resolveSelectAllCorrectLetters,
  samplePracticeEngagementPointsMessage,
  samplePracticeOptionReviewState,
  samplePracticeResultSummary,
  selectedLettersFromSavedAnswer,
  type GradableMcqSubQuestion,
} from "./lecture-sample-practice-grading"

describe("lecture sample practice schema normalization", () => {
  const computerProgramOptions = [
    { id: "A", text: "A device used for calculations" },
    { id: "B", text: "A self-contained set of instructions to operate a computer" },
    { id: "C", text: "A sequence of electrical signals" },
    { id: "D", text: "A permanent memory chip" },
  ]

  it("normalizes legacy string[] options into structured { id, text }[]", () => {
    const structured = normalizeStructuredOptions([
      "A device used for calculations",
      "A self-contained set of instructions to operate a computer",
      "A sequence of electrical signals",
      "A permanent memory chip",
    ])
    assert.deepEqual(structured, computerProgramOptions)
  })

  it("splits a single newline-delimited options field into structured options", () => {
    const structured = normalizeStructuredOptions(
      "A device used for calculations\nA self-contained set of instructions to operate a computer\nA sequence of electrical signals\nA permanent memory chip",
    )
    assert.equal(structured.length, 4)
    assert.equal(structured[1]?.id, "B")
  })

  it("stores MCQ correct_answer as a letter ID", () => {
    const legacy: GradableMcqSubQuestion = {
      id: "a",
      type: "mcq",
      prompt: "Which of the following best defines a computer program?",
      options: computerProgramOptions.map((opt) => opt.text),
      correct_answer: "A self-contained set of instructions to operate a computer",
    }
    const normalized = normalizeGradableSubquestionAnswers(legacy)
    assert.deepEqual(normalized.options, computerProgramOptions)
    assert.equal(normalized.correct_answer, "B")
    assert.equal(isMcqSubquestionCorrect(normalized, "B"), true)
  })

  it("keeps select_all correct_answers as option text values", () => {
    const sq: GradableMcqSubQuestion = {
      id: "a",
      type: "select_all",
      prompt: "Select all correct statements.",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correct_answers: ["A", "C"],
    }
    const normalized = normalizeGradableSubquestionAnswers(sq)
    assert.deepEqual(canonicalizeSelectAllCorrectAnswers(normalized), ["Option A", "Option C"])
  })

  it("formats MCQ feedback with letter and option text", () => {
    const sq: GradableMcqSubQuestion = {
      id: "a",
      type: "mcq",
      prompt: "Which of the following best defines a computer program?",
      options: computerProgramOptions,
      correct_answer: "B",
    }
    const formatted = formatMcqSubquestionCorrectAnswer(sq)
    assert.match(formatted, /^B — /)
    assert.match(formatted, /self-contained set of instructions/i)
  })

  it("maps evaluate API correct_answer text back to option letter", () => {
    const letter = resolveCorrectLetterFromEvaluateAnswer(
      computerProgramOptions,
      "A self-contained set of instructions to operate a computer",
    )
    assert.equal(letter, "B")
    const formatted = formatEvaluateCorrectAnswer(
      computerProgramOptions,
      "A self-contained set of instructions to operate a computer",
    )
    assert.match(formatted, /^B — /)
  })

  it("parses select_all student answers from arrays, JSON strings, and legacy parts", () => {
    assert.deepEqual(parseSamplePracticeStudentAnswer(["A", "C", "E"]), ["A", "C", "E"])
    assert.deepEqual(parseSamplePracticeStudentAnswer('["A","B"]'), ["A", "B"])
    assert.deepEqual(parseSamplePracticeStudentAnswer({ parts: { a: ["A", "E"] } }), ["A", "E"])
    assert.deepEqual(selectedLettersFromSavedAnswer(["b", "d"]), ["B", "D"])
    assert.deepEqual(initialSamplePracticeSelection(["A", "C"], "select_all"), ["A", "C"])
  })

  it("grades select_all from letter submissions against text correct_answers", () => {
    const sq: GradableMcqSubQuestion = {
      id: "a",
      type: "select_all",
      prompt: "Select all procedural languages.",
      options: [
        { id: "A", text: "FORTRAN" },
        { id: "B", text: "ALGOL" },
        { id: "C", text: "COBOL" },
        { id: "D", text: "C++" },
        { id: "E", text: "BASIC" },
      ],
      correct_answers: ["FORTRAN", "ALGOL", "COBOL", "BASIC"],
    }
    const normalized = normalizeGradableSubquestionAnswers(sq)
    assert.deepEqual(resolveSelectAllCorrectLetters(normalized), ["A", "B", "C", "E"])
    const evaluateCorrect = ["FORTRAN", "ALGOL", "COBOL", "BASIC"]
    assert.equal(isQuizMcqOptionCorrect("A", "FORTRAN", evaluateCorrect), true)
    assert.equal(isQuizMcqOptionCorrect("D", "C++", evaluateCorrect), false)
    assert.equal(isQuizMcqOptionCorrect("E", "BASIC", evaluateCorrect), true)
    assert.equal(
      optionLetterIsCorrectForEvaluateResult(normalized.options, "A", evaluateCorrect),
      true,
    )
  })

  it("grades select_all with partial credit when a correct option is missed", () => {
    const declarationsQuestion: GradableMcqSubQuestion = {
      id: "a",
      type: "select_all",
      prompt: "Select all valid variable declarations from lecture:",
      options: [
        { id: "A", text: "int age = 20;" },
        { id: "B", text: "double pi = 3.14;" },
        { id: "C", text: "bool student = true;" },
        { id: "D", text: "real gpa = 4.0;" },
        { id: "E", text: "char grade = 'A';" },
      ],
      correct_answers: [
        "int age = 20;",
        "double pi = 3.14;",
        "bool student = true;",
        "char grade = 'A';",
      ],
    }

    const graded = gradeSelectAllAnswer(declarationsQuestion, ["A", "B", "E"])
    assert.equal(graded.is_mcq_correct, false)
    assert.equal(graded.mcq_earned_fraction, 0.75)
    assert.equal(graded.answerReview.summary, "Partially correct (75%).")

    const full = gradeSelectAllAnswer(declarationsQuestion, ["A", "B", "C", "E"])
    assert.equal(full.is_mcq_correct, true)
    assert.equal(full.mcq_earned_fraction, 1)

    const wrongSelection = gradeSelectAllAnswer(declarationsQuestion, ["A", "B", "D"])
    assert.equal(wrongSelection.is_mcq_correct, false)
    assert.equal(wrongSelection.mcq_earned_fraction, 0.25)

    const normalized = normalizeSamplePracticeSelectAllResult(
      {
        question_id: "q9",
        is_mcq_correct: true,
        mcq_earned_fraction: 1,
        parts: [],
        has_upload: false,
        upload_acknowledged: false,
        answerReview: {
          isCorrect: true,
          correctLetters: [],
          correctTexts: [],
          options: [],
          summary: "Correct!",
        },
      },
      {
        question_type: "select_all",
        options: declarationsQuestion.options,
        correct_answers: declarationsQuestion.correct_answers,
      },
      ["A", "B", "E"],
    )
    assert.equal(normalized.is_mcq_correct, false)
    assert.equal(normalized.mcq_earned_fraction, 0.75)
    assert.match(
      samplePracticeResultSummary(normalized, {
        question_type: "select_all",
        options: declarationsQuestion.options,
      }),
      /Partially correct \(75%\)/,
    )
  })

  it("keeps the server select_all verdict when no answer key is available", () => {
    const options = [
      { id: "A", text: "FORTRAN" },
      { id: "B", text: "ALGOL" },
      { id: "C", text: "COBOL" },
      { id: "D", text: "C++" },
      { id: "E", text: "Pascal" },
    ]
    const selected = ["A", "B", "C", "E"]
    // The student GET strips keys, and older servers send correct_answer: null.
    const serverResult = {
      question_id: "q6",
      is_mcq_correct: true,
      mcq_earned_fraction: 1,
      parts: [
        { id: "a", prompt: "", selected, correct_answer: null, is_correct: true, options: [] },
      ],
      has_upload: false,
      upload_acknowledged: false,
    }

    const normalized = normalizeSamplePracticeSelectAllResult(
      serverResult,
      { question_type: "select_all", options },
      selected,
    )
    assert.equal(normalized.is_mcq_correct, true)
    assert.equal(normalized.mcq_earned_fraction, 1)

    // Correct selections must not be painted as wrong when the key is unknown.
    for (const letter of selected) {
      const state = samplePracticeOptionReviewState(letter, selected, normalized, options)
      assert.equal(state.showWrongSelection, false)
    }
  })

  it("parses select_all keys sent as a JSON-encoded string", () => {
    const options = [
      { id: "A", text: "FORTRAN" },
      { id: "B", text: "ALGOL" },
      { id: "C", text: "COBOL" },
      { id: "D", text: "C++" },
      { id: "E", text: "Pascal" },
    ]
    const keys = ["FORTRAN", "ALGOL", "COBOL", "Pascal"]
    const resultFor = (selected: string[]) =>
      normalizeSamplePracticeSelectAllResult(
        {
          question_id: "q6",
          is_mcq_correct: false,
          mcq_earned_fraction: 0,
          parts: [
            {
              id: "a",
              prompt: "",
              selected,
              correct_answer: JSON.stringify(keys),
              is_correct: false,
              options: [],
            },
          ],
          has_upload: false,
          upload_acknowledged: false,
        },
        { question_type: "select_all", options },
        selected,
      )

    const allCorrect = resultFor(["A", "B", "C", "E"])
    assert.equal(allCorrect.is_mcq_correct, true)
    assert.deepEqual(allCorrect.answerReview?.correctLetters, ["A", "B", "C", "E"])

    const withWrongPick = resultFor(["A", "B", "C", "D", "E"])
    assert.equal(withWrongPick.is_mcq_correct, false)
    assert.equal(
      samplePracticeOptionReviewState("D", ["A", "B", "C", "D", "E"], withWrongPick, options)
        .showWrongSelection,
      true,
    )
  })

  it("resolves select_all partial credit for evaluate payloads", () => {
    const fraction = resolveMcqEarnedFractionForSubmission({
      questionType: "select_all",
      options: [
        { id: "A", text: "int age = 20;" },
        { id: "B", text: "double pi = 3.14;" },
        { id: "C", text: "bool student = true;" },
        { id: "D", text: "real gpa = 4.0;" },
        { id: "E", text: "char grade = 'A';" },
      ],
      correctAnswers: [
        "int age = 20;",
        "double pi = 3.14;",
        "bool student = true;",
        "char grade = 'A';",
      ],
      selectedLetters: ["A", "B", "E"],
    })
    assert.equal(fraction, 0.75)
    assert.match(
      samplePracticeEngagementPointsMessage({
        pointsSynced: true,
        pointsEarned: 3,
        mcqEarnedFraction: 0.75,
      }),
      /Partial practice engagement points recorded \(\+3\)/,
    )
  })

  it("prefers server answerReview for option highlighting", () => {
    const state = samplePracticeOptionReviewState(
      "B",
      ["A", "B"],
      {
        answerReview: {
          options: [
            { letter: "A", isSelected: true, isCorrect: false },
            { letter: "B", isSelected: true, isCorrect: true },
          ],
        },
      },
      [{ id: "A", text: "Wrong" }, { id: "B", text: "Right" }],
    )
    assert.equal(state.isCorrect, true)
    assert.equal(state.showWrongSelection, false)
  })

  it("handles circuit-style legacy text keys during migration", () => {
    const legacy: GradableMcqSubQuestion = {
      id: "a",
      type: "mcq",
      prompt: "What is the current?",
      options: ["3 mA", "30 mA", "300 mA", "3 A"],
      correct_answer: "30 mA",
    }
    const normalized = normalizeGradableSubquestionAnswers(legacy)
    assert.equal(resolveMcqCorrectLetter(normalized), "B")
    assert.equal(normalized.correct_answer, "B")
  })
})
