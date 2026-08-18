import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { ASSESSMENT_STUDENT_API_PATHS } from "../student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATHS = ASSESSMENT_STUDENT_API_PATHS.filter(
  (path) =>
    path !== "/api/student/issues" &&
    path !== "/api/final/take/" &&
    path !== "/api/student/results/" &&
    path !== "/api/student/assessment-history" &&
    path !== "/api/student/quizzes" &&
    path !== "/api/quiz/take/" &&
    path !== "/api/quiz/submit" &&
    path !== "/api/homework/take/" &&
    path !== "/api/homework/submit" &&
    path !== "/api/midsem/take/" &&
    path !== "/api/midsem/submit" &&
    path !== "/api/student/mid-semesters",
)

describe("assessment quiz client auth contract", () => {
  it("builds take/start/save through student session-proof helpers", () => {
    const source = readFileSync(join(here, "assessment-quiz-api.ts"), "utf8")
    assert.match(
      source,
      /studentAuthenticatedHeaders|studentAuthenticatedRequest|headersHaveStudentSessionProof/,
    )
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
    for (const path of QUIZ_PATHS) {
      assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
    assert.match(source, /\/api\/\$\{apiType\}\/take\//)
    assert.match(source, /\/api\/\$\{apiType\}\/submit/)
    assert.ok(ASSESSMENT_STUDENT_API_PATHS.includes("/api/homework/take/"))
    assert.ok(ASSESSMENT_STUDENT_API_PATHS.includes("/api/homework/submit"))
    assert.ok(ASSESSMENT_STUDENT_API_PATHS.includes("/api/midsem/take/"))
    assert.ok(ASSESSMENT_STUDENT_API_PATHS.includes("/api/midsem/submit"))
    const studentApiSource = readFileSync(join(here, "../student-api.ts"), "utf8")
    assert.match(studentApiSource, /\/api\/student\/mid-semesters/)
  })

  it("lists quizzes through student session-proof helpers", () => {
    const source = readFileSync(join(here, "../student-api.ts"), "utf8")
    assert.match(source, /getQuizzes:[\s\S]*?student(?:Authenticated)?Request/)
    assert.match(source, /\/api\/student\/quizzes/)
  })
})
