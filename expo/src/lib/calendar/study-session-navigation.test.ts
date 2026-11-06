import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isStudySessionEvent, resolveStudySessionRoute } from "./study-session-navigation"
import type { CalendarEvent } from "./types"

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    title: "Study session",
    ...overrides,
  }
}

describe("study session navigation", () => {
  it("detects study session calendar rows", () => {
    assert.equal(isStudySessionEvent(event({ title: "Analysis study session 3" })), true)
    assert.equal(isStudySessionEvent(event({ title: "Lecture 1", event_type: "lecture" as never })), false)
  })

  it("routes analysis sessions to practice", () => {
    assert.equal(
      resolveStudySessionRoute(event({ title: "Analysis study session 3", event_type: "study_session" })),
      "/module/practice",
    )
  })

  it("routes generic study sessions to flashcards when no target is embedded", () => {
    assert.equal(
      resolveStudySessionRoute(event({ title: "Study session", event_type: "study_session" })),
      "/module/flashcards",
    )
    assert.equal(resolveStudySessionRoute(event({ title: "Study: Ohm's law" })), "/module/flashcards")
  })

  it("opens embedded deck links from calendar descriptions", () => {
    assert.equal(
      resolveStudySessionRoute(
        event({
          title: "Study session",
          description: "Review deck_id=42 before quiz",
        }),
      ),
      "/flashcards/42",
    )
    assert.equal(
      resolveStudySessionRoute(
        event({
          title: "Study session",
          description: "Open coursecollab:///flashcards/17 tonight",
        }),
      ),
      "/flashcards/17",
    )
  })

  it("opens an embedded topic on the topic screen, not the hub", () => {
    // The hub ignores ?topic=, so routing there made Study look like it did nothing.
    assert.equal(
      resolveStudySessionRoute(
        event({
          title: "Study session",
          description: "Drill before the midterm\npractice_topic=Loops",
        }),
      ),
      "/practice/topic?topic=Loops",
    )
    assert.equal(
      resolveStudySessionRoute(
        event({ title: "Study session", description: "topic=Node Voltage" }),
      ),
      "/practice/topic?topic=Node%20Voltage",
    )
  })

  it("routes flashcard and practice hub titles", () => {
    assert.equal(
      resolveStudySessionRoute(event({ title: "Flashcards: Ohm's law" })),
      "/module/flashcards",
    )
    assert.equal(
      resolveStudySessionRoute(event({ title: "Practice Hub: Loops" })),
      "/module/practice",
    )
  })
})
