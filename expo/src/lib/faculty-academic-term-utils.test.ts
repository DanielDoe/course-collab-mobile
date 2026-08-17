/**
 * Run: npx tsx --test expo/src/lib/faculty-academic-term-utils.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isAcademicCalendarDate,
  termPayloadFromForm,
  uniqueTermCourses,
  type AcademicTermNameForm,
} from "./faculty-academic-term-utils"

function form(overrides: Partial<AcademicTermNameForm> = {}): AcademicTermNameForm {
  return {
    year: "2026",
    term: "Fall",
    start_date: "2026-08-24",
    end_date: "2026-12-18",
    ...overrides,
  }
}

describe("termPayloadFromForm", () => {
  it("accepts a valid year, season, and date range", () => {
    const payload = termPayloadFromForm(form())
    assert.equal(payload.year, 2026)
    assert.equal(payload.term, "Fall")
    assert.equal(payload.start_date, "2026-08-24")
    assert.equal(payload.end_date, "2026-12-18")
  })

  it("rejects a missing year", () => {
    assert.throws(() => termPayloadFromForm(form({ year: "" })), /Year and term/)
  })

  it("rejects a non-ISO start date", () => {
    assert.throws(() => termPayloadFromForm(form({ start_date: "08/24/2026" })), /YYYY-MM-DD/)
  })

  it("rejects an end date before the start date", () => {
    assert.throws(
      () => termPayloadFromForm(form({ start_date: "2026-12-18", end_date: "2026-08-24" })),
      /on or after/,
    )
  })
})

describe("isAcademicCalendarDate", () => {
  it("accepts a real calendar day", () => {
    assert.equal(isAcademicCalendarDate("2026-02-28"), true)
  })

  it("rejects an impossible day", () => {
    assert.equal(isAcademicCalendarDate("2026-02-31"), false)
  })
})

describe("uniqueTermCourses", () => {
  it("dedupes course codes case-insensitively", () => {
    const unique = uniqueTermCourses([
      { id: 1, course_code: "ECE2202", course_title: "A" },
      { id: 2, course_code: "ece2202", course_title: "B" },
      { id: 3, course_code: "ELEG1304", course_title: "C" },
    ])
    assert.deepEqual(
      unique.map((c) => c.course_code),
      ["ECE2202", "ELEG1304"],
    )
  })
})
