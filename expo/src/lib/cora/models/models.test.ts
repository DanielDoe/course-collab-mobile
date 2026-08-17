/**
 * Run: npx tsx --test expo/src/lib/cora/models/models.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { normalizeCoraCourseRoutingPolicy } from "./course-policy"
import { parseCoraChatMeta, parseCoraUiPayload } from "./parse-route"
import { publicCoraModeLabel, sanitizeCoraModelName } from "./public-label"

describe("publicCoraModeLabel", () => {
  it("maps lite and reasoning without provider names", () => {
    assert.equal(publicCoraModeLabel({ liteMode: true }), "Cora Lite")
    assert.equal(publicCoraModeLabel({ profile: "reasoning" }), "Advanced Reasoning")
    assert.equal(publicCoraModeLabel({ profile: "standard" }), "Cora")
  })
})

describe("sanitizeCoraModelName", () => {
  it("strips provider marketing names", () => {
    assert.equal(sanitizeCoraModelName("gpt-5.4-mini"), undefined)
    assert.equal(sanitizeCoraModelName("claude-sonnet-5"), undefined)
    assert.equal(sanitizeCoraModelName("Cora"), "Cora")
  })
})

describe("parseCoraChatMeta", () => {
  it("prefers server profile and ignores leaked model ids", () => {
    const meta = parseCoraChatMeta({
      profile: "tutor",
      publicMode: "Cora",
      coraMode: "premium",
      routing: { profile: "tutor", publicMode: "Cora", modelId: "gpt-5.4-mini" },
    })
    assert.equal(meta.profile, "tutor")
    assert.equal(meta.publicMode, "Cora")
    assert.equal(meta.liteMode, false)
  })

  it("treats exhausted allowance as Cora Lite", () => {
    const meta = parseCoraChatMeta({ coraMode: "lite" })
    assert.equal(meta.publicMode, "Cora Lite")
    assert.equal(meta.profile, "lite")
  })
})

describe("normalizeCoraCourseRoutingPolicy", () => {
  it("maps legacy provider ids to smart routing", () => {
    assert.equal(normalizeCoraCourseRoutingPolicy("gpt-5-mini"), "auto")
    assert.equal(normalizeCoraCourseRoutingPolicy("claude-sonnet-5"), "auto")
    assert.equal(normalizeCoraCourseRoutingPolicy("standard"), "standard")
    assert.equal(normalizeCoraCourseRoutingPolicy("advanced"), "reasoning")
  })
})

describe("parseCoraUiPayload", () => {
  it("accepts created_resource cards", () => {
    const ui = parseCoraUiPayload({
      type: "created_resource",
      message: "Created your note.",
      resource: { type: "note", id: 12, title: "Chapter 4" },
    })
    assert.ok(ui)
    assert.equal(ui!.type, "created_resource")
  })

  it("rejects unknown payload types", () => {
    assert.equal(parseCoraUiPayload({ type: "not_a_real_card" }), null)
  })
})
