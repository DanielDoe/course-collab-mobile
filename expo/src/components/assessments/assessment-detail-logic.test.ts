import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { QuizItem } from "../../lib/student-api"
import { buildAssessmentDetailActions } from "./assessment-detail-logic"

/** Production student row flags for published-but-closed quiz 209 (2026-08-18). */
const QUIZ_209: QuizItem = {
  id: 209,
  title: "AUDIT-DELETE Quiz",
  is_active: false,
  can_take: false,
  semester_assessments_closed: true,
  calendar_open: false,
  session_access_active: true,
  rollover_active: false,
}

describe("buildAssessmentDetailActions", () => {
  it("labels quiz 209 Closed and hides Start", () => {
    const actions = buildAssessmentDetailActions(QUIZ_209, "Quiz")
    assert.equal(actions.statusLabel, "Closed")
    assert.equal(actions.showStart, false)
  })
})
