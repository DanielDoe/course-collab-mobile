import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildStudentDashboardFromRaw, type DashboardRawData } from "./student-dashboard-build"

function raw(overrides: Partial<DashboardRawData> = {}): DashboardRawData {
  return {
    gradePayload: {
      grade: { total_score: 88, letter_grade: "B+" },
      classAverages: { avg_quiz: 80 },
    },
    quizHistory: [{ attempts: [{ percentage: 90, completed_at: "2026-08-01T00:00:00.000Z" }] }],
    homeworkHistory: [],
    homeworkStats: { overdue: 0, pending: 0 },
    attendance: { attendance_percentage: 95, sessions_scored_so_far: 10, classes_attended: 10 },
    attendanceStreak: 4,
    upcomingQuizzes: [],
    finalsTaken: false,
    classroomPoints: 12,
    unavailable: {},
    ...overrides,
  }
}

describe("buildStudentDashboardFromRaw", () => {
  it("keeps loaded grades when another stats GET is unavailable", () => {
    const { stats } = buildStudentDashboardFromRaw(
      raw({
        quizHistory: null,
        unavailable: { quizzes: true },
      }),
    )
    assert.equal(stats.overallGrade, 88)
    assert.equal(stats.letterGrade, "B+")
    assert.equal(stats.unavailable.quizzes, true)
    assert.equal(stats.unavailable.grade, undefined)
    assert.match(stats.partialError ?? "", /quizzes/)
    assert.doesNotMatch(stats.partialError ?? "", /grades/)
  })

  it("does not treat a failed grade fetch as a 0% gradebook", () => {
    const { stats } = buildStudentDashboardFromRaw(
      raw({
        gradePayload: null,
        unavailable: { grade: true },
      }),
    )
    assert.equal(stats.overallGrade, 0)
    assert.equal(stats.letterGrade, "—")
    assert.equal(stats.unavailable.grade, true)
    assert.equal(stats.classroomPoints, 12)
    assert.match(stats.partialError ?? "", /grades/)
  })
})
