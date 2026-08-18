/**
 * Run: npx tsx --test src/lib/trade-center-auth.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("trade-center client auth contract", () => {
  it("routes rewards Trade Center calls through studentAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "rewards-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest/)
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
  })

  it("student Trade Center search uses dock StudentSearchToolbar", () => {
    const source = readFileSync(
      join(here, "../components/rewards/TradeCenterScreen.tsx"),
      "utf8",
    )
    assert.match(source, /StudentSearchToolbar/)
    assert.doesNotMatch(source, /CollabSearch/)
  })
})
