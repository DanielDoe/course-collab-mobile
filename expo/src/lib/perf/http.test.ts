import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { classifyHttpBudget } from "./http"
import { coraTurnFromResponse } from "./cora"
import { displayImageUrl } from "../media/image-url"

describe("http budgets", () => {
  it("flags slow and large responses without treating either as a failure", () => {
    assert.equal(
      classifyHttpBudget({ method: "GET", route: "/api/x", status: 200, durationMs: 40, payloadBytes: 1200 }),
      "ok",
    )
    assert.equal(
      classifyHttpBudget({ method: "GET", route: "/api/x", status: 200, durationMs: 900, payloadBytes: 1200 }),
      "slow",
    )
    assert.equal(
      classifyHttpBudget({ method: "GET", route: "/api/x", status: 200, durationMs: 40, payloadBytes: 200_000 }),
      "large",
    )
  })
})

describe("cora turn sanitizer", () => {
  it("reads cost fields and ignores message text", () => {
    const meta = coraTurnFromResponse({
      creditsCharged: 3,
      inputTokens: 120,
      outputTokens: 40,
      toolRounds: 2,
      profile: "standard",
      response: "secret answer",
    })
    assert.equal(meta.creditsCharged, 3)
    assert.equal(meta.inputTokens, 120)
    assert.equal(meta.toolRounds, 2)
    assert.equal(meta.model, "standard")
    assert.equal("response" in meta, false)
  })
})

describe("image display urls", () => {
  it("leaves data and already-sized urls alone", () => {
    assert.equal(displayImageUrl("data:image/png;base64,abc", "thumbnail"), "data:image/png;base64,abc")
    assert.equal(
      displayImageUrl("https://cdn.example/x.png?w=64", "thumbnail"),
      "https://cdn.example/x.png?w=64",
    )
  })

  it("requests a smaller width only for hosts that accept it", () => {
    assert.equal(displayImageUrl("https://cdn.example/photo.png", "thumbnail"), "https://cdn.example/photo.png")
    assert.match(displayImageUrl("https://res.cloudinary.com/demo/photo.png", "thumbnail"), /[?&]w=64/)
  })
})
