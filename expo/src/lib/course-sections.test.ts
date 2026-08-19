/**
 * Run: npx tsx --test expo/src/lib/course-sections.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assessmentResultSectionHints,
  evaluationRowBelongsToCourse,
} from "./course-sections"

describe("assessmentResultSectionHints", () => {
  it("includes ECE 2202 catalog and legacy lab aliases", () => {
    const hints = assessmentResultSectionHints({ courseCode: "ECE 2202" })
    assert.ok(hints.includes("ECE 2202"))
    assert.ok(hints.includes("ECE2202"))
    assert.ok(hints.includes("ECE2202P01"))
  })

  it("keeps ELEG lecture section codes", () => {
    const hints = assessmentResultSectionHints({
      courseCode: "ELEG 1301",
      sessionCodes: ["ELEG1301P01"],
    })
    assert.ok(hints.includes("ELEG1301"))
    assert.ok(hints.includes("ELEG1301P01"))
    assert.equal(hints.includes("ECE2202"), false)
  })
})

describe("evaluationRowBelongsToCourse", () => {
  it("keeps ECE 2202 attempt rows", () => {
    assert.equal(
      evaluationRowBelongsToCourse({ section: "ECE2202" }, "ECE 2202", ["ECE2202"]),
      true,
    )
  })

  it("drops ELEG rows when ECE 2202 is selected", () => {
    assert.equal(
      evaluationRowBelongsToCourse({ section: "ELEG1301P01" }, "ECE 2202", ["ECE2202"]),
      false,
    )
  })
})
