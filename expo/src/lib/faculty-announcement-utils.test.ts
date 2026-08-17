/**
 * Run: npx tsx --test expo/src/lib/faculty-announcement-utils.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyFacultyAnnouncementQuery,
  countFacultyAnnouncementsByFilter,
  facultyAnnouncementAudienceLabel,
  filterFacultyAnnouncements,
  type FacultyAnnouncementListItem,
} from "./faculty-announcement-utils"

type Row = FacultyAnnouncementListItem & { id: number }

function item(overrides: Partial<Row> = {}): Row {
  return {
    id: 1,
    title: "Midterm reminder",
    content: "Exam is Friday.",
    pinned: false,
    is_active: true,
    ...overrides,
  }
}

describe("filterFacultyAnnouncements", () => {
  it("keeps pinned or high-priority items for the high filter", () => {
    const items = [
      item({ id: 1, pinned: true, title: "Pinned" }),
      item({ id: 2, priority: "high", title: "High" }),
      item({ id: 3, title: "Normal" }),
    ]
    const high = filterFacultyAnnouncements(items, "high")
    assert.deepEqual(
      high.map((row) => row.id),
      [1, 2],
    )
  })

  it("excludes inactive items from the active filter", () => {
    const items = [item({ id: 1, is_active: true }), item({ id: 2, is_active: false })]
    const active = filterFacultyAnnouncements(items, "active")
    assert.equal(active.length, 1)
    assert.equal(active[0]?.id, 1)
  })
})

describe("applyFacultyAnnouncementQuery", () => {
  it("searches title then applies the high filter", () => {
    const items = [
      item({ id: 1, title: "Lab cancelled", pinned: true }),
      item({ id: 2, title: "Lab cancelled", pinned: false }),
      item({ id: 3, title: "Office hours", pinned: true }),
    ]
    const matched = applyFacultyAnnouncementQuery(items, { search: "lab", filter: "high" })
    assert.equal(matched.length, 1)
    assert.equal(matched[0]?.id, 1)
  })
})

describe("countFacultyAnnouncementsByFilter", () => {
  it("counts all / high / active buckets", () => {
    const items = [
      item({ id: 1, pinned: true, is_active: true }),
      item({ id: 2, is_active: false }),
      item({ id: 3, is_active: true }),
    ]
    assert.deepEqual(countFacultyAnnouncementsByFilter(items), {
      all: 3,
      high: 1,
      active: 2,
    })
  })
})

describe("facultyAnnouncementAudienceLabel", () => {
  it("returns Course-wide for empty or all", () => {
    assert.equal(facultyAnnouncementAudienceLabel(), "Course-wide")
    assert.equal(facultyAnnouncementAudienceLabel("all"), "Course-wide")
    assert.equal(facultyAnnouncementAudienceLabel("  ALL  "), "Course-wide")
  })

  it("returns the section code when targeted", () => {
    assert.equal(facultyAnnouncementAudienceLabel("ECE2202"), "ECE2202")
  })
})
