import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { MUTATION_CATALOG, MUTATION_STRATEGY } from "./strategies"

describe("mutation strategies", () => {
  it("uses optimistic UI for personal notes and flashcards", () => {
    assert.equal(MUTATION_CATALOG.student.notes.create, MUTATION_STRATEGY.OPTIMISTIC)
    assert.equal(MUTATION_CATALOG.student.flashcards.addCard, MUTATION_STRATEGY.OPTIMISTIC)
    assert.equal(MUTATION_CATALOG.student.notifications.markRead, MUTATION_STRATEGY.OPTIMISTIC)
  })

  it("keeps high-risk work server-confirmed", () => {
    assert.equal(MUTATION_CATALOG.highRisk.examSubmit, MUTATION_STRATEGY.PENDING)
    assert.equal(MUTATION_CATALOG.faculty.assessments.publish, MUTATION_STRATEGY.CONFIRMATION_REQUIRED)
    assert.equal(MUTATION_CATALOG.highRisk.payment, MUTATION_STRATEGY.CONFIRMATION_REQUIRED)
    assert.equal(MUTATION_CATALOG.student.announcements.comment, MUTATION_STRATEGY.PENDING)
  })
})
