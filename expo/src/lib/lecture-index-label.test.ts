import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatElegLectureDisplayTitle,
  formatLectureIndexLabel,
  isElegSharedLectureCourseCode,
} from "./lecture-index-label"

describe("lecture-index-label", () => {
  it("formats ELEG catalog numbers from session codes", () => {
    assert.equal(
      formatElegLectureDisplayTitle("ELEG 130X: Lecture 1 — Intro", "ELEG1304P03"),
      "ELEG 1304: Lecture 1 — Intro",
    )
  })

  it("uses Lecture N for ELEG courses", () => {
    assert.equal(
      formatLectureIndexLabel(3, {
        title: "ELEG 1304: Lecture 3 — First Program",
        courseCode: "ELEG1304",
      }),
      "Lecture 3",
    )
    assert.equal(formatLectureIndexLabel(3, { courseCode: "ECE2202" }), "Week 3")
  })

  it("recognizes shared ELEG course codes", () => {
    assert.equal(isElegSharedLectureCourseCode("ELEG1304-P01"), true)
    assert.equal(isElegSharedLectureCourseCode("ECE2202"), false)
  })
})
