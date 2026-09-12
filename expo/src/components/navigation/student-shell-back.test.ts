import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { facultyShellShowsBack, studentShellShowsBack } from "./student-shell-back"
import { getNavLabel, isImmersiveStudentAppPath } from "../../constants/student-nav"
import { assessmentReportHref } from "../../lib/assessment-report-href"

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

  it("shows back on forum hub nested screens even if the stack looks empty", () => {
    assert.equal(studentShellShowsBack("/collaboration/forum/new", false), true)
    assert.equal(studentShellShowsBack("/collaboration/forum/tutoring", false), true)
    assert.equal(studentShellShowsBack("/collaboration/forum/thread/12", false), true)
  })

  it("shows back on assessment results even if the nested stack looks empty", () => {
    assert.equal(studentShellShowsBack("/assessment", false), true)
    assert.equal(studentShellShowsBack("/assessment/report/5458", false), true)
    assert.equal(studentShellShowsBack("/assessment/report/5458?type=homework", true), true)
    assert.equal(studentShellShowsBack("/results/5458", false), true)
    assert.equal(studentShellShowsBack("/results/5458?type=homework&from=quiz-history", true), true)
  })
})

describe("history results chrome", () => {
  it("treats the nested assessment stack as immersive results", () => {
    assert.equal(isImmersiveStudentAppPath("/assessment"), true)
    assert.equal(isImmersiveStudentAppPath("/assessment/report/5458"), true)
    assert.equal(isImmersiveStudentAppPath("/results/5458"), true)
    assert.equal(isImmersiveStudentAppPath("/collaboration/projects/submit"), true)
    assert.equal(isImmersiveStudentAppPath("/collaboration/projects/submit?groupId=12"), true)
    assert.equal(isImmersiveStudentAppPath("/collaboration/forum/new"), true)
    assert.equal(isImmersiveStudentAppPath("/collaboration/forum/tutoring"), true)
    assert.equal(isImmersiveStudentAppPath("/collaboration/forum/thread/12"), true)
    assert.equal(getNavLabel("/collaboration/forum/new"), "New thread")
    assert.equal(getNavLabel("/collaboration/forum/tutoring"), "Tutoring")
    assert.equal(getNavLabel("/assessment"), "Results")
    assert.equal(getNavLabel("/assessment/report/5458"), "Results")
    assert.equal(getNavLabel("/results/5458"), "Results")
  })

  it("opens a completed history row on the report href", () => {
    assert.equal(
      assessmentReportHref(5458, "homework", "quiz-history"),
      "/results/5458?type=homework&from=quiz-history",
    )
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
