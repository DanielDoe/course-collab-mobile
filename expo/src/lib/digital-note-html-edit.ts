import { isNoteHtml } from "./digital-note-content"
import { isMarkdownNoteContent, noteBodyForSave } from "./markdown-note-content"

export type NoteFormatAction =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "h1"
  | "h2"
  | "h3"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "paragraph"
  | "hr"

/** Convert stored HTML to an editable plain representation with lightweight markers. */
export function noteHtmlToEditablePlain(html: string): string {
  if (!html.trim()) return ""
  if (!isNoteHtml(html)) return html
  let text = html
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h1>/gi, "\n\n")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<\/h3>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<blockquote[^>]*>/gi, "> ")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "__$1__")
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, "~~$1~~")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
  return text.trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function inlineMarkdownToHtml(line: string): string {
  return line
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
}

/** Convert editable plain (with markers) back to HTML compatible with the web editor. */
export function editablePlainToNoteHtml(plain: string): string {
  const trimmed = plain.trim()
  if (!trimmed) return ""
  const blocks = trimmed.split(/\n\n+/)
  const htmlParts: string[] = []

  for (const block of blocks) {
    const lines = block.split("\n")
    if (lines.length === 1 && lines[0] === "---") {
      htmlParts.push("<hr/>")
      continue
    }
    if (lines.every((l) => l.startsWith("• ") || l.startsWith("* "))) {
      const items = lines
        .map((l) => l.replace(/^[•*]\s+/, ""))
        .map((l) => `<li>${inlineMarkdownToHtml(escapeHtml(l))}</li>`)
        .join("")
      htmlParts.push(`<ul>${items}</ul>`)
      continue
    }
    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      const items = lines
        .map((l) => l.replace(/^\d+\.\s+/, ""))
        .map((l) => `<li>${inlineMarkdownToHtml(escapeHtml(l))}</li>`)
        .join("")
      htmlParts.push(`<ol>${items}</ol>`)
      continue
    }
    if (lines.every((l) => l.startsWith("> "))) {
      const quote = lines.map((l) => l.replace(/^>\s+/, "")).join(" ")
      htmlParts.push(`<blockquote><p>${inlineMarkdownToHtml(escapeHtml(quote))}</p></blockquote>`)
      continue
    }
    const first = lines[0] ?? ""
    if (first.startsWith("# ")) {
      htmlParts.push(`<h1>${inlineMarkdownToHtml(escapeHtml(first.slice(2)))}</h1>`)
      continue
    }
    if (first.startsWith("## ")) {
      htmlParts.push(`<h2>${inlineMarkdownToHtml(escapeHtml(first.slice(3)))}</h2>`)
      continue
    }
    if (first.startsWith("### ")) {
      htmlParts.push(`<h3>${inlineMarkdownToHtml(escapeHtml(first.slice(4)))}</h3>`)
      continue
    }
    htmlParts.push(
      `<p>${inlineMarkdownToHtml(escapeHtml(block.replace(/\n/g, " ")))}</p>`,
    )
  }
  return htmlParts.join("")
}

export function noteContentForSaveFromEditable(plain: string, originalContent?: string): string {
  const trimmed = plain.trim()
  if (!trimmed) return ""
  if (isMarkdownNoteContent(trimmed) || isMarkdownNoteContent(originalContent ?? "")) {
    return noteBodyForSave(trimmed, originalContent)
  }
  const html = editablePlainToNoteHtml(trimmed)
  if (originalContent && isNoteHtml(originalContent)) return html
  if (isNoteHtml(trimmed)) return trimmed
  return html || trimmed
}

function wrapSelection(text: string, start: number, end: number, left: string, right: string): string {
  const s = Math.max(0, Math.min(start, end))
  const e = Math.max(start, end)
  const selected = text.slice(s, e)
  return `${text.slice(0, s)}${left}${selected || "text"}${right}${text.slice(e)}`
}

function prefixLines(text: string, start: number, end: number, prefix: string): string {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1
  const lineEndIdx = text.indexOf("\n", end)
  const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx
  const block = text.slice(lineStart, lineEnd)
  const updated = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n")
  return `${text.slice(0, lineStart)}${updated}${text.slice(lineEnd)}`
}

export function applyNoteFormat(
  text: string,
  selection: { start: number; end: number },
  action: NoteFormatAction,
): { text: string; selection: { start: number; end: number } } {
  const { start, end } = selection
  switch (action) {
    case "bold":
      return { text: wrapSelection(text, start, end, "**", "**"), selection: { start, end: end + 4 } }
    case "italic":
      return { text: wrapSelection(text, start, end, "*", "*"), selection: { start, end: end + 2 } }
    case "underline":
      return { text: wrapSelection(text, start, end, "__", "__"), selection: { start, end: end + 4 } }
    case "strike":
      return { text: wrapSelection(text, start, end, "~~", "~~"), selection: { start, end: end + 4 } }
    case "h1":
      return { text: prefixLines(text, start, end, "# "), selection: { start, end } }
    case "h2":
      return { text: prefixLines(text, start, end, "## "), selection: { start, end } }
    case "h3":
      return { text: prefixLines(text, start, end, "### "), selection: { start, end } }
    case "bulletList":
      return { text: prefixLines(text, start, end, "• "), selection: { start, end } }
    case "orderedList":
      return { text: prefixLines(text, start, end, "1. "), selection: { start, end } }
    case "blockquote":
      return { text: prefixLines(text, start, end, "> "), selection: { start, end } }
    case "hr": {
      const insert = start === end ? "\n\n---\n\n" : `\n\n---\n\n`
      return {
        text: `${text.slice(0, start)}${insert}${text.slice(end)}`,
        selection: { start: start + insert.length, end: start + insert.length },
      }
    }
    case "paragraph":
    default:
      return { text, selection: { start, end } }
  }
}
