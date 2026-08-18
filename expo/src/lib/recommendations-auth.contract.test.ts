import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("recommendations client auth contract", () => {
  it("instructor-api recommendation methods use instructorRequest / instructorAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    assert.match(source, /getRecommendations:[\s\S]*?instructor(?:Authenticated)?Request/)
    assert.match(source, /createRecommendationOnBehalf:[\s\S]*?instructor(?:Authenticated)?Request/)
    assert.match(source, /getRecommendationDetail:[\s\S]*?instructor(?:Authenticated)?Request/)
    assert.match(source, /patchRecommendation:[\s\S]*?instructor(?:Authenticated)?Request/)
    assert.match(source, /deleteRecommendationRequest:[\s\S]*?instructor(?:Authenticated)?Request/)
  })

  it("student-api recommendation list/create/detail use studentAuthenticatedRequest / studentRequest", () => {
    const source = readFileSync(join(here, "student-api.ts"), "utf8")
    assert.match(source, /getRecommendations:[\s\S]*?student(?:Authenticated)?Request/)
    assert.match(source, /createRecommendation:[\s\S]*?student(?:Authenticated)?Request/)
    assert.match(source, /getRecommendationDetail:[\s\S]*?student(?:Authenticated)?Request/)
    assert.match(source, /withdrawRecommendation:[\s\S]*?student(?:Authenticated)?Request/)
    assert.match(source, /saveRecommendationQuestionnaire:[\s\S]*?student(?:Authenticated)?Request/)
    assert.match(source, /generateRecommendationDrafts:[\s\S]*?\/generate/)
    assert.match(source, /selectRecommendationDraft:[\s\S]*?\/select-draft/)
    assert.match(source, /submitRecommendationLetter:[\s\S]*?\/submit-letter/)
    assert.match(source, /markRecommendationDownloaded:[\s\S]*?\/mark-downloaded/)
    assert.match(source, /patchRecommendationRequestDetails:[\s\S]*?\/request-details/)
    assert.match(source, /action === "cancel_request"[\s\S]*?withdrawRecommendation/)
  })

  it("student recommendation notification links open enrolled detail", () => {
    const source = readFileSync(join(here, "notification-link.ts"), "utf8")
    assert.match(source, /\/recommendations\/\$\{/)
    assert.doesNotMatch(source, /\/module\/recommendations\?request=/)
  })

  it("PDF builders are not a header-only x-student-id path", () => {
    const source = readFileSync(join(here, "recommendation-letter-url.ts"), "utf8")
    assert.match(source, /studentAuthenticatedHeaders/)
    assert.match(source, /instructorAuthenticatedHeaders/)
    assert.doesNotMatch(source, /headers:\s*\{\s*"x-student-id"/)
    assert.doesNotMatch(
      source,
      /headers:\s*\{\s*"x-instructor-id":\s*String\(scope\.instructorId\)/,
    )
  })

  it("guest brief is not a raw x-student-id fetch", () => {
    const source = readFileSync(join(here, "guest-api.ts"), "utf8")
    const start = source.indexOf("getRecommendationBrief:")
    const end = source.indexOf("getRecommendations:")
    assert.ok(start >= 0 && end > start, "brief methods not found")
    const briefBlock = source.slice(start, end)
    assert.doesNotMatch(briefBlock, /await fetch\(/)
    assert.doesNotMatch(briefBlock, /"x-student-id":\s*session\.databaseId/)
    assert.match(briefBlock, /studentApi\.|studentAuthenticatedRequest|studentAuthenticatedHeaders/)
  })
})
