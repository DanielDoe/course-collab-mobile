import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("assessment list mid-semester routing contract", () => {
  it("lists mid-semester via getQuizzes, not getMidSemesters", () => {
    const source = readFileSync(join(here, "assessment-list-logic.ts"), "utf8")
    assert.doesNotMatch(source, /getMidSemesters/)
    assert.match(source, /getQuizzes/)
    assert.match(source, /["']mid_semester["']/)
  })
})
