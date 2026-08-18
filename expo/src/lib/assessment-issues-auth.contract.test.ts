import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { ASSESSMENT_STUDENT_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("assessment issues client auth contract", () => {
  it("routes list/create/comments through studentAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "assessment-issues-api.ts"), "utf8")
    assert.match(
      source,
      /studentAuthenticatedHeaders|studentAuthenticatedRequest|headersHaveStudentSessionProof/,
    )
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
    assert.match(source, new RegExp("/api/student/issues".replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.ok(ASSESSMENT_STUDENT_API_PATHS.includes("/api/student/issues"))
  })
})
