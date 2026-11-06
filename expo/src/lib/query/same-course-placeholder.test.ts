import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { keepSameCoursePlaceholder } from "./same-course-placeholder"

describe("keepSameCoursePlaceholder", () => {
  it("keeps previous rows when the course and section match", () => {
    const key = ["student", "grades", "42", "16", "P01", "bundle"] as const
    assert.equal(
      keepSameCoursePlaceholder({ score: 90 }, { queryKey: key }, key)?.score,
      90,
    )
  })

  it("drops previous rows when switching courses", () => {
    const previousKey = ["student", "grades", "42", "16", "P01", "bundle"] as const
    const nextKey = ["student", "grades", "42", "5", "P02", "bundle"] as const
    assert.equal(
      keepSameCoursePlaceholder({ score: 90 }, { queryKey: previousKey }, nextKey),
      undefined,
    )
  })

  it("drops faculty placeholder rows when switching courses", () => {
    const previousKey = ["faculty", "students", "9", "16", "P01", "list"] as const
    const nextKey = ["faculty", "students", "9", "5", "P02", "list"] as const
    assert.equal(
      keepSameCoursePlaceholder({ students: [1] }, { queryKey: previousKey }, nextKey),
      undefined,
    )
  })
})
