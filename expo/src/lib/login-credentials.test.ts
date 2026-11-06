import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { normalizeLoginIdentifier, normalizeLoginPassword } from "./login-credentials"

describe("normalizeLoginIdentifier", () => {
  it("lowercases emails and strips paste spaces", () => {
    assert.equal(normalizeLoginIdentifier("  DMDoe@PVAMU.EDU  "), "dmdoe@pvamu.edu")
    assert.equal(normalizeLoginIdentifier("dm doe @pvamu.edu"), "dmdoe@pvamu.edu")
  })

  it("strips separators only for numeric roster IDs", () => {
    assert.equal(normalizeLoginIdentifier("910-000-001"), "910000001")
    assert.equal(normalizeLoginIdentifier("910 000 001"), "910000001")
  })

  it("preserves hyphens in alphanumeric demo / login IDs", () => {
    assert.equal(normalizeLoginIdentifier("dmdoe-demo-p01"), "dmdoe-demo-p01")
    assert.equal(normalizeLoginIdentifier("  dmdoe-demo-p02  "), "dmdoe-demo-p02")
    assert.equal(normalizeLoginIdentifier("dmdoe - demo - p03"), "dmdoe-demo-p03")
  })
})

describe("normalizeLoginPassword", () => {
  it("trims edges only", () => {
    assert.equal(normalizeLoginPassword("  ELEG2026!  "), "ELEG2026!")
  })
})
