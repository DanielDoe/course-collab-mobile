import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canCreatePlaygroundSession,
  playgroundCreateAllowedSessions,
  playgroundCreateSourceError,
  resolvePlaygroundCreateTopics,
} from "./faculty-playground-create"

describe("playground create source", () => {
  it("uses every eligible topic when none are selected", () => {
    assert.deepEqual(resolvePlaygroundCreateTopics([], ["Ohm", "KVL"]), ["Ohm", "KVL"])
  })

  it("keeps an explicit topic selection", () => {
    assert.deepEqual(resolvePlaygroundCreateTopics(["Ohm"], ["Ohm", "KVL"]), ["Ohm"])
  })

  it("blocks create when there is no topic or question source", () => {
    assert.equal(canCreatePlaygroundSession([]), false)
    assert.equal(playgroundCreateSourceError([]), "Select at least one topic or question.")
    assert.equal(canCreatePlaygroundSession([], [12]), true)
  })

  it("forwards the faculty-scoped class section", () => {
    assert.deepEqual(playgroundCreateAllowedSessions(14), [14])
    assert.equal(playgroundCreateAllowedSessions(null), null)
    assert.equal(playgroundCreateAllowedSessions(0), null)
  })
})
