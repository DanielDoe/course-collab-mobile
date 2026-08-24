import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  facultyAttendanceAnalyticsIsPlaceholder,
  formatAttendancePct,
  offeringHasAttendanceActivity,
  sanitizeFacultyAttendanceAnalytics,
} from "./faculty-attendance-utils"
import type { AttendanceAnalytics } from "./instructor-api"

function placeholderAnalytics(): AttendanceAnalytics {
  return {
    overall: { total_sessions: 0, total_check_ins: 0, average_attendance_rate: 200 },
    topPerformers: [
      {
        id: 958,
        full_name: "Daniel Doe",
        student_id: "dmdoep01",
        attendance_percentage: 200,
        current_streak: 0,
        credits_earned: 0,
      },
    ],
    flaggedStudents: [
      {
        id: 958,
        full_name: "Daniel Doe",
        student_id: "dmdoep01",
        attendance_percentage: 200,
        current_streak: 0,
      },
    ],
    studentSummaries: [
      {
        id: 958,
        full_name: "Daniel Doe",
        student_id: "dmdoep01",
        attendance_percentage: 200,
      },
    ],
    weeklyTrend: [{ week: "2026-01-01", attendance_rate: 90, check_ins: 4 }],
  }
}

describe("faculty attendance Fall 2026 isolation", () => {
  it("clamps leftover 200% placeholders", () => {
    assert.equal(formatAttendancePct(200), "0%")
    assert.equal(formatAttendancePct(92.4), "92%")
  })

  it("treats 200% roster dumps as placeholder analytics", () => {
    assert.equal(facultyAttendanceAnalyticsIsPlaceholder(placeholderAnalytics()), true)
  })

  it("hides leftover ranks for P01, P02, and P03 until this offering has check-ins", () => {
    for (const section of ["ELEG1301P01", "ELEG1301P02", "ELEG1304P03"] as const) {
      const sanitized = sanitizeFacultyAttendanceAnalytics(placeholderAnalytics(), {
        sectionCode: section,
        courseSessionCodes: ["ELEG1301P01", "ELEG1301P02", "ELEG1304P03"],
        meetings: [{ id: 1, section, total_attended: 0 }],
        records: [],
      })
      assert.equal(sanitized?.topPerformers?.length, 0)
      assert.equal(sanitized?.flaggedStudents?.length, 0)
      assert.equal(sanitized?.overall?.total_check_ins, 0)
    }
  })

  it("keeps analytics after a real check-in in that Fall 2026 section", () => {
    const live = placeholderAnalytics()
    live.overall = { total_check_ins: 3, total_sessions: 1, average_attendance_rate: 100 }
    live.topPerformers = [
      {
        id: 958,
        full_name: "Daniel Doe",
        student_id: "dmdoep01",
        attendance_percentage: 100,
        current_streak: 1,
        credits_earned: 3,
      },
    ]
    const sanitized = sanitizeFacultyAttendanceAnalytics(live, {
      sectionCode: "ELEG1301P02",
      meetings: [{ id: 9, section: "ELEG1301P02", total_attended: 3 }],
      records: [{ id: 1, studentId: 958, studentName: "Daniel Doe", studentNumber: "dmdoep01", section: "ELEG1301P02", status: "present", timestamp: "2026-08-24" }],
    })
    assert.equal(sanitized?.topPerformers?.length, 1)
  })

  it("does not count empty meetings as activity", () => {
    assert.equal(offeringHasAttendanceActivity({ meetings: [{ total_attended: 0 }], records: [] }), false)
    assert.equal(offeringHasAttendanceActivity({ meetings: [{ total_attended: 2 }], records: [] }), true)
  })
})
