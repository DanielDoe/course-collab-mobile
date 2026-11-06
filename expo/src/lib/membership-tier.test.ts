import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { higherMembershipTier, parseMembershipTier } from "./membership-tier"

describe("parseMembershipTier", () => {
  it("reads canonical plan names", () => {
    assert.equal(parseMembershipTier("Trailblazer"), "Trailblazer")
    assert.equal(parseMembershipTier("Explorer"), "Explorer")
    assert.equal(parseMembershipTier("Scholar"), "Scholar")
  })

  it("reads Stripe and entitlement slugs", () => {
    assert.equal(parseMembershipTier("trailblazer_semester"), "Trailblazer")
    assert.equal(parseMembershipTier("student-explorer"), "Explorer")
    assert.equal(parseMembershipTier("TRAILBLAZER"), "Trailblazer")
  })

  it("defaults unknown values to Scholar", () => {
    assert.equal(parseMembershipTier(""), "Scholar")
    assert.equal(parseMembershipTier(null), "Scholar")
    assert.equal(parseMembershipTier("free"), "Scholar")
  })

  it("keeps the higher paid plan", () => {
    assert.equal(higherMembershipTier("Scholar", "Trailblazer"), "Trailblazer")
    assert.equal(higherMembershipTier("Trailblazer", "Explorer"), "Trailblazer")
  })
})
