import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { normalizeCoraDeepLink } from "./resolve-open-route-normalize"

const here = dirname(fileURLToPath(import.meta.url))

describe("normalizeCoraDeepLink", () => {
  it("maps an empty coursecollab deep link to CodeBench", () => {
    assert.equal(normalizeCoraDeepLink("coursecollab:///"), "/module/codebench")
    assert.equal(normalizeCoraDeepLink("coursecollab://"), "/module/codebench")
  })

  it("keeps native module paths after the app scheme", () => {
    assert.equal(normalizeCoraDeepLink("coursecollab:///module/practice"), "/module/practice")
  })
})

describe("Cora Today link routing contract", () => {
  it("resolves Today taps through navigateCoraRecommendationLink", () => {
    const hub = readFileSync(join(here, "../../components/ai-tutor/StudentCoraHubView.tsx"), "utf8")
    assert.match(hub, /navigateCoraRecommendationLink/)
    assert.doesNotMatch(hub, /router\.push\(link as never\)/)
  })

  it("normalizes API dashboard-v2 links when merging Today recommendations", () => {
    const source = readFileSync(join(here, "../student-cora-today-recommendations.ts"), "utf8")
    assert.match(source, /resolveCoraOpenRoute/)
    assert.match(source, /normalizeApiRecommendation/)
  })

  it("maps production dashboard-v2 module paths in notification-link", () => {
    const source = readFileSync(join(here, "../notification-link.ts"), "utf8")
    for (const segment of ["codebench", "lectures", "final-exams", "practice", "flashcards"]) {
      assert.ok(source.includes(`"${segment}"`), `expected V2 map entry for ${segment}`)
    }
    assert.match(source, /\/flashcards\//)
    assert.match(source, /segment === "flashcards"/)
  })
})
