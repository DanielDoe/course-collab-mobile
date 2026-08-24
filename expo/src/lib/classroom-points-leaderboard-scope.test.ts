import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { FALL_2026_ELEG_SESSION_CODES } from "./fall-2026-eleg-sessions"
import {
  classroomPointsLeaderboardForCurrentOffering,
  classroomPointsLeaderboardHasAwards,
} from "./classroom-points-leaderboard-scope"

const offering = {
  section: "ELEG1301P01",
  courseId: 5,
  academicTermId: 70,
}

function row(partial: Record<string, unknown> = {}) {
  return {
    rank: 1,
    full_name: "Daniel Doe",
    total_points: 0,
    award_count: 0,
    ...partial,
  }
}

describe("classroom points leaderboard scope", () => {
  it("treats a 0-pt Fall 2026 roster dump as no standings for P01, P02, and P03", () => {
    const rows = [row(), row({ rank: 2, full_name: "Student" }), row({ rank: 8, full_name: "Student" })]
    assert.equal(classroomPointsLeaderboardHasAwards(rows), false)
    for (const section of FALL_2026_ELEG_SESSION_CODES) {
      assert.deepEqual(
        classroomPointsLeaderboardForCurrentOffering(rows, { ...offering, section }),
        [],
      )
    }
  })

  it("keeps rows once anyone has approved points this offering", () => {
    const rows = [row({ total_points: 12, award_count: 2, session: "ELEG1301P01" })]
    assert.equal(classroomPointsLeaderboardHasAwards(rows), true)
    assert.equal(classroomPointsLeaderboardForCurrentOffering(rows, offering).length, 1)
  })

  it("does not mix leftover P01 awards into P02 or P03", () => {
    const p01Rows = [
      row({ session: "ELEG1301P01", total_points: 8 }),
      row({ rank: 2, session: "ELEG1301P01", total_points: 6 }),
    ]
    assert.deepEqual(
      classroomPointsLeaderboardForCurrentOffering(p01Rows, { ...offering, section: "ELEG1301P02" }),
      [],
    )
    assert.deepEqual(
      classroomPointsLeaderboardForCurrentOffering(p01Rows, {
        ...offering,
        section: "ELEG1304P03",
        courseId: 6,
      }),
      [],
    )
  })
})
