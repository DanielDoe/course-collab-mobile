import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assessmentOverlapsActiveTerm,
  buildInstructorDashboardStatsFromSources,
  quizzesForActiveTerm,
  quizzesForFacultyScope,
} from "./faculty-dashboard-stats-logic"
import type { InstructorQuiz } from "./instructor-api"

const FALL_2026 = {
  label: "Fall 2026",
  startDate: "2026-08-25T00:00:00.000Z",
  endDate: "2026-12-25T00:00:00.000Z",
}

function quiz(
  id: number,
  opts?: Partial<InstructorQuiz>,
): InstructorQuiz {
  return {
    id,
    title: `Quiz ${id}`,
    is_active: false,
    ...opts,
  }
}

describe("quizzesForFacultyScope", () => {
  it("returns all quizzes when no section is selected", () => {
    const quizzes = [
      quiz(1, { session_access: { ELEG1301P01: true } }),
      quiz(2, { session_access: { ELEG1301P02: true } }),
    ]
    const filtered = quizzesForFacultyScope(quizzes, {})
    assert.equal(filtered.length, 2)
  })

  it("filters quizzes to the selected section when session_access is present", () => {
    const quizzes = [
      quiz(1, { session_access: { ELEG1301P01: true, ELEG1301P02: false } }),
      quiz(2, { session_access: { ELEG1301P02: true } }),
      quiz(3),
    ]
    const filtered = quizzesForFacultyScope(quizzes, { sessionCode: "ELEG1301P01" })
    assert.deepEqual(filtered.map((row) => row.id), [1, 3])
  })
})

describe("quizzesForActiveTerm", () => {
  it("excludes Spring 2026 assessments from Fall 2026 KPIs", () => {
    const quizzes = [
      quiz(1, {
        available_from: "2026-02-16T08:00:00.000Z",
        available_until: "2026-04-12T04:59:59.999Z",
        total_attempts: 81,
      }),
      quiz(2, {
        available_from: "2026-09-01T08:00:00.000Z",
        available_until: "2026-09-30T23:59:59.999Z",
        total_attempts: 4,
      }),
      quiz(3, { total_attempts: 50 }),
    ]

    const fallQuizzes = quizzesForActiveTerm(quizzes, FALL_2026)
    assert.deepEqual(
      fallQuizzes.map((row) => row.id),
      [2],
    )
    assert.equal(assessmentOverlapsActiveTerm(quizzes[0]!, FALL_2026), false)
  })

  it("builds zero attempt KPIs before the active term starts", () => {
    const beforeTerm = Date.parse("2026-08-20T12:00:00.000Z")
    const stats = buildInstructorDashboardStatsFromSources(
      [{ id: 1 }],
      [
        quiz(1, {
          available_from: "2026-09-01T08:00:00.000Z",
          available_until: "2026-09-30T23:59:59.999Z",
          total_attempts: 12,
        }),
      ],
      [],
      FALL_2026,
      beforeTerm,
    )

    assert.equal(stats.totalAttempts, 0)
    assert.equal(stats.activeQuizzes, 0)
    assert.equal(stats.upcomingAssessments, 0)
  })

  it("shows zero attempts when Fall has no scheduled assessments yet", () => {
    const stats = buildInstructorDashboardStatsFromSources(
      [{ id: 1 }, { id: 2 }],
      [
        quiz(1, {
          available_from: "2026-02-01T08:00:00.000Z",
          available_until: "2026-03-21T23:59:59.999Z",
          total_attempts: 129,
        }),
        quiz(2, { total_attempts: 40 }),
      ],
      [],
      FALL_2026,
      Date.parse("2026-08-20T12:00:00.000Z"),
    )

    assert.equal(stats.totalQuizzes, 0)
    assert.equal(stats.totalAttempts, 0)
    assert.equal(stats.totalStudents, 2)
  })

  it("counts attempts for a completed term such as Summer 2026", () => {
    const SUMMER_2026 = {
      label: "Summer 2026",
      startDate: "2026-05-01T00:00:00.000Z",
      endDate: "2026-07-31T00:00:00.000Z",
    }
    const stats = buildInstructorDashboardStatsFromSources(
      [{ id: 1 }],
      [
        quiz(1, {
          available_from: "2026-05-10T08:00:00.000Z",
          available_until: "2026-07-20T23:59:59.999Z",
          total_attempts: 120,
        }),
        quiz(2, {
          available_from: "2026-02-01T08:00:00.000Z",
          available_until: "2026-03-21T23:59:59.999Z",
          total_attempts: 99,
        }),
      ],
      [],
      SUMMER_2026,
      Date.parse("2026-08-20T12:00:00.000Z"),
    )

    assert.equal(stats.totalQuizzes, 1)
    assert.equal(stats.totalAttempts, 120)
  })
})
