import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("rewards client auth contract", () => {
  it("routes rewards requests through studentAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "rewards-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest/)
    assert.match(
      source,
      /studentAuthenticatedHeaders|studentAuthenticatedRequest|headersHaveStudentSessionProof/,
    )
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
    const uploadFn = source.slice(source.indexOf("uploadClassroomSolutionFile"))
    assert.match(uploadFn, /studentAuthenticatedHeaders/)
    assert.doesNotMatch(uploadFn, /"x-student-id":\s*session\.databaseId/)
  })
})
