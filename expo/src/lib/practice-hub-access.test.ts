import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolvePracticeAccess } from "./practice-hub-access"
import { practiceTopicUnlockedCount } from "./practice-session-count"
import type { PracticeAccess } from "./practice-api"

const scholarAccess: PracticeAccess = {
  level: "none",
  canOpenTopics: false,
  canStartPractice: false,
  unlockFraction: 0,
  upgradeRequiredTier: "Explorer",
}

describe("resolvePracticeAccess", () => {
  it("lets a Trailblazer start practice when the hub snapshot is still Scholar", () => {
    const access = resolvePracticeAccess("Trailblazer", true, scholarAccess)
    assert.equal(access.canStartPractice, true)
    assert.equal(access.level, "full")
  })

  it("uses the full topic bank for Trailblazer", () => {
    assert.equal(
      practiceTopicUnlockedCount({ name: "Week 2", questionCount: 12, unlockedCount: 0, completed: 0, correct: 0, accuracy: 0, lastPracticed: null }, "Trailblazer"),
      12,
    )
  })
})
