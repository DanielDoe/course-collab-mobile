import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { ASSESSMENT_STUDENT_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("quiz history client load contract", () => {
  it("lists History from /api/student/quiz-history, not assessment-history alone", () => {
    const api = readFileSync(join(here, "student-api.ts"), "utf8")
    assert.match(api, /getQuizHistory:\s*(?:async\s*)?\(session/)
    assert.match(api, /\/api\/student\/quiz-history/)
    assert.match(api, /getAssessmentHistory:\s*(?:async\s*)?\(session/)
    assert.match(api, /\/api\/student\/assessment-history/)
    assert.match(api, /studentAuthenticatedRequest|studentRequest/)

    const screen = readFileSync(join(here, "../components/assessments/QuizHistoryScreen.tsx"), "utf8")
    assert.match(screen, /getQuizHistory/)
    assert.match(screen, /quizHistoryToAssessmentItems/)
    assert.ok(ASSESSMENT_STUDENT_API_PATHS.includes("/api/student/assessment-history"))
  })
})
