/**
 * Question banks often encode line breaks as the two-character sequence `\n`.
 * Blindly expanding every `\n` destroys questions *about* escape sequences
 * (e.g. "Escape sequence `\n` moves…") and C string literals (`"\n"`).
 * Structural `\n` (fences, paragraphs) must still become real newlines.
 */

const STASH_MARK = "\uE000"
const QUOTE_MARK = "\uE001"

/** Token-like programming escapes: whitespace/punct around `\n`, `\t`, `\r`, etc. */
const PROGRAMMING_ESCAPE_TOKEN =
  /(^|[\s([{,=:])(\\[nrt0abfv'"\\])(?=[\s)\]},.;:!?]|$)/g

function stashWith(input: string, pattern: RegExp, mark: string, parts: string[]): string {
  return input.replace(pattern, (m) => {
    const id = parts.length
    parts.push(m)
    return `${mark}${id}${mark}`
  })
}

function restoreWith(text: string, mark: string, parts: string[]): string {
  return text.replace(new RegExp(`${mark}(\\d+)${mark}`, "g"), (_m, id: string) => {
    return parts[Number(id)] ?? ""
  })
}

/** Expand `\\n` inside a chunk while keeping quoted `"\\n"` / `'\\n'` intact. */
function expandNewlinesPreservingQuotes(chunk: string): string {
  const parts: string[] = []
  let text = stashWith(chunk, /"(?:\\.|[^"\\])*"/g, QUOTE_MARK, parts)
  text = stashWith(text, /'(?:\\.|[^'\\])*'/g, QUOTE_MARK, parts)
  text = text.replace(/\\n/g, "\n")
  return restoreWith(text, QUOTE_MARK, parts)
}

/**
 * Run `transform` while keeping mid-sentence escape tokens (like `\n`) intact.
 * Encoded line breaks without surrounding token boundaries still expand via transform.
 */
export function withProtectedProgrammingEscapes(
  input: string,
  transform: (text: string) => string,
): string {
  if (!input) return input
  const parts: string[] = []
  const protectedText = stashWith(input, PROGRAMMING_ESCAPE_TOKEN, STASH_MARK, parts)
  return restoreWith(transform(protectedText), STASH_MARK, parts)
}

/**
 * Expand bank-encoded `\\n` line breaks for markdown fences / paragraphs.
 * Preserves:
 * - inline code `` `\n` `` (escape-sequence questions)
 * - quoted `"\n"` / `'\n'` (source string literals inside snippets)
 * - mid-sentence escape tokens outside code
 */
export function expandEncodedNewlines(input: string): string {
  if (!input) return input
  const parts: string[] = []
  const stash = (m: string) => {
    const id = parts.length
    parts.push(m)
    return `${STASH_MARK}${id}${STASH_MARK}`
  }

  // 1) Fenced blocks first (often one line: ```cpp\ncode\n```). Expand structural \n inside.
  let text = input.replace(/```[\s\S]*?```/g, (fence) => stash(expandNewlinesPreservingQuotes(fence)))

  // 2) Inline code — educational `\n` must not become a real newline.
  text = text.replace(/`[^`]*`/g, (m) => stash(m))

  // 3) Bare mid-sentence escape tokens (no backticks).
  text = text.replace(PROGRAMMING_ESCAPE_TOKEN, (_m, pre: string, esc: string) => `${pre}${stash(esc)}`)

  // 4) Remaining encoded breaks (paragraphs / "Find the bug:\n```…").
  text = text.replace(/\\n/g, "\n")

  return restoreWith(text, STASH_MARK, parts)
}
