import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isFlashcardDeckStudyLockedForAccess,
  resolveFlashcardTierAccess,
} from "./flashcard-access"
import type { FlashcardTierAccess } from "./flashcards-api"

const scholarAccess: FlashcardTierAccess = {
  unlockFraction: 0,
  dailyCardCap: 0,
  canStudyCourseDeck: false,
  upgradeRequiredTier: "Explorer",
}

describe("resolveFlashcardTierAccess", () => {
  it("unlocks course decks for a Trailblazer even if the module snapshot is Scholar", () => {
    const access = resolveFlashcardTierAccess("Trailblazer", true, scholarAccess)
    assert.equal(access.canStudyCourseDeck, true)
    assert.equal(access.unlockFraction, 1)
    assert.equal(isFlashcardDeckStudyLockedForAccess(20, access), false)
  })

  it("keeps Scholar locked when membership is Scholar", () => {
    const access = resolveFlashcardTierAccess("Scholar", true, scholarAccess)
    assert.equal(access.canStudyCourseDeck, false)
    assert.equal(isFlashcardDeckStudyLockedForAccess(20, access), true)
  })
})
