import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  enrollmentAcademicTermId,
  normalizedStudentDatabaseId,
  studentContentFields,
  studentContentPath,
  studentContentQuery,
  studentDatabaseIdFromLoginRecord,
  studentProjectsListPath,
  studentSessionHasAuthIdentity,
} from "./student-content-context"
import type { StudentSession } from "./session"

function session(partial: Partial<StudentSession> = {}): StudentSession {
  return {
    portal: "student",
    expiresAt: Date.now() + 60_000,
    id: "910100001",
    name: "Alex",
    section: "ELEG1301P01",
    databaseId: "958",
    courseId: 5,
    academicTermId: 70,
    ...partial,
  }
}

describe("student content context", () => {
  it("sends course, section, and academic term for Fall 2026 enrollments", () => {
    const qs = studentContentQuery(session())
    assert.match(qs, /studentDatabaseId=958/)
    assert.match(qs, /studentId=958/)
    assert.match(qs, /session=ELEG1301P01/)
    assert.match(qs, /section=ELEG1301P01/)
    assert.match(qs, /courseId=5/)
    assert.match(qs, /academic_term_id=70/)
  })

  it("reads academic_term_id from production enrollment payloads", () => {
    assert.equal(enrollmentAcademicTermId({ academic_term_id: 70 }), 70)
    assert.equal(enrollmentAcademicTermId({ academicTermId: 70 }), 70)
    assert.equal(enrollmentAcademicTermId({ academic_term_id: 0 }), undefined)
  })

  it("omits term when the student session has no offering term", () => {
    const qs = studentContentQuery(session({ academicTermId: undefined }))
    assert.equal(qs.includes("academic_term_id"), false)
  })

  it("appends context onto existing student paths", () => {
    const path = studentContentPath(session(), "/api/student/course-notes")
    assert.ok(path.startsWith("/api/student/course-notes?"))
    assert.match(path, /academic_term_id=70/)
  })

  it("scopes P02 and P03 with the same Fall 2026 term as P01", () => {
    const p02 = studentContentPath(session({ section: "ELEG1301P02" }), "/api/attendance/leaderboard")
    assert.match(p02, /session=ELEG1301P02/)
    assert.match(p02, /courseId=5/)
    assert.match(p02, /academic_term_id=70/)
    const p03 = studentContentPath(
      session({ section: "ELEG1304P03", courseId: 6 }),
      "/api/attendance/leaderboard",
    )
    assert.match(p03, /session=ELEG1304P03/)
    assert.match(p03, /courseId=6/)
    assert.match(p03, /academic_term_id=70/)
  })

  it("scopes student group lists with studentId so production does not treat them as instructor", () => {
    const path = studentContentPath(session(), "/api/groups")
    assert.match(path, /\/api\/groups\?/)
    assert.match(path, /studentId=958/)
    assert.match(path, /session=ELEG1301P01/)
  })

  it("lists student projects the same way production web does — session only", () => {
    const path = studentProjectsListPath(session())
    assert.equal(path, "/api/projects/list?session=ELEG1301P01")
    assert.equal(path.includes("studentId"), false)
    assert.equal(studentProjectsListPath(session({ section: "ELEG1301P02" })), "/api/projects/list?session=ELEG1301P02")
    assert.equal(studentProjectsListPath(session({ section: "ELEG1304P03" })), "/api/projects/list?session=ELEG1304P03")
  })

  it("includes course, section, and term on practice generate bodies", () => {
    const fields = studentContentFields(session())
    assert.equal(fields.studentId, 958)
    assert.equal(fields.session, "ELEG1301P01")
    assert.equal(fields.courseId, 5)
    assert.equal(fields.academic_term_id, 70)
  })

  it("rejects corrupted databaseId values used by bad session patches", () => {
    assert.equal(normalizedStudentDatabaseId(session({ databaseId: undefined as unknown as string })), undefined)
    assert.equal(normalizedStudentDatabaseId(session({ databaseId: "undefined" })), undefined)
    assert.equal(studentSessionHasAuthIdentity(session({ databaseId: "undefined" })), false)
    assert.equal(studentDatabaseIdFromLoginRecord({ id: undefined }), undefined)
    assert.equal(studentDatabaseIdFromLoginRecord({ id: 958 }), "958")
    const qs = studentContentQuery(session({ databaseId: "undefined" }))
    assert.equal(qs.includes("studentId=undefined"), false)
    assert.equal(qs.includes("studentId="), false)
  })
})
