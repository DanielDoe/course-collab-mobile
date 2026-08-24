import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { queryKeys, queryKeyCourseId, queryKeyPortal, queryKeyUserId } from "./keys"
import type { QueryScope } from "./scope"

const studentA: QueryScope = { portal: "student", userId: "u1", courseId: 10, section: "A" }
const studentB: QueryScope = { portal: "student", userId: "u2", courseId: 10, section: "A" }
const courseB: QueryScope = { portal: "student", userId: "u1", courseId: 20, section: "A" }
const faculty: QueryScope = { portal: "faculty", userId: "u1", courseId: 10, section: "A" }

describe("query key isolation", () => {
  it("scopes student notes by user and course", () => {
    const a = queryKeys.student.notes.mine(studentA)
    const otherUser = queryKeys.student.notes.mine(studentB)
    const otherCourse = queryKeys.student.notes.mine(courseB)
    assert.notDeepEqual(a, otherUser)
    assert.notDeepEqual(a, otherCourse)
    assert.equal(queryKeyPortal(a), "student")
    assert.equal(queryKeyUserId(a), "u1")
    assert.equal(queryKeyCourseId(a), "10")
  })

  it("never shares faculty and student prefixes", () => {
    const student = queryKeys.student.announcements.list(studentA)
    const instructor = queryKeys.faculty.announcements.list(faculty)
    assert.notEqual(student[0], instructor[0])
  })

  it("scopes student groups and projects separately from faculty quizzes", () => {
    const groups = queryKeys.student.groups.list(studentA)
    const projects = queryKeys.student.projects.list(studentA)
    const quizzes = queryKeys.faculty.quizzes.list(faculty, "quiz")
    assert.equal(queryKeyPortal(groups), "student")
    assert.equal(queryKeyPortal(projects), "student")
    assert.equal(queryKeyPortal(quizzes), "faculty")
    assert.notEqual(groups[1], projects[1])
    assert.equal(quizzes[6], "quiz")
  })

  it("keeps admin keys on the admin portal", () => {
    const adminScope: QueryScope = { portal: "admin", userId: "a1", courseId: null, section: null }
    const key = queryKeys.admin.courses(adminScope)
    assert.equal(key[0], "admin")
    assert.equal(queryKeyUserId(key), "a1")
  })
})
