import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { FACULTY_DASHBOARD_QUICK_ACTIONS } from "./faculty-dashboard-quick-actions"

describe("faculty dashboard quick actions", () => {
  it("keeps the original destinations and adds daily teaching tools", () => {
    const byId = Object.fromEntries(FACULTY_DASHBOARD_QUICK_ACTIONS.map((item) => [item.id, item]))
    assert.equal(byId.points?.href, "/module/classroom-points")
    assert.equal(byId.issues?.href, "/module/quizzes?segment=issues")
    assert.equal(byId["office-hours"]?.href, "/module/office-hours")
    assert.equal(byId.playground?.href, "/module/playground")
    assert.equal(byId.announcements?.href, "/module/announcements")
    assert.equal(byId.messages?.href, "/module/messages")
    assert.equal(byId.lectures?.href, "/module/lectures")
    assert.equal(byId.quizzes?.href, "/module/quizzes")
    assert.equal(byId.attendance?.href, "/module/attendance")
    assert.equal(byId.calendar?.href, "/module/calendar")
  })

  it("only badges live counts that the faculty shell already tracks", () => {
    const badged = FACULTY_DASHBOARD_QUICK_ACTIONS.filter((item) => item.badgeKey)
    assert.deepEqual(
      badged.map((item) => item.badgeKey),
      ["pendingPoints", "pendingIssues", "officeHours"],
    )
  })
})
