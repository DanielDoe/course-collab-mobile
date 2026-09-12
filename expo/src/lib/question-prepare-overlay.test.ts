import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldShowQuestionPrepareOverlay } from "./question-prepare-overlay"

describe("shouldShowQuestionPrepareOverlay", () => {
  it("holds the overlay until WebViews paint when hideUntilReady is set", () => {
    assert.equal(
      shouldShowQuestionPrepareOverlay({
        enabled: true,
        ready: true,
        fetching: false,
        visible: false,
        hideUntilReady: true,
        textCount: 4,
        paintReady: false,
      }),
      true,
    )
    assert.equal(
      shouldShowQuestionPrepareOverlay({
        enabled: true,
        ready: true,
        fetching: false,
        visible: false,
        hideUntilReady: true,
        textCount: 4,
        paintReady: true,
      }),
      false,
    )
  })

  it("does not hold on paint when the caller omits paintReady", () => {
    assert.equal(
      shouldShowQuestionPrepareOverlay({
        enabled: true,
        ready: true,
        fetching: false,
        visible: false,
        hideUntilReady: true,
        textCount: 4,
      }),
      false,
    )
  })
})
