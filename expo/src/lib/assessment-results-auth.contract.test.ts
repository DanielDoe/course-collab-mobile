import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { ASSESSMENT_STUDENT_API_PATHS, GRADES_STUDENT_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("assessment results client auth contract", () => {
  it("builds attempt results through studentAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "assessment-results-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest/)
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
    assert.match(source, /getAttemptResults/)
    assert.match(source, /markPdfDownloaded/)
    assert.ok(ASSESSMENT_STUDENT_API_PATHS.includes("/api/student/results/"))
    assert.ok(GRADES_STUDENT_API_PATHS.includes("/api/student/results/"))
    assert.match(source, /\/api\/student\/results\//)
  })
})
