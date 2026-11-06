import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  facultyActiveTermCourses,
  resolveFacultyStoredCourse,
  rowMatchesFacultySection,
} from "./faculty-section-scope-logic"
import { filterMisplacedCircuitFlashcardDecks } from "./faculty-misplaced-circuit-content"

describe("faculty section scope", () => {
  it("prefers active-term offerings when restoring a stored course", () => {
    const courses = [
      { id: 6, session_code: "ELEG1304P03", is_active_term: true },
      { id: 6, session_code: "ELEG1304P01", is_active_term: false },
    ]
    const resolved = resolveFacultyStoredCourse(courses, 6, "ELEG1304P01")
    assert.equal(resolved?.session_code, "ELEG1304P03")
  })

  it("keeps only active-term courses for picker selection counts", () => {
    const courses = [
      { id: 5, is_active_term: true },
      { id: 6, is_active_term: true },
      { id: 6, is_active_term: false },
    ]
    assert.equal(facultyActiveTermCourses(courses).length, 2)
  })

  it("scopes rows to the shell section even when the filter is all", () => {
    const scope = { instructorId: 1, courseId: 6, sessionCode: "ELEG1304P03" }
    assert.equal(rowMatchesFacultySection({ session: "ELEG1304P01" }, scope, "all"), false)
    assert.equal(rowMatchesFacultySection({ session: "ELEG1304P03" }, scope, "all"), true)
  })
})

describe("misplaced circuit flashcard decks", () => {
  it("hides known circuit review decks from programming courses", () => {
    const decks = [
      { title: "Lecture 3: First Program", topic: "Programming" },
      { title: "First-Order & Op-Amp Review", topic: "Transient Circuits" },
      { title: "AC Analysis Essentials", topic: "AC Analysis" },
    ]
    const filtered = filterMisplacedCircuitFlashcardDecks(decks)
    assert.deepEqual(
      filtered.map((deck) => deck.title),
      ["Lecture 3: First Program"],
    )
  })
})
