/**
 * Run: npx tsx --test src/lib/classroom-points-auth.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("classroom-points client auth contract", () => {
  it("student Classroom Points search uses dock StudentSearchToolbar", () => {
    const source = readFileSync(
      join(here, "../components/rewards/ClassroomPointsScreen.tsx"),
      "utf8",
    )
    assert.match(source, /StudentSearchToolbar/)
    assert.doesNotMatch(source, /CollabSearch/)
    assert.doesNotMatch(source, /placement=["']inline["']/)
  })

  it("production audit script does not treat 200 as pending deploy", () => {
    const source = readFileSync(
      join(here, "../../scripts/audit-classroom-points-production.mjs"),
      "utf8",
    )
    assert.doesNotMatch(source, /pending deploy/)
    assert.match(source, /expectAuthRejected/)
    assert.match(source, /solution-upload/)
    assert.doesNotMatch(source, /approveAll\s*:/)
    assert.doesNotMatch(source, /verifyAndApproveAll/)
  })
})
