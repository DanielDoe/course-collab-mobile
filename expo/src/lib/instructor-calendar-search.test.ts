import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  filterInstructorCalendarEvents,
  instructorCalendarEventFromAnnouncement,
  instructorCalendarEventMatchesQuery,
  mergeInstructorCalendarAnnouncements,
  type InstructorCalendarEvent,
} from "./instructor-calendar"

function event(overrides: Partial<InstructorCalendarEvent>): InstructorCalendarEvent {
  return {
    id: "1",
    title: "Office hours",
    description: "Weekly drop-in",
    eventType: "regular_office_hours",
    startTime: "2026-09-01T10:00:00",
    endTime: "2026-09-01T11:00:00",
    location: "BELL 2013",
    color: "#2563eb",
    pendingScheduleChange: false,
    courseCode: "ELEG 1304",
    studentName: "Ada Lovelace",
    ...overrides,
  }
}

describe("faculty calendar search", () => {
  it("matches title, location, course, student, and kind", () => {
    const row = event({})
    assert.equal(instructorCalendarEventMatchesQuery(row, "office"), true)
    assert.equal(instructorCalendarEventMatchesQuery(row, "bell"), true)
    assert.equal(instructorCalendarEventMatchesQuery(row, "eleg"), true)
    assert.equal(instructorCalendarEventMatchesQuery(row, "ada"), true)
    assert.equal(instructorCalendarEventMatchesQuery(row, "quiz"), false)
  })

  it("returns all events when the query is blank", () => {
    const events = [event({ id: "1" }), event({ id: "2", title: "Lecture" })]
    assert.equal(filterInstructorCalendarEvents(events, "  ").length, 2)
    assert.equal(filterInstructorCalendarEvents(events, "lecture").length, 1)
  })

  it("maps exam announcements onto the faculty calendar and skips info posts", () => {
    const mapped = instructorCalendarEventFromAnnouncement({
      id: 44,
      title: "Midterm",
      type: "exam",
      event_date: "2026-10-02",
      event_time: "09:00",
      event_end: "10:30",
      event_location: "BELL 2013",
    })
    assert.ok(mapped)
    assert.equal(mapped?.eventType, "announcement")
    assert.equal(mapped?.startTime, "2026-10-02T09:00:00")
    assert.equal(mapped?.endTime, "2026-10-02T10:30:00")
    assert.equal(mapped?.location, "BELL 2013")
    assert.equal(
      instructorCalendarEventFromAnnouncement({
        id: 45,
        title: "Office update",
        type: "info",
        event_date: "2026-10-02",
      }),
      null,
    )
  })

  it("merges announcement events into the class calendar list", () => {
    const classEvent = event({ id: "class-1", startTime: "2026-10-02T08:00:00" })
    const merged = mergeInstructorCalendarAnnouncements([classEvent], [
      {
        id: 44,
        title: "Midterm",
        type: "exam",
        event_date: "2026-10-02",
        event_time: "13:00",
      },
    ])
    assert.equal(merged.length, 2)
    assert.equal(merged[0]?.id, "class-1")
    assert.equal(merged[1]?.id, "announcement:44")
    assert.equal(instructorCalendarEventMatchesQuery(merged[1]!, "midterm"), true)
  })
})
