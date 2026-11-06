import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("summer camp client auth contract", () => {
  it("uses session-proof headers, not header-only x-student-id", () => {
    const source = readFileSync(join(here, "summer-camp-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedHeaders/)
    assert.match(source, /summerAuthHeaders/)
    assert.doesNotMatch(source, /"x-student-id":\s*studentId/)
  })
})
