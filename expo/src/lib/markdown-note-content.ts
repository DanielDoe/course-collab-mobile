import { isNoteHtml } from "./digital-note-content"

const CORA_EXPORT_MARKERS = [
  /^#\s+Cora chat/m,
  /Exported from Cora workspace/i,
  /^##\s+Cora\b/m,
]

const MARKDOWN_HINT =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\*\*[^*]+\*\*|\\[\[(]|\\[\(\[]|\$\$|_[^_]+_/

/** True when note body is markdown/KaTeX (e.g. Cora export), not rich HTML. */
export function isMarkdownNoteContent(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (isNoteHtml(trimmed)) return false
  if (CORA_EXPORT_MARKERS.some((re) => re.test(trimmed))) return true
  return MARKDOWN_HINT.test(trimmed)
}

/** Fix known export glitches before edit/preview/save. */
export function sanitizeMarkdownNoteBody(content: string): string {
  return content.replace(/^## Cora · Invalid Date\s*\n+/gm, "## Cora\n\n")
}

export function noteBodyForEditor(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return ""
  if (isMarkdownNoteContent(trimmed)) return sanitizeMarkdownNoteBody(trimmed)
  return trimmed
}

export function noteBodyForSave(content: string, originalContent?: string): string {
  const trimmed = content.trim()
  if (!trimmed) return ""
  const source = originalContent?.trim() ?? trimmed
  if (isMarkdownNoteContent(trimmed) || isMarkdownNoteContent(source)) {
    return sanitizeMarkdownNoteBody(trimmed)
  }
  return trimmed
}
