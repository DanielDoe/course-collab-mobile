import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  attendanceDisplayPercent,
  attendanceEntryMatchesOffering,
  attendanceLeaderboardForCurrentOffering,
  attendanceLeaderboardHasTermCheckIns,
} from "./attendance-leaderboard-scope"
import { FALL_2026_ELEG_SESSION_CODES } from "./fall-2026-eleg-sessions"
import type { AttendanceLeaderboardEntry } from "./rewards-api"

const offering = {
  section: "ELEG1301P01",
  courseId: 5,
  academicTermId: 70,
}

function row(partial: Partial<AttendanceLeaderboardEntry> = {}): AttendanceLeaderboardEntry {
  return {
    rank: 1,
    full_name: "Daniel Doe",
    attendance_percentage: 200,
    total_points: 0,
    current_streak: 0,
    ...partial,
  }
}

describe("attendance leaderboard scope", () => {
  it("treats the Fall 2026 roster dump as no data for P01, P02, and P03", () => {
    const rows = [row(), row({ rank: 2, full_name: "Tavarus Gaines" }), row({ rank: 3, full_name: "Rita Onwube" })]
    for (const section of FALL_2026_ELEG_SESSION_CODES) {
      assert.deepEqual(
        attendanceLeaderboardForCurrentOffering(rows, { ...offering, section }),
        [],
      )
    }
  })

  it("keeps rows once anyone has a check-in this offering", () => {
    const rows = [row({ total_points: 8, attendance_percentage: 100, classes_attended: 2 })]
    assert.equal(attendanceLeaderboardHasTermCheckIns(rows), true)
    assert.equal(attendanceLeaderboardForCurrentOffering(rows, offering).length, 1)
  })

  it("does not treat a leaked attended count as Fall 2026 check-ins", () => {
    const rows = [
      row({ classes_attended: 12, attendance_percentage: 0, total_points: 0, current_streak: 0 }),
      row({ rank: 2, full_name: "Tavarus Gaines", classes_attended: 8 }),
    ]
    assert.equal(attendanceLeaderboardHasTermCheckIns(rows), false)
    assert.deepEqual(attendanceLeaderboardForCurrentOffering(rows, offering), [])
  })

  it("drops other ELEG sections and other terms when those fields are present", () => {
    assert.equal(attendanceEntryMatchesOffering(row({ section: "ELEG1304P03" }), offering), false)
    assert.equal(attendanceEntryMatchesOffering(row({ session: "ELEG1301P02" }), offering), false)
    assert.equal(attendanceEntryMatchesOffering(row({ academic_term_id: 12, total_points: 4 }), offering), false)
    assert.equal(attendanceEntryMatchesOffering(row({ section: "ELEG1301P01", academic_term_id: 70 }), offering), true)
  })

  it("does not mix leftover P01 ranks into P02 or P03", () => {
    const p01Rows = [
      row({ section: "ELEG1301P01", total_points: 8, attendance_percentage: 100 }),
      row({ rank: 2, full_name: "Tavarus Gaines", section: "ELEG1301P01", total_points: 6 }),
    ]
    assert.deepEqual(
      attendanceLeaderboardForCurrentOffering(p01Rows, { ...offering, section: "ELEG1301P02" }),
      [],
    )
    assert.deepEqual(
      attendanceLeaderboardForCurrentOffering(p01Rows, { ...offering, section: "ELEG1304P03", courseId: 6 }),
      [],
    )
  })

  it("does not display placeholder percentages over 100", () => {
    assert.equal(attendanceDisplayPercent(200), 0)
    assert.equal(attendanceDisplayPercent(0.85), 85)
    assert.equal(attendanceDisplayPercent(92.4), 92)
  })
})
