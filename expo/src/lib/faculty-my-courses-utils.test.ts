/**
 * Run: npx tsx --test src/lib/faculty-my-courses-utils.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  facultyOfferingKey,
  flattenFacultyCourseOfferings,
  normalizeFacultyCourseOfferings,
} from "./faculty-my-courses-utils"

describe("faculty offering keys", () => {
  it("keeps two sections of the same course+term unique", () => {
    const rows = normalizeFacultyCourseOfferings([
      {
        course_id: 5,
        academic_term_id: 70,
        course_code: "ELEG1304",
        course_title: "Computer Applications",
        session_id: 11,
        session_code: "P03",
      },
      {
        course_id: 5,
        academic_term_id: 70,
        course_code: "ELEG1304",
        course_title: "Computer Applications",
        session_id: 12,
        session_code: "P83",
      },
    ])
    const flat = flattenFacultyCourseOfferings(rows)
    assert.equal(flat.length, 2)
    assert.notEqual(facultyOfferingKey(flat[0]), facultyOfferingKey(flat[1]))
    assert.deepEqual(
      new Set(flat.map(facultyOfferingKey)).size,
      2,
    )
  })

  it("collapses identical course+term+section duplicates", () => {
    const rows = normalizeFacultyCourseOfferings([
      { course_id: 5, academic_term_id: 70, course_code: "ELEG1304", course_title: "Apps", session_id: 11 },
      { course_id: 5, academic_term_id: 70, course_code: "ELEG1304", course_title: "Apps", session_id: 11 },
    ])
    assert.equal(flattenFacultyCourseOfferings(rows).length, 1)
  })
})
