import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canonicalizeOnboardingStep,
  isLegalConsentStep,
  LEGAL_CONSENT_STEPS,
  onboardingStepsForPortal,
  onboardingStepMeta,
  onboardingStepToRoute,
} from "./onboarding-logic"

describe("onboarding legal consent", () => {
  it("treats terms, privacy, and AI disclosure as one legal step", () => {
    assert.deepEqual([...LEGAL_CONSENT_STEPS], ["terms", "privacy", "ai-disclosure"])
    assert.equal(isLegalConsentStep("terms"), true)
    assert.equal(isLegalConsentStep("privacy"), true)
    assert.equal(isLegalConsentStep("ai-disclosure"), true)
    assert.equal(isLegalConsentStep("welcome"), false)
    assert.equal(canonicalizeOnboardingStep("privacy"), "terms")
    assert.equal(canonicalizeOnboardingStep("ai-disclosure"), "terms")
    assert.equal(canonicalizeOnboardingStep("cora"), "cora")
  })

  it("routes every legal document to the combined terms screen", () => {
    assert.equal(onboardingStepToRoute("terms"), "/onboarding-terms")
    assert.equal(onboardingStepToRoute("privacy"), "/onboarding-terms")
    assert.equal(onboardingStepToRoute("ai-disclosure"), "/onboarding-terms")
  })

  it("asks for one legal accept instead of three", () => {
    assert.deepEqual(onboardingStepsForPortal("student"), [
      "welcome",
      "terms",
      "cora",
      "appearance",
    ])
    assert.deepEqual(onboardingStepsForPortal("guest"), ["welcome", "terms", "cora"])
    assert.deepEqual(onboardingStepsForPortal("faculty"), ["welcome", "terms"])
  })

  it("counts combined legal consent as a single progress step", () => {
    const student = { portal: "student" as const }
    const terms = onboardingStepMeta(student, "terms")
    assert.equal(terms.totalSteps, 4)
    assert.equal(terms.stepIndex, 1)
    assert.equal(onboardingStepMeta(student, "privacy").stepIndex, 1)
    assert.equal(onboardingStepMeta(student, "ai-disclosure").stepIndex, 1)
    assert.equal(onboardingStepMeta(student, "appearance").stepIndex, 3)
  })
})
