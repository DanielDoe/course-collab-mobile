import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  announcementCanAddToCalendar,
  announcementEventEndIso,
  announcementEventStartIso,
  announcementEventWhenLabel,
} from "./announcement-calendar"

describe("announcement calendar helpers", () => {
  it("requires an exam/alert type and a date", () => {
    assert.equal(announcementCanAddToCalendar({ type: "exam", event_date: "2026-09-15" }), true)
    assert.equal(announcementCanAddToCalendar({ category: "alert", event_date: "2026-09-15" }), true)
    assert.equal(announcementCanAddToCalendar({ type: "info", event_date: "2026-09-15" }), false)
    assert.equal(announcementCanAddToCalendar({ type: "exam", event_date: null }), false)
  })

  it("builds wall-clock start and end timestamps", () => {
    assert.equal(
      announcementEventStartIso({ event_date: "2026-09-15", event_time: "14:30" }),
      "2026-09-15T14:30:00",
    )
    assert.equal(
      announcementEventEndIso({ event_date: "2026-09-15", event_end: "16:00" }),
      "2026-09-15T16:00:00",
    )
    assert.equal(announcementEventEndIso({ event_date: "2026-09-15" }), null)
  })

  it("formats the event when label for faculty and student detail", () => {
    assert.equal(
      announcementEventWhenLabel({
        event_date: "2026-09-15",
        event_time: "14:30",
        event_end: "16:00",
      }),
      "2026-09-15 · 14:30–16:00",
    )
    assert.equal(announcementEventWhenLabel({ event_date: "2026-09-15" }), "2026-09-15")
    assert.equal(announcementEventWhenLabel({}), null)
  })
})
