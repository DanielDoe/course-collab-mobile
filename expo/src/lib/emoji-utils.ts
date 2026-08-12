/** Extract the last emoji grapheme from keyboard input (supports ZWJ sequences). */
export function extractLastEmoji(text: string): string | null {
  if (!text) return null

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    const segments = [...segmenter.segment(text)].map((part) => part.segment)
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const segment = segments[index]
      if (/\p{Extended_Pictographic}/u.test(segment)) return segment
    }
    return null
  }

  const chars = [...text]
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    if (/\p{Extended_Pictographic}/u.test(chars[index])) return chars[index]
  }
  return null
}

/** Normalize emoji before sending to the messages API (NFC + trim). */
export function normalizeReactionEmoji(raw: string): string {
  return raw.normalize("NFC").trim()
}
