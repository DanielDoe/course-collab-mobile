import type { MembershipTier } from "../types/dashboard"
import type { FlashcardCard, FlashcardTierAccess } from "./flashcards-api"

export type FlashcardAccessLevel = "none" | "partial" | "full"

export const FLASHCARD_EXPLORER_UNLOCK_FRACTION = 0.5

export function flashcardAccessLevel(tier: MembershipTier): FlashcardAccessLevel {
  if (tier === "Trailblazer") return "full"
  if (tier === "Explorer") return "partial"
  return "none"
}

function unlockedCountFromFraction(totalCards: number, unlockFraction: number): number {
  if (totalCards <= 0) return 0
  if (unlockFraction >= 1) return totalCards
  if (unlockFraction <= 0) return 0
  return Math.max(1, Math.ceil(totalCards * unlockFraction))
}

/** Cards a member may study in a deck (Scholar 0 · Explorer ~50% · Trailblazer all). */
export function flashcardDeckUnlockedCount(
  tier: MembershipTier,
  totalCards: number,
  unlockFraction = FLASHCARD_EXPLORER_UNLOCK_FRACTION,
): number {
  if (totalCards <= 0) return 0
  if (tier === "Trailblazer") return totalCards
  if (tier === "Explorer") return unlockedCountFromFraction(totalCards, unlockFraction)
  return 0
}

export function flashcardDeckUnlockedCountForAccess(
  totalCards: number,
  tierAccess: FlashcardTierAccess,
): number {
  if (!tierAccess.canStudyCourseDeck) return 0
  return unlockedCountFromFraction(totalCards, tierAccess.unlockFraction)
}

export function flashcardDeckLockedCount(
  tier: MembershipTier,
  totalCards: number,
  unlockFraction = FLASHCARD_EXPLORER_UNLOCK_FRACTION,
): number {
  return Math.max(0, totalCards - flashcardDeckUnlockedCount(tier, totalCards, unlockFraction))
}

export function flashcardDeckLockedCountForAccess(
  totalCards: number,
  tierAccess: FlashcardTierAccess,
): number {
  return Math.max(0, totalCards - flashcardDeckUnlockedCountForAccess(totalCards, tierAccess))
}

export function isFlashcardDeckStudyLocked(
  tier: MembershipTier,
  totalCards: number,
  unlockFraction = FLASHCARD_EXPLORER_UNLOCK_FRACTION,
): boolean {
  if (totalCards <= 0) return false
  return flashcardDeckUnlockedCount(tier, totalCards, unlockFraction) <= 0
}

export function isFlashcardDeckStudyLockedForAccess(
  totalCards: number,
  tierAccess: FlashcardTierAccess,
): boolean {
  if (totalCards <= 0) return false
  return !tierAccess.canStudyCourseDeck || flashcardDeckUnlockedCountForAccess(totalCards, tierAccess) <= 0
}

export function sortFlashcardCards(cards: FlashcardCard[]): FlashcardCard[] {
  return [...cards].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
}

export function partitionFlashcardCardsByTier(
  cards: FlashcardCard[],
  tier: MembershipTier,
  unlockFraction = FLASHCARD_EXPLORER_UNLOCK_FRACTION,
): { unlocked: FlashcardCard[]; locked: FlashcardCard[] } {
  const sorted = sortFlashcardCards(cards)
  const unlockedCount = flashcardDeckUnlockedCount(tier, sorted.length, unlockFraction)
  return {
    unlocked: sorted.slice(0, unlockedCount),
    locked: sorted.slice(unlockedCount),
  }
}

export function filterFlashcardCardsForTier(
  cards: FlashcardCard[],
  tier: MembershipTier,
  unlockFraction = FLASHCARD_EXPLORER_UNLOCK_FRACTION,
): FlashcardCard[] {
  return partitionFlashcardCardsByTier(cards, tier, unlockFraction).unlocked
}

export function flashcardDeckAccessMeta(
  tier: MembershipTier,
  totalCards: number,
  unlockFraction = FLASHCARD_EXPLORER_UNLOCK_FRACTION,
): string | null {
  if (totalCards <= 0) return null
  const unlocked = flashcardDeckUnlockedCount(tier, totalCards, unlockFraction)
  const locked = totalCards - unlocked
  if (locked <= 0) return null
  if (unlocked <= 0) return `${totalCards} cards · locked`
  return `${unlocked}/${totalCards} unlocked · ${locked} locked`
}

export function flashcardDeckAccessMetaForAccess(
  totalCards: number,
  tierAccess: FlashcardTierAccess,
): string | null {
  if (totalCards <= 0) return null
  const unlocked = flashcardDeckUnlockedCountForAccess(totalCards, tierAccess)
  const locked = totalCards - unlocked
  if (locked <= 0) return null
  if (unlocked <= 0) return `${totalCards} cards · locked`
  return `${unlocked}/${totalCards} unlocked · ${locked} locked`
}

export function flashcardUpgradeMessage(tier: MembershipTier): string {
  if (tier === "Scholar") {
    return "Upgrade to Explorer to study flashcards. Explorer unlocks half of each deck; Trailblazer unlocks the full deck."
  }
  return "Upgrade to Trailblazer to unlock every card in this deck."
}

export function flashcardUpgradeMessageForAccess(tierAccess: FlashcardTierAccess): string {
  if (tierAccess.upgradeRequiredTier === "Explorer") {
    return "Upgrade to Explorer to study flashcards."
  }
  if (tierAccess.upgradeRequiredTier === "Trailblazer") {
    return "Upgrade to Trailblazer to unlock every card in this deck."
  }
  return flashcardUpgradeMessage("Scholar")
}
