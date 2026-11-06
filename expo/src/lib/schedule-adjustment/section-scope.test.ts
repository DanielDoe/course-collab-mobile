import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  filterScheduleAdjustmentsToSection,
  scheduleAdjustmentMatchesSection,
} from "./section-scope"

describe("schedule adjustment section scope", () => {
  it("keeps only rows for the active section", () => {
    const rows = [
      { id: 1, section_code: "ELEG1301P01" },
      { id: 2, section_code: "ELEG1301P02" },
      { id: 3, section_code: "eleg1301p01" },
    ]
    const filtered = filterScheduleAdjustmentsToSection(rows, "ELEG1301P01")
    assert.deepEqual(
      filtered.map((row) => row.id),
      [1, 3],
    )
  })

  it("returns all rows when no active section is selected", () => {
    const rows = [{ id: 1, section_code: "ELEG1301P01" }]
    assert.equal(filterScheduleAdjustmentsToSection(rows, null).length, 1)
    assert.equal(filterScheduleAdjustmentsToSection(rows, "").length, 1)
  })

  it("rejects mismatched sections", () => {
    assert.equal(scheduleAdjustmentMatchesSection("ELEG1301P02", "ELEG1301P01"), false)
    assert.equal(scheduleAdjustmentMatchesSection("ELEG1301P01", "ELEG1301P01"), true)
  })
})
