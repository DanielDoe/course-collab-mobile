/**
 * Run: npx tsx --test src/lib/faculty-list-pager.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  FACULTY_LIST_PAGE_SIZE,
  facultyListPageCount,
  facultyListPageLabel,
  sliceFacultyListPage,
} from "./faculty-list-pager"

describe("faculty list pager", () => {
  it("pages eight items at a time", () => {
    const items = Array.from({ length: 17 }, (_, i) => i)
    assert.equal(FACULTY_LIST_PAGE_SIZE, 8)
    assert.equal(facultyListPageCount(17), 3)
    assert.deepEqual(sliceFacultyListPage(items, 0), items.slice(0, 8))
    assert.deepEqual(sliceFacultyListPage(items, 2), [16])
    assert.equal(facultyListPageLabel("students", 17, 0), "Showing 1–8 of 17")
    assert.equal(facultyListPageLabel("letters", 0, 0), "0 letters")
  })
})
