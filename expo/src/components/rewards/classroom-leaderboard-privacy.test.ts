import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  classroomLeaderboardDisplayName,
  classroomLeaderboardPointsLabel,
} from "./classroom-leaderboard-privacy"

describe("classroom leaderboard privacy labels", () => {
  it("keeps self name with (you) and shows points", () => {
    assert.equal(
      classroomLeaderboardDisplayName(
        { full_name: "Daniel Doe", is_current_user: true, rank: 1 },
        true,
      ),
      "Daniel Doe (you)",
    )
    assert.equal(classroomLeaderboardPointsLabel({ total_points: 75 }), "75 pts")
  })

  it("anonymizes peers as Student [rank] when privacy is on", () => {
    assert.equal(
      classroomLeaderboardDisplayName(
        { full_name: "Kennedy Combs", is_current_user: false, rank: 2 },
        true,
      ),
      "Student 2",
    )
    assert.equal(
      classroomLeaderboardDisplayName(
        { full_name: "Pedro Perales", is_current_user: false, rank: 4 },
        true,
      ),
      "Student 4",
    )
  })

  it("shows real peer names when privacy is off", () => {
    assert.equal(
      classroomLeaderboardDisplayName(
        { full_name: "Kennedy Combs", is_current_user: false, rank: 2 },
        false,
      ),
      "Kennedy Combs",
    )
  })
})
