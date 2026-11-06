import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { dedupeElegSharedLectureRows, dedupeStudentLectureList } from "./lecture-list-dedupe"

describe("lecture-list-dedupe", () => {
  it("dedupes shared ELEG rows by week + title", () => {
    const rows = [
      { id: 254, week: 1, title: "ELEG 130X: Lecture 1 — Intro", course_id: 5 },
      { id: 286, week: 1, title: "ELEG 130X: Lecture 1 — Intro", course_id: 22 },
      { id: 255, week: 2, title: "ELEG 130X: Lecture 2 — Basics", course_id: 5 },
      { id: 287, week: 2, title: "ELEG 130X: Lecture 2 — Basics", course_id: 22 },
    ]
    const out = dedupeElegSharedLectureRows(rows, 6, "ELEG1304P03")
    assert.equal(out.length, 2)
    assert.equal(out[0]?.id, 254)
    assert.equal(out[1]?.id, 255)
  })

  it("prefers rows with saved progress when scores tie", () => {
    const rows = [
      { id: 254, week: 1, title: "ELEG 130X: Lecture 1 — Intro", course_id: 5, progress_percentage: 0 },
      { id: 286, week: 1, title: "ELEG 130X: Lecture 1 — Intro", course_id: 22, progress_percentage: 40 },
    ]
    const out = dedupeElegSharedLectureRows(rows, 6, "ELEG1304P03")
    assert.equal(out.length, 1)
    assert.equal(out[0]?.id, 286)
  })

  it("skips dedupe for non-ELEG courses", () => {
    const rows = [{ id: 1, week: 1, title: "Week 1" }]
    const out = dedupeStudentLectureList(rows, { courseId: 7, courseCode: "ECE2202" })
    assert.deepEqual(out, rows)
  })
})
