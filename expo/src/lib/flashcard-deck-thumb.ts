import type { FlashcardDeckCardKind } from "./flashcard-deck-kind"
import type { SolidListThumb } from "./solid-list-thumb"
import {
  SOLID_THUMB_EMPTY,
  SOLID_THUMB_LOCKED,
  SOLID_THUMB_SUCCESS,
  solidListThumbFromHash,
} from "./solid-list-thumb"

export function flashcardDeckSolidThumb(
  deckId: number | string,
  kind: FlashcardDeckCardKind,
  options?: { locked?: boolean },
): SolidListThumb {
  if (options?.locked) return SOLID_THUMB_LOCKED
  if (kind === "empty") return SOLID_THUMB_EMPTY
  if (kind === "completed") return SOLID_THUMB_SUCCESS
  return solidListThumbFromHash(deckId)
}

export type FlashcardDeckCardPalette = {
  color: string
  soft: string
  border: string
}

/** @deprecated Use flashcardDeckSolidThumb */
export function flashcardDeckThumbPalette(
  deckId: number | string,
  kind: FlashcardDeckCardKind,
  _isDark = false,
): FlashcardDeckCardPalette {
  const thumb = flashcardDeckSolidThumb(deckId, kind)
  return { color: thumb.label, soft: thumb.fill, border: thumb.fill }
}

/** @deprecated Use flashcardDeckSolidThumb */
export function flashcardDeckThumbSlot(deckId: number | string): number {
  const raw = String(deckId)
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return hash
}
