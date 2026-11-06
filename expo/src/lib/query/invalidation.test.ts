import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { INVALIDATION_GRAPH } from "./invalidation"

describe("invalidation graph", () => {
  it("does not fan out announcement creates to grades or question bank", () => {
    const targets = INVALIDATION_GRAPH["faculty.announcements.create"]
    assert.ok(targets.includes("faculty.announcements"))
    assert.ok(targets.includes("student.announcements"))
    assert.equal(targets.includes("faculty.questionBank"), false)
    assert.equal(targets.some((t) => t.includes("grades")), false)
  })

  it("keeps question bank edits local", () => {
    const targets = INVALIDATION_GRAPH["faculty.questionBank.mutate"]
    assert.deepEqual(targets, ["faculty.questionBank"])
  })

  it("maps Cora note and announcement tools to the same modules", () => {
    assert.deepEqual(INVALIDATION_GRAPH["cora.personalNotes.create"], ["student.notes"])
    assert.ok(INVALIDATION_GRAPH["cora.announcement.publish"].includes("student.announcements"))
  })

  it("maps remaining safe Cora tools without touching grades", () => {
    assert.deepEqual(INVALIDATION_GRAPH["cora.questionBank.createQuestions"], ["faculty.questionBank"])
    assert.deepEqual(INVALIDATION_GRAPH["cora.assessment.createFromBank"], ["faculty.quizzes"])
    assert.deepEqual(INVALIDATION_GRAPH["cora.lecture.createShell"], ["student.lectures"])
    assert.deepEqual(INVALIDATION_GRAPH["cora.personalPracticeQuiz.create"], ["student.practice"])
    assert.equal(INVALIDATION_GRAPH["cora.assessment.createFromBank"].some((t) => t.includes("grades")), false)
    assert.deepEqual(INVALIDATION_GRAPH["cora.personalCalendar.createEvents"], ["student.calendar"])
    assert.ok(INVALIDATION_GRAPH["cora.syllabus.publishSection"].includes("student.syllabus"))
    assert.ok(INVALIDATION_GRAPH["cora.message.send"].includes("student.messages"))
  })

  it("refreshes calendars when office hours change", () => {
    assert.ok(INVALIDATION_GRAPH["faculty.officeHours.mutate"].includes("faculty.calendar"))
    assert.ok(INVALIDATION_GRAPH["faculty.officeHours.mutate"].includes("student.calendar"))
  })

  it("refreshes faculty and student calendars after a schedule is finalized", () => {
    assert.deepEqual(INVALIDATION_GRAPH["faculty.scheduleAdjustment.finalize"], [
      "faculty.calendar",
      "student.calendar",
    ])
  })

  it("refreshes practice hub after an answer or flashcard study event", () => {
    assert.deepEqual(INVALIDATION_GRAPH["student.practice.evaluate"], ["student.practice"])
    assert.deepEqual(INVALIDATION_GRAPH["student.practice.submit"], ["student.practice"])
    assert.deepEqual(INVALIDATION_GRAPH["student.flashcards.study"], ["student.flashcards", "student.practice"])
  })

  it("refreshes gated student modules after Stripe membership activation", () => {
    assert.deepEqual(INVALIDATION_GRAPH["student.membership.activate"], [
      "student.flashcards",
      "student.practice",
      "student.dashboard",
    ])
  })
})
