import {
  buildFlashcardHtml,
  needsQuestionRichRender,
  normalizeQuestionContentForRender,
  questionPlainText,
} from "./classroom-submission"
import type { FlashcardCard } from "./flashcards-api"
import { fenceLikelySourceCode } from "./flashcard-source-fence"

export { fenceLikelySourceCode } from "./flashcard-source-fence"

/** Normalize card text fields from API payloads (camelCase or legacy keys). */
export function normalizeFlashcardCard(card: FlashcardCard & Record<string, unknown>): FlashcardCard {
  const frontText = String(
    card.frontText ??
      card.front_text ??
      card.front ??
      card.questionText ??
      card.question_text ??
      "",
  )
  const backText = String(
    card.backText ??
      card.back_text ??
      card.back ??
      card.answerText ??
      card.answer_text ??
      "",
  )
  return { ...card, frontText, backText }
}

export function normalizeFlashcardCards(cards: FlashcardCard[] | undefined): FlashcardCard[] {
  return (cards ?? []).map((card) => normalizeFlashcardCard(card as FlashcardCard & Record<string, unknown>))
}

/**
 * Full LaTeX/markdown repair for flashcard copy — rms subscripts, bare V_rms,
 * HTML KaTeX exports, engineering notation (ECE 2202, ELEG 130X decks).
 */
export function prepareFlashcardContentForRender(text: string): string {
  return normalizeQuestionContentForRender(fenceLikelySourceCode(text))
}

export function flashcardContentNeedsRichRender(text: string): boolean {
  return needsQuestionRichRender(prepareFlashcardContentForRender(text))
}

export function flashcardPlainText(text: string): string {
  return questionPlainText(prepareFlashcardContentForRender(text))
}

export function buildFlashcardContentHtml(
  prepared: string,
  options?: Parameters<typeof buildFlashcardHtml>[1],
): string {
  return buildFlashcardHtml(prepared, options)
}
