import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  prefersDerivedDashboardStats,
  resolveTermWindowForScope,
} from "./faculty-dashboard-stats-logic"

const terms = [
  {
    id: 69,
    year: 2026,
    term: "Summer",
    start_date: "2026-05-01T00:00:00.000Z",
    end_date: "2026-07-31T00:00:00.000Z",
    is_active: false,
  },
  {
    id: 70,
    year: 2026,
    term: "Fall",
    start_date: "2026-08-25T00:00:00.000Z",
    end_date: "2026-12-25T00:00:00.000Z",
    is_active: true,
  },
]

describe("prefersDerivedDashboardStats", () => {
  it("requires client derivation for a non-active term course such as Summer ECE2202", () => {
    assert.equal(prefersDerivedDashboardStats(69, 70), true)
  })

  it("allows API stats for the globally active term", () => {
    assert.equal(prefersDerivedDashboardStats(70, 70), false)
    assert.equal(prefersDerivedDashboardStats(null, 70), false)
  })
})

describe("resolveTermWindowForScope", () => {
  it("uses the selected course term instead of the globally active term", () => {
    const window = resolveTermWindowForScope(terms, 69)
    assert.equal(window?.label, "Summer 2026")
  })

  it("falls back to the active term when no course term is selected", () => {
    const window = resolveTermWindowForScope(terms, undefined)
    assert.equal(window?.label, "Fall 2026")
  })
})
