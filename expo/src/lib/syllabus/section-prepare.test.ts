/**
 * Run: npx tsx --test expo/src/lib/syllabus/section-prepare.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isUnpublishedSyllabusMessage,
  prepareSyllabusForDisplay,
  prepareStudentSyllabusSections,
} from "./section-prepare"
import type { SyllabusSection } from "./types"

function section(
  sectionId: string,
  overrides: Partial<SyllabusSection> = {},
): SyllabusSection {
  return {
    sectionId,
    title: sectionId,
    order: 1,
    type: "text",
    content: { markdown: "Body" },
    isVisible: true,
    ...overrides,
  }
}

describe("prepareStudentSyllabusSections", () => {
  it("filters hidden sections from student display", () => {
    const sections = [
      section("visible", { order: 1, isVisible: true }),
      section("hidden", { order: 2, isVisible: false }),
    ]
    const prepared = prepareStudentSyllabusSections(sections)
    assert.equal(prepared.length, 1)
    assert.equal(prepared[0]?.sectionId, "visible")
  })

  it("sorts sections by order for student accordion", () => {
    const sections = [
      section("third", { order: 3 }),
      section("first", { order: 1 }),
      section("second", { order: 2 }),
    ]
    const prepared = prepareStudentSyllabusSections(sections)
    assert.deepEqual(
      prepared.map((s) => s.sectionId),
      ["first", "second", "third"],
    )
  })

  it("merges exam schedule table into assessments and drops standalone exam section", () => {
    const sections = [
      section("schedule-assessments", {
        order: 1,
        content: { tables: [{ title: "Weekly plan", columns: ["Week"], rows: [["1"]] }] },
      }),
      section("exam-quiz-schedule", {
        order: 2,
        isVisible: true,
        content: {
          columns: ["Exam", "Date"],
          rows: [["Midterm", "Oct 1"]],
        },
      }),
    ]
    const prepared = prepareStudentSyllabusSections(sections)
    assert.equal(prepared.length, 1)
    assert.equal(prepared[0]?.sectionId, "schedule-assessments")
    const tables = prepared[0]!.content!.tables ?? []
    assert.equal(tables.length, 2)
    assert.match(tables[1]?.title ?? "", /exam|quiz/i)
  })
})

describe("isUnpublishedSyllabusMessage", () => {
  it("treats instructor unpublished copy as empty, not a crash", () => {
    assert.equal(
      isUnpublishedSyllabusMessage(new Error("Syllabus is not yet published for this course.")),
      true,
    )
    assert.equal(isUnpublishedSyllabusMessage(new Error("Failed to load syllabus.")), false)
  })
})

describe("prepareSyllabusForDisplay", () => {
  it("applies publish visibility rules for student-facing payload", () => {
    const display = prepareSyllabusForDisplay({
      title: "ECE 2202 Syllabus",
      term: "Fall 2026",
      sections: [
        section("published", { order: 1, isVisible: true, content: { markdown: "Shown" } }),
        section("draft-hidden", { order: 2, isVisible: false, content: { markdown: "Hidden" } }),
      ],
    })
    assert.equal(display.title, "ECE 2202 Syllabus")
    assert.equal(display.sections.length, 1)
    assert.equal(display.sections[0]?.sectionId, "published")
  })
})
