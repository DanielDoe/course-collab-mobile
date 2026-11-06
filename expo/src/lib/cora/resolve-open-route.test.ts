import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveCoraOpenRoute, nativeRouteForModuleId } from "./resolve-open-route"

describe("resolveCoraOpenRoute", () => {
  it("maps student dashboard-v2 calendar to native module", () => {
    assert.equal(
      resolveCoraOpenRoute("/student/dashboard-v2/calendar", "calendar_events"),
      "/module/calendar",
    )
  })

  it("maps flashcards and notes web paths", () => {
    assert.equal(
      resolveCoraOpenRoute("/student/dashboard-v2/flashcards", "flashcard_deck"),
      "/module/flashcards",
    )
    assert.equal(
      resolveCoraOpenRoute("/student/dashboard-v2/notes?noteId=12", "note"),
      "/module/notes",
    )
  })

  it("maps faculty announcement path", () => {
    assert.equal(
      resolveCoraOpenRoute("/faculty/dashboard/communication/announcements", "announcement"),
      "/module/announcements",
    )
  })

  it("falls back to entity type when route is empty", () => {
    assert.equal(resolveCoraOpenRoute("", "calendar_events"), "/module/calendar")
    assert.equal(resolveCoraOpenRoute(null, "flashcard_deck"), "/module/flashcards")
  })

  it("passes through native module routes", () => {
    assert.equal(resolveCoraOpenRoute("/module/calendar"), "/module/calendar")
  })

  it("never returns dashboard-v2 paths", () => {
    const samples = [
      "/student/dashboard-v2/practice",
      "/student/dashboard-v2/homework",
      "/student/dashboard-v2/lectures",
      "/instructor/dashboard-v2/content/lectures",
    ]
    for (const sample of samples) {
      const resolved = resolveCoraOpenRoute(sample)
      assert.ok(resolved, `expected resolve for ${sample}`)
      assert.doesNotMatch(resolved, /dashboard-v2/)
      assert.match(resolved, /^\/(module|dashboard|announcements|settings|membership)/)
    }
  })

  it("registry module ids resolve", () => {
    assert.equal(nativeRouteForModuleId("calendar"), "/module/calendar")
    assert.equal(nativeRouteForModuleId("question-bank"), "/module/question-bank")
  })
})
