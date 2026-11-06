import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { classroomPointsAssignmentNavTarget } from "./classroom-points-navigation"

describe("classroom points assignment navigation", () => {
  it("opens the selected assignment detail", () => {
    assert.deepEqual(classroomPointsAssignmentNavTarget(42), { kind: "detail", assignmentId: 42 })
  })

  it("falls back to the list for a missing id", () => {
    assert.deepEqual(classroomPointsAssignmentNavTarget(undefined), { kind: "list" })
    assert.deepEqual(classroomPointsAssignmentNavTarget("x"), { kind: "list" })
  })
})
