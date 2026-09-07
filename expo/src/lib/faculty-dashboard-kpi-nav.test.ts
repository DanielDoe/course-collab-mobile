import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { facultyDashboardKpiHref, facultyDashboardSnapshotHref } from "./faculty-dashboard-kpi-nav"

describe("facultyDashboardKpiHref", () => {
  it("maps metric cards to existing faculty modules", () => {
    assert.equal(facultyDashboardKpiHref("active-quizzes"), "/module/quizzes")
    assert.equal(facultyDashboardKpiHref("students"), "/module/students")
    assert.equal(facultyDashboardKpiHref("attempts"), "/module/results")
    assert.equal(facultyDashboardKpiHref("issues"), "/module/quizzes?segment=issues")
    assert.equal(facultyDashboardKpiHref("upcoming"), "/module/calendar")
    assert.equal(facultyDashboardKpiHref("submissions-24h"), "/module/results")
  })
})

describe("facultyDashboardSnapshotHref", () => {
  it("maps snapshot cells to the same modules", () => {
    assert.equal(facultyDashboardSnapshotHref("Students"), "/module/students")
    assert.equal(facultyDashboardSnapshotHref("Upcoming"), "/module/calendar")
    assert.equal(facultyDashboardSnapshotHref("Unknown"), undefined)
  })
})
