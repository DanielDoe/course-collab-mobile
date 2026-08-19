import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("schedule adjustment client auth contract", () => {
  it("routes faculty requests through instructorAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "instructor-schedule-adjustment-api.ts"), "utf8")
    assert.match(source, /instructorAuthenticatedRequest/)
    assert.match(source, /from ["']\.\/instructor-api["']/)
    assert.match(source, /getAggregate/)
    assert.match(source, /includeArchived/)
    assert.doesNotMatch(source, /async function instructorRequest/)
    assert.doesNotMatch(source, /"x-instructor-id":\s*String\(scope\.instructorId\)/)
  })

  it("routes student requests through studentAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "schedule-adjustment-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest/)
    assert.match(source, /from ["']\.\/student-api["']/)
    assert.doesNotMatch(source, /async function studentRequest/)
  })
})
