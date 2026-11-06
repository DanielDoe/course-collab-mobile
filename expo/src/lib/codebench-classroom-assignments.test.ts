import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { filterOpenCodeClassroomAssignments } from "./codebench-classroom-assignments"

const now = Date.parse("2026-09-09T18:00:00.000Z")

describe("filterOpenCodeClassroomAssignments", () => {
  it("keeps unattempted code problems that are still open", () => {
    const open = filterOpenCodeClassroomAssignments(
      [
        { id: 1, title: "Arrays 1", submission_kind: "code" },
        { id: 2, title: "Circuit writeup", submission_kind: "solution" },
        { id: 3, title: "Done", attempted: true },
        { id: 4, title: "Waiting", pending: true },
        { id: 5, title: "Expired", expires_at: "2026-09-01T00:00:00.000Z" },
        { id: 6, title: "Later", expires_at: "2026-09-10T00:00:00.000Z" },
      ],
      { now },
    )
    assert.deepEqual(
      open.map((row) => row.id),
      [1, 6],
    )
  })

  it("hides ids already submitted in this session", () => {
    const open = filterOpenCodeClassroomAssignments(
      [
        { id: 10, title: "A" },
        { id: 11, title: "B" },
      ],
      { excludeIds: ["10"] },
    )
    assert.deepEqual(
      open.map((row) => row.id),
      [11],
    )
  })
})
