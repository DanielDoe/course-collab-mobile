import { hexToRgba, type AppThemeTokens } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT, flashcardDifficultyBadgeStyle } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { FlashcardDifficulty } from "./flashcard-difficulty"
import { normalizeFlashcardDifficulty } from "./flashcard-difficulty"
import type { FlashcardDeck } from "./flashcards-api"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFromHash } from "./solid-list-thumb"

/** Faculty flashcards — Color Hunt accents; list cards match student lecture/deck row chrome. */
export const FACULTY_FLASHCARD_COLOR = {
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  link: COLOR_HUNT_COOL.cyan,
  published: REPORT_SOLID.correct,
  publishedInk: REPORT_SOLID.correctInk,
  draft: COLOR_HUNT.orange,
  practiceHub: COLOR_HUNT_COOL.cyan,
} as const

/** Generate panel — white inset card in light mode; elevated surface in dark (not accent-tinted). */
export function facultyFlashcardGenerateChrome(native: AppThemeTokens["native"], isDark: boolean) {
  if (isDark) {
    return {
      surface: native.tertiaryGrouped,
      iconTile: native.fill,
      iconInk: native.secondaryLabel,
    }
  }
  return {
    surface: native.secondaryGrouped,
    iconTile: native.fill,
    iconInk: native.secondaryLabel,
  }
}

export function facultyFlashcardSwitchTrack(tokens: AppThemeTokens) {
  return {
    false: tokens.native.switchTrackOff,
    true: hexToRgba(FACULTY_FLASHCARD_COLOR.action, tokens.isDark ? 0.52 : 0.45),
  }
}

export function facultyFlashcardEditorCardThumb(
  cardIndex: number,
  difficulty?: FlashcardDifficulty | string | null,
  isDark = false,
): SolidListThumb {
  const badge = flashcardDifficultyBadgeStyle(
    normalizeFlashcardDifficulty(difficulty),
    isDark,
  )
  return {
    fill: badge.backgroundColor,
    icon: badge.color,
    label: badge.backgroundColor,
  }
}

export function facultyFlashcardDeckListThumb(deckId: number | string): SolidListThumb {
  return solidListThumbFromHash(deckId)
}

export function facultyFlashcardDeckMetaLine(deck: FlashcardDeck): string {
  const topic = deck.topic?.trim()
  const count = `${deck.cardCount} card${deck.cardCount === 1 ? "" : "s"}`
  const mode = deck.requireMcqValidation !== false ? "Quiz check" : "Flip only"
  const parts = [topic, count, mode].filter(Boolean)
  return parts.join(" · ")
}

export function facultyFlashcardDeckStatus(deck: FlashcardDeck): {
  label: string
  color: string
} {
  if (deck.isPublished) {
    return { label: "Published", color: FACULTY_FLASHCARD_COLOR.published }
  }
  return { label: "Draft", color: FACULTY_FLASHCARD_COLOR.draft }
}

export function facultyFlashcardPracticeHubMeta(showInPracticeHub: boolean): string | null {
  return showInPracticeHub ? "Practice Hub" : null
}

