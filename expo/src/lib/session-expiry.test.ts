import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldInvalidateSessionForStatus } from "./session-expiry"

describe("session expiry", () => {
  it("invalidates authenticated API 401s", () => {
    assert.equal(shouldInvalidateSessionForStatus("/api/student/profile", 401), true)
    assert.equal(shouldInvalidateSessionForStatus("/api/instructor/courses", 401), true)
    assert.equal(
      shouldInvalidateSessionForStatus("/api/instructor/courses", 401, "Instructor authentication required"),
      true,
    )
    assert.equal(
      shouldInvalidateSessionForStatus("/api/student/course-notes", 401, "Student authentication required"),
      true,
    )
  })

  it("does not treat login or logout 401s as session expiry", () => {
    assert.equal(shouldInvalidateSessionForStatus("/api/auth/student/login", 401), false)
    assert.equal(shouldInvalidateSessionForStatus("/api/auth/logout", 401), false)
    assert.equal(shouldInvalidateSessionForStatus("/api/instructor/login", 401), false)
    assert.equal(shouldInvalidateSessionForStatus("/api/student/profile", 403), false)
  })

  it("does not log students out when dual-role project/group routes want a different portal", () => {
    assert.equal(
      shouldInvalidateSessionForStatus(
        "/api/projects/list?session=ELEG1301P01",
        401,
        "Student authentication required",
      ),
      false,
    )
    assert.equal(
      shouldInvalidateSessionForStatus("/api/groups?session=ELEG1301P01", 401, "Instructor authentication required"),
      false,
    )
    assert.equal(
      shouldInvalidateSessionForStatus("/api/attendance/records?studentId=958", 401, "Instructor authentication required"),
      false,
    )
    assert.equal(
      shouldInvalidateSessionForStatus("/api/attendance/leaderboard?section=ELEG1301P01", 401),
      false,
    )
    assert.equal(
      shouldInvalidateSessionForStatus("/api/attendance/score?studentId=958", 401, "Instructor authentication required"),
      false,
    )
    assert.equal(
      shouldInvalidateSessionForStatus("/api/attendance/streaks?studentId=958", 401),
      false,
    )
    assert.equal(
      shouldInvalidateSessionForStatus("/api/classroom-points?studentId=958&session=ELEG1301P01", 401),
      false,
    )
  })
})
