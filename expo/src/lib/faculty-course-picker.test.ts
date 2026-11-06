import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  expandFacultyCoursesForActiveTerm,
  expandFacultyOfferingsForActiveTerm,
  type FacultyTermOffering,
} from "./faculty-course-picker-logic"
import type { InstructorCourse, InstructorSession } from "./instructor-api"

function course(id: number, code: string, title?: string): InstructorCourse {
  return {
    id,
    course_code: code,
    course_title: title ?? code,
    is_active_term: true,
    academic_term_id: 70,
  }
}

function session(id: number, code: string): InstructorSession {
  return { id, code, academic_term_id: 70 }
}

function offering(
  courseId: number,
  sessionId: number,
  sessionCode: string,
  title: string,
  catalogCode: string,
): FacultyTermOffering {
  return {
    id: courseId,
    course_id: courseId,
    course_code: sessionCode,
    course_title: title,
    catalog_course_code: catalogCode,
    session_id: sessionId,
    session_code: sessionCode,
    is_active_term: true,
    academic_term_id: 70,
    semester: "Fall 2026",
  }
}

describe("expandFacultyOfferingsForActiveTerm", () => {
  it("expands multi-section offerings into section rows", () => {
    const items = expandFacultyOfferingsForActiveTerm([
      offering(5, 505, "ELEG1301P01", "ELEG 1301", "ELEG1301"),
      offering(5, 506, "ELEG1301P02", "ELEG 1301", "ELEG1301"),
      offering(6, 507, "ELEG1304P03", "ELEG 1304", "ELEG1304"),
    ])

    assert.equal(items.length, 3)
    assert.equal(items.filter((item) => item.picker_is_section_row).length, 3)
    assert.equal(items[0]?.session_code, "ELEG1301P01")
    assert.equal(items[1]?.session_code, "ELEG1301P02")
    assert.equal(items[2]?.session_code, "ELEG1304P03")
    assert.equal(items[2]?.picker_display_title, "ELEG1304P03")
  })

  it("shows a single-section offering as a section row when session_code is present", () => {
    const items = expandFacultyOfferingsForActiveTerm([
      offering(6, 507, "ELEG1304P03", "ELEG 1304", "ELEG1304"),
    ])

    assert.equal(items.length, 1)
    assert.equal(items[0]?.picker_is_section_row, true)
    assert.equal(items[0]?.picker_display_title, "ELEG1304P03")
    assert.equal(items[0]?.session_code, "ELEG1304P03")
  })

  it("falls back to a course row when no session_code exists", () => {
    const items = expandFacultyOfferingsForActiveTerm([
      {
        id: 8,
        course_id: 8,
        course_code: "TEST101",
        course_title: "Faculty Test Course",
        is_active_term: false,
        academic_term_id: 70,
        semester: "Summer 2026",
      },
    ])

    assert.equal(items.length, 1)
    assert.equal(items[0]?.picker_is_section_row, false)
    assert.equal(items[0]?.picker_display_title, "Faculty Test Course")
  })
})

describe("expandFacultyCoursesForActiveTerm", () => {
  it("expands multi-section courses into section rows via sessions API fallback", () => {
    const eleg1301 = course(1, "ELEG1301", "ELEG 1301")
    const eleg1304 = course(2, "ELEG1304", "ELEG 1304")
    const sessions = new Map<number, InstructorSession[]>([
      [1, [session(11, "ELEG1301P01"), session(12, "ELEG1301P02")]],
      [2, [session(21, "ELEG1304P01")]],
    ])

    const items = expandFacultyCoursesForActiveTerm([eleg1301, eleg1304], sessions)
    assert.equal(items.length, 3)
    assert.equal(items.filter((item) => item.picker_is_section_row).length, 3)
    assert.equal(items[2]?.picker_display_title, "ELEG1304P01")
  })
})
