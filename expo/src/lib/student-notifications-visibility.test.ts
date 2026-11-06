import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isStudentVisibleNotification } from "./student-notification-visibility"

describe("isStudentVisibleNotification", () => {
  it("hides internal audit probe rows", () => {
    assert.equal(
      isStudentVisibleNotification({
        title: "AUDIT-DELETE header create",
        message: "AUDIT-DELETE do not keep",
      }),
      false,
    )
    assert.equal(
      isStudentVisibleNotification({
        title: "Office hours reminder",
        message: "Drop-in Friday 2–4pm.",
      }),
      true,
    )
  })

  it("hides faculty-only notification rows from student inboxes", () => {
    assert.equal(
      isStudentVisibleNotification({
        title: "New submission",
        message: "A student submitted homework.",
        link: "/instructor/dashboard/assessments/homework/12",
      }),
      false,
    )
    assert.equal(
      isStudentVisibleNotification({
        title: "Quiz reminder",
        message: "Quiz 2 opens tomorrow.",
        link: "/student/dashboard-v2/quizzes",
      }),
      true,
    )
  })
})
