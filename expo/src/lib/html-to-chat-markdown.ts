function decodeMessageEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripInlineHtml(input: string): string {
  return decodeMessageEntities(
    input
      .replace(/<strong\b[^>]*>|<\/strong>|<b\b[^>]*>|<\/b>/gi, "**")
      .replace(/<em\b[^>]*>|<\/em>|<i\b[^>]*>|<\/i>/gi, "_")
      .replace(/<code\b[^>]*>|<\/code>/gi, "`")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function listMarkdown(inner: string, ordered: boolean): string {
  let index = 0
  const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => {
    index += 1
    const text = stripInlineHtml(m[1])
    return ordered ? `${index}. ${text}` : `- ${text}`
  })
  return items.length ? `\n\n${items.join("\n")}\n\n` : "\n\n"
}

/** Convert composer / Cora HTML into markdown so lists and headings survive chat render. */
export function htmlToChatMarkdown(html: string): string {
  if (!/<[a-z][\s\S]*>/i.test(html)) return html.trim()
  let t = html
  t = t.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner: string) => listMarkdown(inner, true))
  t = t.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner: string) => listMarkdown(inner, false))
  t = t.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, inner: string) => {
    return `\n\n${"#".repeat(Number(level))} ${stripInlineHtml(inner)}\n\n`
  })
  t = t.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, inner: string) => `${stripInlineHtml(inner)}\n\n`)
  t = t.replace(/<br\s*\/?>/gi, "\n")
  t = t.replace(/<strong\b[^>]*>|<\/strong>|<b\b[^>]*>|<\/b>/gi, "**")
  t = t.replace(/<em\b[^>]*>|<\/em>|<i\b[^>]*>|<\/i>/gi, "_")
  t = t.replace(/<[^>]+>/g, " ")
  t = decodeMessageEntities(t)
  return t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim()
}
