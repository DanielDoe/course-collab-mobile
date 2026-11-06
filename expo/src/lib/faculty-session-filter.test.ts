/**
 * Run: npx tsx --test src/lib/faculty-session-filter.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  facultySessionFilterDetail,
  facultySessionFilterLabel,
  shortenFacultySessionDescription,
} from "./faculty-session-filter"

describe("faculty session filter copy", () => {
  it("does not dump the mashed catalog string as the row title", () => {
    const blob =
      "ELEG1304P03 · P03/P83 — Lecture Mon & Wed 11:00 AM–12:20 PM; Lab Mon 5:00–5:50 PM; Recitation Fri"
    assert.equal(facultySessionFilterLabel("P03"), "Section P03")
    assert.equal(shortenFacultySessionDescription(blob, "P03"), "Lecture Mon & Wed 11:00 AM–12:20 PM")
  })

  it("prefers student count over schedule text", () => {
    assert.equal(
      facultySessionFilterDetail({
        code: "P03",
        description: "Lecture Mon & Wed",
        student_count: 28,
      }),
      "28 students",
    )
  })

  it("hides a description that is only the section code", () => {
    assert.equal(shortenFacultySessionDescription("P03", "P03"), undefined)
  })
})
