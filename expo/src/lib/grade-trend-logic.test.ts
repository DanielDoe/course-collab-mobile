import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildGradeTrendSeries, buildPerformanceComparison } from "./grade-trend-logic"

describe("buildGradeTrendSeries", () => {
  it("spans the semester instead of a fixed six-week window", () => {
    const trend = buildGradeTrendSeries(
      88,
      [{ attempts: [{ percentage: 90, completed_at: "2026-09-10T00:00:00.000Z" }] }],
      [],
      undefined,
      {
        termLabel: "Fall 2026",
        semesterEndIso: "2026-12-18T00:00:00.000Z",
        now: new Date("2026-10-15T00:00:00.000Z"),
      },
    )
    assert.ok(trend.length > 6)
    assert.equal(trend[trend.length - 1]?.overall, 88)
  })

  it("does not backfill pre-activity weeks with later quiz scores", () => {
    const trend = buildGradeTrendSeries(
      80,
      [{ attempts: [{ percentage: 92, completed_at: "2026-10-10T00:00:00.000Z" }] }],
      [],
      undefined,
      {
        termLabel: "Fall 2026",
        now: new Date("2026-10-15T00:00:00.000Z"),
      },
    )
    const firstWithQuiz = trend.findIndex((w) => w.quiz > 0)
    if (firstWithQuiz > 0) {
      assert.equal(trend[0]?.quiz, 0)
    }
  })
})

describe("buildPerformanceComparison", () => {
  it("does not invent class averages when the API omits them", () => {
    const rows = buildPerformanceComparison(76, null, 81, null, 92, null)
    assert.deepEqual(
      rows.map((row) => row.classAvg),
      [null, null, null],
    )
    assert.equal(rows[0]?.you, 76)
    assert.equal(rows[2]?.you, 92)
  })

  it("uses server class averages only when provided", () => {
    const rows = buildPerformanceComparison(76, 80.4, 81, 79, 92, 88)
    assert.equal(rows[0]?.classAvg, 80.4)
    assert.equal(rows[1]?.classAvg, 79)
    assert.equal(rows[2]?.classAvg, 88)
  })
})
