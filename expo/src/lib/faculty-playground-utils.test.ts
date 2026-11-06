import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  nextPlaygroundSessionsFetchPage,
  playgroundSessionPageCount,
  playgroundSessionPageLabel,
  playgroundSessionPhase,
  playgroundSessionQuestionsEditable,
  slicePlaygroundSessionPage,
} from "./faculty-playground-utils"

describe("playground session question edit window", () => {
  it("allows lobby and ended, blocks live", () => {
    assert.equal(playgroundSessionQuestionsEditable("lobby"), true)
    assert.equal(playgroundSessionQuestionsEditable("ended"), true)
    assert.equal(playgroundSessionQuestionsEditable("live"), false)
    assert.equal(playgroundSessionPhase({ is_active: true, game_started: false }), "lobby")
    assert.equal(playgroundSessionPhase({ is_active: true, game_started: true }), "live")
  })
})

describe("playground session list pagination", () => {
  it("counts pages from a 6-item grid", () => {
    assert.equal(playgroundSessionPageCount(0), 1)
    assert.equal(playgroundSessionPageCount(6), 1)
    assert.equal(playgroundSessionPageCount(7), 2)
    assert.equal(playgroundSessionPageCount(13), 3)
  })

  it("slices the current page and clamps out of range", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    assert.deepEqual(slicePlaygroundSessionPage(items, 0), [1, 2, 3, 4, 5, 6])
    assert.deepEqual(slicePlaygroundSessionPage(items, 1), [7, 8])
    assert.deepEqual(slicePlaygroundSessionPage(items, 9), [7, 8])
    assert.deepEqual(slicePlaygroundSessionPage(items, -1), [1, 2, 3, 4, 5, 6])
  })

  it("labels the visible range", () => {
    assert.equal(playgroundSessionPageLabel(0, 0), "0 sessions")
    assert.equal(playgroundSessionPageLabel(13, 0), "Showing 1–6 of 13")
    assert.equal(playgroundSessionPageLabel(13, 2), "Showing 13–13 of 13")
    assert.equal(playgroundSessionPageLabel(13, 99), "Showing 13–13 of 13")
  })

  it("walks fetch pages until collected meets total", () => {
    assert.equal(nextPlaygroundSessionsFetchPage({ collected: 200, total: 450, currentPage: 1 }), 2)
    assert.equal(nextPlaygroundSessionsFetchPage({ collected: 450, total: 450, currentPage: 3 }), null)
    assert.equal(nextPlaygroundSessionsFetchPage({ collected: 50, total: 50, currentPage: 1 }), null)
    assert.equal(nextPlaygroundSessionsFetchPage({ collected: 200, total: 5000, currentPage: 20 }), null)
  })
})
