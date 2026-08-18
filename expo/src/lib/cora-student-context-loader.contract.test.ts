import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("cora student context mid-semester routing contract", () => {
  it("loads mid-semester via getQuizzes, not getMidSemesters", () => {
    const source = readFileSync(join(here, "cora-student-context-loader.ts"), "utf8")
    assert.doesNotMatch(source, /getMidSemesters/)
    assert.match(source, /getQuizzes/)
    assert.match(source, /["']mid_semester["']/)
  })
})
