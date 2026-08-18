import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildPerformanceComparison } from "./grade-trend-logic"

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
