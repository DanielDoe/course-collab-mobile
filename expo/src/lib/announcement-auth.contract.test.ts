/**
 * Run: npx tsx --test src/lib/announcement-auth.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("announcements client auth contract", () => {
  it("production audit script rejects header-only 200 and uses AUDIT-DELETE", () => {
    const source = readFileSync(
      join(here, "../../scripts/audit-announcements-production.mjs"),
      "utf8",
    )
    assert.match(source, /expectAuthRejected/)
    assert.match(source, /AUDIT-DELETE/)
    assert.match(source, /loginAlex/)
    assert.match(source, /loginFaculty/)
    assert.doesNotMatch(source, /pending deploy/)
    assert.doesNotMatch(source, /function instructorHeaders/)
  })

  it("faculty announcement upload sends instructorAuthenticatedHeaders", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    const start = source.indexOf("uploadAnnouncementAttachment:")
    assert.ok(start >= 0, "uploadAnnouncementAttachment missing")
    const block = source.slice(start, start + 900)
    assert.match(block, /instructorAuthenticatedHeaders/)
    assert.doesNotMatch(block, /"x-instructor-id": String\(scope\.instructorId\)/)
  })
})
