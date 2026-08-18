/**
 * Run: npx tsx --test src/lib/office-hours-auth.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("office hours client auth contract", () => {
  it("production audit script rejects unauth 200 and uses AUDIT-DELETE", () => {
    const source = readFileSync(
      join(here, "../../scripts/audit-office-hours-production.mjs"),
      "utf8",
    )
    assert.match(source, /expectAuthRejected/)
    assert.match(source, /AUDIT-DELETE/)
    assert.doesNotMatch(source, /pending deploy/)
  })

  it("getOfficeHours / createOfficeHours use studentRequest", () => {
    const source = readFileSync(join(here, "student-api.ts"), "utf8")
    const getStart = source.indexOf("getOfficeHours:")
    const createStart = source.indexOf("createOfficeHours:")
    assert.ok(getStart >= 0, "getOfficeHours not found")
    assert.ok(createStart >= 0, "createOfficeHours not found")
    const getBlock = source.slice(getStart, createStart)
    const createEnd = source.indexOf("getRecommendationMeta:", createStart)
    const createBlock = createEnd > createStart
      ? source.slice(createStart, createEnd)
      : source.slice(createStart, createStart + 800)
    assert.match(getBlock, /studentRequest/)
    assert.match(createBlock, /studentRequest/)
  })

  it("createOfficeHourOnBehalf posts to /api/instructor/office-hours", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    const start = source.indexOf("createOfficeHourOnBehalf:")
    assert.ok(start >= 0, "createOfficeHourOnBehalf not found")
    const end = source.indexOf("createRecommendationOnBehalf:", start)
    const block = end > start ? source.slice(start, end) : source.slice(start, start + 600)
    assert.match(block, /\/api\/instructor\/office-hours/)
  })
})
