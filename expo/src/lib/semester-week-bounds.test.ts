import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildSemesterWeeks, inferTermBoundsFromLabel, resolveSemesterBounds } from "./semester-week-bounds"

describe("semester-week-bounds", () => {
  it("builds weekly buckets through the current week of the term", () => {
    const bounds = inferTermBoundsFromLabel("Fall 2026")
    const weeks = buildSemesterWeeks(bounds, new Date("2026-09-15T12:00:00.000Z"))
    assert.ok(weeks.length >= 4)
    assert.ok(weeks.length <= 22)
    assert.match(weeks[0]!.label, /Aug|Sep/)
    assert.match(weeks[weeks.length - 1]!.label, /Sep|W/)
  })

  it("respects semester_end_iso from the API", () => {
    const bounds = resolveSemesterBounds({
      termLabel: "Fall 2026",
      semesterEndIso: "2026-12-18T00:00:00.000Z",
      now: new Date("2026-10-01T00:00:00.000Z"),
    })
    assert.equal(bounds.end.getFullYear(), 2026)
    assert.equal(bounds.end.getMonth(), 11)
    assert.equal(bounds.end.getDate(), 18)
  })

  it("never returns an empty week list", () => {
    const bounds = inferTermBoundsFromLabel("Summer 2027")
    const weeks = buildSemesterWeeks(bounds, new Date("2027-06-10T00:00:00.000Z"))
    assert.equal(weeks.length >= 1, true)
  })
})
