/**
 * Run: npx tsx --test src/lib/module-nav-badge-resolvers.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  countClassroomPointTasks,
  resolveFacultyNavBadgeCount,
  resolveStudentNavBadgeCount,
  studentNavBadgeTotal,
  EMPTY_STUDENT_BADGES,
} from "./module-nav-badge-resolvers"

describe("module nav badge resolvers", () => {
  it("sums classroom task buckets", () => {
    assert.equal(
      countClassroomPointTasks({ missingSubmissions: [{ id: 1 }], pendingSubmissions: [{ id: 2 }] }),
      2,
    )
  })

  it("resolves student drawer badge keys", () => {
    const badges = { ...EMPTY_STUDENT_BADGES, openQuizzes: 3, unreadMessages: 2 }
    assert.equal(resolveStudentNavBadgeCount(badges, 0, 0, "openQuizzes"), 3)
    assert.equal(resolveStudentNavBadgeCount(badges, 0, 0, "openHomework"), null)
    assert.equal(studentNavBadgeTotal(badges, 1), 6)
  })

  it("resolves faculty drawer badge keys", () => {
    assert.equal(
      resolveFacultyNavBadgeCount(
        {
          pendingPoints: 0,
          pendingIssues: 4,
          officeHours: 0,
          courseExchange: 0,
          unreadMessages: 0,
          pendingAccessRequests: 2,
        },
        5,
        "notifications",
      ),
      5,
    )
    assert.equal(
      resolveFacultyNavBadgeCount(
        {
          pendingPoints: 0,
          pendingIssues: 4,
          officeHours: 0,
          courseExchange: 0,
          unreadMessages: 0,
          pendingAccessRequests: 2,
        },
        0,
        "pendingAccessRequests",
      ),
      2,
    )
  })
})
