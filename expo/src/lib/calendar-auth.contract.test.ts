/**
 * Run: npx tsx --test src/lib/calendar-auth.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("calendar client auth contract", () => {
  it("production audit script does not treat 200 as PASS", () => {
    const source = readFileSync(
      join(here, "../../scripts/audit-calendar-production.mjs"),
      "utf8",
    )
    assert.match(source, /expectAuthRejected/)
    assert.match(source, /calendar\/events/)
    assert.doesNotMatch(source, /pending deploy/)
    assert.doesNotMatch(source, /approveAll/)
  })

  it("getCalendarEvents goes through studentRequest", () => {
    const source = readFileSync(join(here, "student-api.ts"), "utf8")
    const start = source.indexOf("getCalendarEvents:")
    assert.ok(start >= 0, "getCalendarEvents not found")
    const end = source.indexOf("getClassSchedule:", start)
    const block = end > start ? source.slice(start, end) : source.slice(start, start + 800)
    assert.match(block, /studentRequest/)
  })
})
