import {
  announcementContentForEditor,
  announcementContentForSave,
  announcementPlainText,
  buildAnnouncementHtml,
  isAnnouncementHtml,
} from "./announcement-content"
import type { AppThemeTokens } from "../constants/app-themes"

/** Rich-text / markdown note bodies from the web editor. */
export function isNoteHtml(content: string): boolean {
  return isAnnouncementHtml(content)
}

export function noteContentPreviewText(content: string, maxLen = 120): string {
  return announcementPlainText(content, maxLen)
}

/** Plain text for the mobile editor — strips HTML tags, keeps paragraphs and lists. */
export function noteContentForEditor(content: string): string {
  return announcementContentForEditor(content)
}

/** Persist mobile edits — re-wrap plain text as simple HTML when the note was rich. */
export function noteContentForSave(content: string, originalContent?: string): string {
  return announcementContentForSave(content, originalContent)
}

export function buildDigitalNoteHtml(
  content: string,
  options?: {
    accentColor?: string
    paddingHorizontal?: number
    tokens?: AppThemeTokens
  },
): string {
  return buildAnnouncementHtml(content, options)
}
