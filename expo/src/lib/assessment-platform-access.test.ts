import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assessmentPlatformBlockedMessage,
  assessmentPlatformFlagsLabel,
  DEFAULT_ASSESSMENT_PLATFORM_FLAGS,
  extractAssessmentPlatformAccess,
  isAssessmentPlatformAllowed,
  parseAssessmentPlatformAccess,
  parseAssessmentPlatformOverride,
  resolveAssessmentPlatformKind,
} from "./assessment-platform-access"

describe("assessment platform access", () => {
  it("maps mid-semester aliases", () => {
    assert.equal(resolveAssessmentPlatformKind("midsem"), "mid_semester")
    assert.equal(resolveAssessmentPlatformKind("finals"), "final")
  })

  it("defaults every platform on", () => {
    const access = parseAssessmentPlatformAccess(null)
    assert.equal(isAssessmentPlatformAllowed(access, "quiz", "mobile"), true)
    assert.equal(isAssessmentPlatformAllowed(access, "final", "web"), true)
  })

  it("honors deactivated mobile for quizzes and finals", () => {
    const access = parseAssessmentPlatformAccess({
      quiz: { web: true, mobile: false },
      mid_semester: { web: true, mobile: false },
      final: { mobile: false },
    })
    assert.equal(isAssessmentPlatformAllowed(access, "quiz", "mobile"), false)
    assert.equal(isAssessmentPlatformAllowed(access, "quiz", "web"), true)
    assert.equal(isAssessmentPlatformAllowed(access, "homework", "mobile"), true)
    assert.equal(isAssessmentPlatformAllowed(access, "finals", "mobile"), false)
  })

  it("reads nested course-policy payloads", () => {
    const access = extractAssessmentPlatformAccess({
      assessment_policy: {
        access: { platform_access: { quiz: { mobile: false } } },
      },
    })
    assert.equal(isAssessmentPlatformAllowed(access, "quiz", "mobile"), false)
  })

  it("tells students to use the website", () => {
    assert.match(assessmentPlatformBlockedMessage("quiz", "mobile"), /website/)
  })

  it("labels inherited course platforms the way the faculty editor does", () => {
    assert.equal(assessmentPlatformFlagsLabel(DEFAULT_ASSESSMENT_PLATFORM_FLAGS), "website, mobile, and desktop")
    assert.equal(assessmentPlatformFlagsLabel({ web: true, mobile: false, desktop: false }), "website")
    assert.equal(assessmentPlatformFlagsLabel({ web: true, mobile: true, desktop: false }), "website and mobile")
    assert.equal(assessmentPlatformFlagsLabel({ web: false, mobile: false, desktop: false }), "no platforms")
  })

  it("lets one assessment override the course default", () => {
    const course = parseAssessmentPlatformAccess({
      homework: { web: true, mobile: false },
    })
    assert.equal(parseAssessmentPlatformOverride(null), null)
    assert.equal(isAssessmentPlatformAllowed(course, "homework", "mobile"), false)
    assert.equal(
      isAssessmentPlatformAllowed(course, "homework", "mobile", { web: true, mobile: true }),
      true,
    )
  })
})
