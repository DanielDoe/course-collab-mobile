import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canPersistQueryKey, persistStorageKey } from "./persist-policy"

describe("persist policy", () => {
  it("allows safe course reads", () => {
    assert.equal(canPersistQueryKey(["student", "notes", "student", "u1", "10", "A", "mine"]), true)
    assert.equal(canPersistQueryKey(["student", "flashcards", "student", "u1", "10", "A", "decks"]), true)
    assert.equal(canPersistQueryKey(["student", "announcements", "student", "u1", "10", "A", "list"]), true)
    assert.equal(canPersistQueryKey(["student", "lectures", "student", "u1", "10", "A", "list"]), true)
    assert.equal(canPersistQueryKey(["student", "calendar", "student", "u1", "10", "A", "range"]), true)
    assert.equal(canPersistQueryKey(["faculty", "calendar", "faculty", "u1", "10", "A", "range"]), true)
  })

  it("never persists admin, grades, exams, or cora secrets", () => {
    assert.equal(canPersistQueryKey(["admin", "students", "admin", "a1", "none", "none"]), false)
    assert.equal(canPersistQueryKey(["student", "grades", "student", "u1", "10", "A"]), false)
    assert.equal(canPersistQueryKey(["student", "exams", "student", "u1", "10", "A"]), false)
    assert.equal(canPersistQueryKey(["student", "cora", "student", "u1", "10", "A"]), false)
    assert.equal(canPersistQueryKey(["student", "dashboard", "student", "u1", "10", "A", "bundle"]), false)
    assert.equal(canPersistQueryKey(["faculty", "questionBank", "faculty", "u1", "10", "A", "list"]), false)
    assert.equal(canPersistQueryKey(["faculty", "quizzes", "faculty", "u1", "10", "A", "list", "quiz"]), false)
    assert.equal(canPersistQueryKey(["student", "messages", "student", "u1", "10", "A", "inbox"]), false)
    assert.equal(canPersistQueryKey(["faculty", "messages", "faculty", "u1", "10", "A", "inbox"]), false)
    assert.equal(canPersistQueryKey(["faculty", "students", "faculty", "u1", "10", "A", "list"]), false)
  })

  it("persists student groups, projects, and office hours", () => {
    assert.equal(canPersistQueryKey(["student", "groups", "student", "u1", "10", "A", "list"]), true)
    assert.equal(canPersistQueryKey(["student", "projects", "student", "u1", "10", "A", "list"]), true)
    assert.equal(canPersistQueryKey(["student", "officeHours", "student", "u1", "10", "A", "list"]), true)
  })

  it("scopes persist buckets by portal, user, and course", () => {
    assert.notEqual(persistStorageKey("student", "u1", 10), persistStorageKey("student", "u2", 10))
    assert.notEqual(persistStorageKey("student", "u1", 10), persistStorageKey("student", "u1", 20))
    assert.notEqual(persistStorageKey("student", "u1", 10), persistStorageKey("faculty", "u1", 10))
  })
})
