import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { StudentSession } from "./session"
import {
  findEnrolledCourse,
  mergeStudentEnrollments,
  parseStudentEnrollmentsPayload,
  preferLocalStudentEnrollmentOnRefresh,
  resolveStoredStudentEnrollment,
  studentActiveEnrollments,
  studentEnrollmentMatches,
  studentEnrollmentHeadline,
  studentEnrollmentPickerKey,
  studentEnrollmentPickerLabel,
  studentEnrollmentSessionPatch,
  studentRowIdFromBindResponse,
  type StudentEnrollment,
} from "./student-enrollment"

function enrollment(partial: Partial<StudentEnrollment> & Pick<StudentEnrollment, "courseId">): StudentEnrollment {
  const section = partial.section ?? "P01"
  return {
    courseCode: partial.courseCode ?? "ELEG 1304",
    courseTitle: partial.courseTitle ?? "Computer Applications in Engineering",
    section,
    status: partial.status ?? "active",
    pickerKey: partial.pickerKey ?? studentEnrollmentPickerKey(partial.courseId, section),
    ...partial,
    courseId: partial.courseId,
  }
}

function session(partial: Partial<StudentSession> = {}): StudentSession {
  return {
    portal: "student",
    expiresAt: Date.now() + 60_000,
    id: "910100001",
    name: "Alex",
    section: "P01",
    databaseId: "42",
    courseId: 1304,
    courseCode: "ELEG 1304",
    courseTitle: "Computer Applications in Engineering",
    academicTermId: 70,
    ...partial,
  }
}

describe("student enrollments", () => {
  it("parses mixed production enrollment payloads", () => {
    const parsed = parseStudentEnrollmentsPayload({
      enrollments: [
        {
          course_id: 16,
          course_code: "ELEG 1304",
          course_title: "Computer Applications in Engineering",
          session_code: "P01",
          academic_term_id: 70,
          academic_term_label: "Fall 2026",
          status: "active",
        },
        {
          courseId: 5,
          courseCode: "ELEG 1301",
          courseTitle: "Intro",
          section: "P02",
          academicTermId: 70,
        },
      ],
    })
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0]?.courseId, 16)
    assert.equal(parsed[0]?.section, "P01")
    assert.equal(parsed[0]?.academicTermLabel, "Fall 2026")
    assert.equal(parsed[1]?.courseId, 5)
  })

  it("never resolves a course the student is not enrolled in", () => {
    const enrolled = [enrollment({ courseId: 16, section: "P01" })]
    assert.equal(findEnrolledCourse(enrolled, 5, "P01"), null)
    assert.equal(resolveStoredStudentEnrollment(enrolled, 5, "P01"), enrolled[0])
    assert.equal(studentEnrollmentMatches({ courseId: 5, section: "P01", pickerKey: "course-5-section-P01" }, enrolled[0]!), false)
  })

  it("restores the stored section when it is still an active enrollment", () => {
    const enrolled = [
      enrollment({ courseId: 16, section: "P01", courseCode: "ELEG 1304" }),
      enrollment({ courseId: 5, section: "P02", courseCode: "ELEG 1301" }),
    ]
    const resolved = resolveStoredStudentEnrollment(enrolled, 5, "P02")
    assert.equal(resolved?.courseId, 5)
    assert.equal(resolved?.section, "P02")
  })

  it("drops a stored course after enrollment is removed and selects a remaining active course", () => {
    const enrolled = [enrollment({ courseId: 16, section: "P01" })]
    const resolved = resolveStoredStudentEnrollment(enrolled, 5, "P02", session({ courseId: 5, section: "P02" }))
    assert.equal(resolved?.courseId, 16)
  })

  it("hides archived enrollments from the default active pool", () => {
    const enrolled = [
      enrollment({ courseId: 16, section: "P01", status: "archived" }),
      enrollment({ courseId: 5, section: "P02", status: "active" }),
    ]
    assert.deepEqual(
      studentActiveEnrollments(enrolled).map((row) => row.courseId),
      [5],
    )
    assert.equal(resolveStoredStudentEnrollment(enrolled, 16, "P01")?.courseId, 5)
  })

  it("keeps the local course on session refresh when the server still reports the login enrollment", () => {
    const merged = preferLocalStudentEnrollmentOnRefresh(session({ courseId: 5, section: "P02", courseCode: "ELEG 1301" }), {
      courseId: 16,
      courseCode: "ELEG 1304",
      section: "P01",
    })
    assert.equal(merged.courseId, 5)
    assert.equal(merged.section, "P02")
    assert.equal(merged.courseCode, "ELEG 1301")
  })

  it("applies a session patch only from a known enrollment", () => {
    const patch = studentEnrollmentSessionPatch(enrollment({ courseId: 5, section: "P02", courseCode: "ELEG 1301" }))
    assert.deepEqual(patch, {
      courseId: 5,
      courseCode: "ELEG 1301",
      courseTitle: "Computer Applications in Engineering",
      section: "P02",
      academicTermId: undefined,
    })
  })

  it("does not patch databaseId from enrollment metadata alone", () => {
    const patch = studentEnrollmentSessionPatch(
      enrollment({ courseId: 5, section: "P02", studentRowId: 202 }),
    )
    assert.equal("databaseId" in patch, false)
  })

  it("preserves the current session section when enrollment metadata omits it", () => {
    const patch = studentEnrollmentSessionPatch(
      enrollment({ courseId: 5, section: "", courseCode: "ELEG1301" }),
      { section: "ELEG1301P01" },
    )
    assert.equal(patch.section, "ELEG1301P01")
  })

  it("reads the rebound students.id from a bind response", () => {
    assert.equal(
      studentRowIdFromBindResponse({
        student: { id: 202, student_id: "910100001" },
        activeEnrollment: { courseId: 5, studentRowId: 202 },
      }),
      "202",
    )
  })

  it("formats picker rows as code • section", () => {
    assert.equal(
      studentEnrollmentPickerLabel(enrollment({ courseId: 16, courseCode: "ELEG 1304", section: "P01" })),
      "ELEG 1304 • P01",
    )
  })

  it("joins course code and title on one hero line", () => {
    assert.equal(
      studentEnrollmentHeadline("ECE2202", "Electric Circuits II"),
      "ECE2202 · Electric Circuits II",
    )
    assert.equal(studentEnrollmentHeadline("ECE2202", "ECE2202"), "ECE2202")
    assert.equal(studentEnrollmentHeadline("ECE 2202", "ECE 2202 Review Demo"), "ECE 2202 Review Demo")
    assert.equal(studentEnrollmentHeadline("ECE2202", ""), "ECE2202")
  })

  it("merges enrollment rows without duplicate picker keys", () => {
    const merged = mergeStudentEnrollments(
      [enrollment({ courseId: 5, section: "P01" })],
      [enrollment({ courseId: 5, section: "P01", courseTitle: "Updated title" })],
    )
    assert.equal(merged.length, 1)
    assert.equal(merged[0]?.courseTitle, "Updated title")
  })
})
