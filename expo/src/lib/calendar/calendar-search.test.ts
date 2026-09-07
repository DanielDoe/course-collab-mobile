import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calendarEventKind,
  calendarEventMatchesQuery,
  filterCalendarEvents,
  filterCalendarEventsByKind,
} from "./calendar-search"
import type { CalendarEvent } from "./types"

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    title: "Midterm exam",
    description: "Covers lectures 1-6",
    location: "BELL 2013",
    event_type: "exam",
    ...overrides,
  }
}

describe("calendar search", () => {
  it("matches title, description, location, and type case-insensitively", () => {
    const row = event({})
    assert.equal(calendarEventMatchesQuery(row, "midterm"), true)
    assert.equal(calendarEventMatchesQuery(row, "LECTURES"), true)
    assert.equal(calendarEventMatchesQuery(row, "bell"), true)
    assert.equal(calendarEventMatchesQuery(row, "exam"), true)
    assert.equal(calendarEventMatchesQuery(row, "homework"), false)
  })

  it("returns all events when the query is blank", () => {
    const events = [event({ id: 1 }), event({ id: 2, title: "Office hours" })]
    assert.equal(filterCalendarEvents(events, "  ").length, 2)
    assert.equal(filterCalendarEvents(events, "office").length, 1)
  })

  it("filters by event kind without clearing search", () => {
    const exam = event({ id: 1, event_type: "exam" })
    const office = event({ id: 2, title: "OH", event_type: "office_hours" })
    assert.equal(calendarEventKind(exam), "exams")
    assert.equal(calendarEventKind(office), "office_hours")
    assert.equal(filterCalendarEventsByKind([exam, office], "exams").length, 1)
    assert.equal(filterCalendarEventsByKind([exam, office], "all").length, 2)
  })
})
