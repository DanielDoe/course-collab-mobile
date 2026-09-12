import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assessmentTakeHref,
  assessmentTakeQuizIdFromPath,
  firstRouteParam,
  isAssessmentTakePath,
  parseAssessmentTakeAction,
  parseRouteNumericId,
  resolveAssessmentTakeQuizId,
} from "./route-params"

describe("parseRouteNumericId", () => {
  it("parses a numeric string", () => {
    assert.equal(parseRouteNumericId("184"), 184)
  })

  it("skips non-numeric siblings such as take/report", () => {
    assert.equal(parseRouteNumericId(["take", "184"]), 184)
    assert.equal(parseRouteNumericId(["report", "92"]), 92)
  })

  it("returns null when nothing is numeric", () => {
    assert.equal(parseRouteNumericId("take"), null)
    assert.equal(parseRouteNumericId(["take"]), null)
  })
})

describe("assessment take path helpers", () => {
  it("detects the live take route and the legacy collision path", () => {
    assert.equal(isAssessmentTakePath("/take/184"), true)
    assert.equal(isAssessmentTakePath("/assessment/take/184"), true)
    assert.equal(isAssessmentTakePath("/assessment/take"), true)
    assert.equal(isAssessmentTakePath("/assessment/184"), false)
  })

  it("reads the quiz id from the take pathname", () => {
    assert.equal(assessmentTakeQuizIdFromPath("/take/184"), 184)
    assert.equal(assessmentTakeQuizIdFromPath("/assessment/take/184"), 184)
    assert.equal(assessmentTakeQuizIdFromPath("/take/184?action=continue"), 184)
    assert.equal(assessmentTakeQuizIdFromPath("/assessment/184"), null)
  })

  it("parses take actions", () => {
    assert.equal(parseAssessmentTakeAction("continue"), "continue")
    assert.equal(parseAssessmentTakeAction(["retake"]), "retake")
    assert.equal(parseAssessmentTakeAction("nope"), "start")
  })

  it("builds a literal take href that keeps the homework id and type", () => {
    assert.equal(
      assessmentTakeHref(531, "homework", "continue"),
      "/take/531?type=homework&action=continue&quizId=531",
    )
  })

  it("recovers the quiz id from quizId when [id] is take", () => {
    assert.equal(
      resolveAssessmentTakeQuizId({ id: "take", quizId: "531", pathname: "/assessment/take" }),
      531,
    )
  })
})

describe("firstRouteParam", () => {
  it("skips blank array entries", () => {
    assert.equal(firstRouteParam(["", "homework"]), "homework")
  })
})
