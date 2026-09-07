import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { facultyShellShowsBack, studentShellShowsBack } from "./student-shell-back"

describe("studentShellShowsBack", () => {
  it("keeps the drawer control on the dashboard", () => {
    assert.equal(studentShellShowsBack("/dashboard", true), false)
    assert.equal(studentShellShowsBack("/dashboard", false), false)
  })

  it("shows back after a stacked module push", () => {
    assert.equal(studentShellShowsBack("/module/grades", true), true)
    assert.equal(studentShellShowsBack("/module/attendance", true), true)
    assert.equal(studentShellShowsBack("/announcements", true), true)
  })

  it("keeps the drawer control when the stack has no history", () => {
    assert.equal(studentShellShowsBack("/module/quizzes", false), false)
  })
})

describe("facultyShellShowsBack", () => {
  it("keeps the drawer control on the faculty dashboard", () => {
    assert.equal(facultyShellShowsBack("/dashboard", true), false)
  })

  it("shows back after a dashboard KPI or snapshot push", () => {
    assert.equal(facultyShellShowsBack("/module/quizzes", true), true)
    assert.equal(facultyShellShowsBack("/module/students", true), true)
    assert.equal(facultyShellShowsBack("/module/results", true), true)
    assert.equal(facultyShellShowsBack("/module/calendar", true), true)
  })

  it("keeps the drawer control when the faculty stack has no history", () => {
    assert.equal(facultyShellShowsBack("/module/quizzes", false), false)
  })
})
