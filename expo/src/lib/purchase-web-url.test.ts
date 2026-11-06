/**
 * Run: npx tsx --test src/lib/purchase-web-url.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { buildPurchaseWebUrl, canonicalizePurchaseWebUrl } from "./purchase-web-url"

const here = dirname(fileURLToPath(import.meta.url))

describe("canonicalizePurchaseWebUrl", () => {
  it("rewrites Vercel checkout hosts to course-collab.com", () => {
    assert.equal(
      canonicalizePurchaseWebUrl(
        "https://coursecollab.vercel.app/student/dashboard-v2/membership/checkout?plan=Explorer&cadence=semester",
      ),
      "https://course-collab.com/student/dashboard-v2/membership/checkout?plan=Explorer&cadence=semester",
    )
  })

  it("rewrites www to the apex domain", () => {
    assert.equal(
      canonicalizePurchaseWebUrl("https://www.course-collab.com/student/dashboard-v2/guest/cora-credits?pack=starter"),
      "https://course-collab.com/student/dashboard-v2/guest/cora-credits?pack=starter",
    )
  })
})

describe("buildPurchaseWebUrl", () => {
  it("normalizes Vercel bases to the canonical domain", () => {
    assert.equal(
      buildPurchaseWebUrl(
        "https://coursecollab.vercel.app",
        "/student/dashboard-v2/membership/checkout?plan=Explorer&cadence=semester",
      ),
      "https://course-collab.com/student/dashboard-v2/membership/checkout?plan=Explorer&cadence=semester",
    )
  })
})

describe("purchase-navigation", () => {
  it("uses the canonical purchase base and rewrites API redirect URLs", () => {
    const source = readFileSync(join(here, "purchase-navigation.ts"), "utf8")
    assert.match(source, /resolvePurchaseBaseUrl/)
    assert.match(source, /canonicalizePurchaseWebUrl/)
  })
})
