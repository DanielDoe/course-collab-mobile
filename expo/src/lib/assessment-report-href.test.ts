import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assessmentReportHref,
  assessmentReportRouteParams,
  isAssessmentReportPath,
  parseAssessmentReportAttemptId,
} from "./assessment-report-href"

describe("assessment report href", () => {
  it("opens results off the assessment [id] collision", () => {
    assert.equal(
      assessmentReportHref(5458, "homework", "quiz-history"),
      "/results/5458?type=homework&from=quiz-history",
    )
    assert.deepEqual(assessmentReportRouteParams(5458, "homework", "quiz-history"), {
      pathname: "/results/[attemptId]",
      params: { attemptId: "5458", type: "homework", from: "quiz-history" },
    })
  })

  it("parses the attempt id from params, path, or segments", () => {
    assert.equal(parseAssessmentReportAttemptId({ param: "5458" }), 5458)
    assert.equal(parseAssessmentReportAttemptId({ pathname: "/assessment/report/5458" }), 5458)
    assert.equal(parseAssessmentReportAttemptId({ pathname: "/results/5458" }), 5458)
    assert.equal(
      parseAssessmentReportAttemptId({ segments: ["(app)", "assessment", "report", "5458"] }),
      5458,
    )
  })

  it("recognizes results and legacy report paths", () => {
    assert.equal(isAssessmentReportPath("/results/5458"), true)
    assert.equal(isAssessmentReportPath("/assessment/report/5458"), true)
    assert.equal(isAssessmentReportPath("/module/quiz-history"), false)
  })
})
