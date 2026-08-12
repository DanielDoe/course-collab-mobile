/** Lightweight markdown AST for native React Native rendering (syllabus, policies, notes). */

export type MdInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MdInline[] }
  | { type: "em"; children: MdInline[] }
  | { type: "code"; text: string }
  | { type: "link"; children: MdInline[]; url: string }

export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; inlines: MdInline[] }
  | { type: "paragraph"; inlines: MdInline[] }
  | { type: "bullet_list"; items: MdInline[][] }
  | { type: "ordered_list"; items: MdInline[][] }
  | { type: "blockquote"; inlines: MdInline[] }
  | { type: "code"; text: string }
  | { type: "hr" }

function stripMathDelimiters(source: string): string {
  return source
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => expr.trim())
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => expr.trim())
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => expr.trim())
    .replace(/(?<!\\)\$([^$\n]+?)\$(?!\$)/g, (_, expr) => expr.trim())
}

function normalizeSource(markdown: string): string {
  return stripMathDelimiters(markdown.replace(/\r\n/g, "\n")).trim()
}

function parseInline(source: string): MdInline[] {
  const nodes: MdInline[] = []
  let i = 0

  const pushText = (text: string) => {
    if (!text) return
    const last = nodes[nodes.length - 1]
    if (last?.type === "text") last.text += text
    else nodes.push({ type: "text", text })
  }

  while (i < source.length) {
    if (source.startsWith("**", i)) {
      const end = source.indexOf("**", i + 2)
      if (end > i + 2) {
        nodes.push({ type: "strong", children: parseInline(source.slice(i + 2, end)) })
        i = end + 2
        continue
      }
    }

    if (source[i] === "*" && source[i + 1] !== "*") {
      const end = source.indexOf("*", i + 1)
      if (end > i + 1) {
        nodes.push({ type: "em", children: parseInline(source.slice(i + 1, end)) })
        i = end + 1
        continue
      }
    }

    if (source[i] === "`") {
      const end = source.indexOf("`", i + 1)
      if (end > i + 1) {
        nodes.push({ type: "code", text: source.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }

    if (source[i] === "[") {
      const closeBracket = source.indexOf("]", i + 1)
      const openParen = closeBracket >= 0 ? source.indexOf("(", closeBracket + 1) : -1
      const closeParen = openParen >= 0 ? source.indexOf(")", openParen + 1) : -1
      if (closeBracket > i && openParen === closeBracket + 1 && closeParen > openParen) {
        const label = source.slice(i + 1, closeBracket)
        const url = source.slice(openParen + 1, closeParen).trim()
        nodes.push({ type: "link", children: parseInline(label), url })
        i = closeParen + 1
        continue
      }
    }

    const nextSpecial = (() => {
      const markers = ["**", "*", "`", "["]
      const indices = markers
        .map((marker) => source.indexOf(marker, i + 1))
        .filter((index) => index >= 0)
      return indices.length ? Math.min(...indices) : -1
    })()

    if (nextSpecial === -1) {
      pushText(source.slice(i))
      break
    }

    pushText(source.slice(i, nextSpecial))
    i = nextSpecial
  }

  return nodes.length ? nodes : [{ type: "text", text: "" }]
}

function isBulletLine(line: string): boolean {
  return /^(\s*[-*+]\s+)/.test(line)
}

function isOrderedLine(line: string): boolean {
  return /^\s*\d+[.)]\s+/.test(line)
}

function bulletContent(line: string): string {
  return line.replace(/^\s*[-*+]\s+/, "").trim()
}

function orderedContent(line: string): string {
  return line.replace(/^\s*\d+[.)]\s+/, "").trim()
}

function headingLevel(line: string): 1 | 2 | 3 | 4 | 0 {
  const match = /^(#{1,4})\s+(.+)$/.exec(line.trim())
  if (!match) return 0
  return match[1].length as 1 | 2 | 3 | 4
}

function headingText(line: string): string {
  return line.trim().replace(/^#{1,4}\s+/, "")
}

function isHr(line: string): boolean {
  return /^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())
}

export function parseNativeMarkdown(markdown: string): MdBlock[] {
  const source = normalizeSource(markdown)
  if (!source) return []

  const lines = source.split("\n")
  const blocks: MdBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith("```")) {
      const fence = trimmed
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push({ type: "code", text: codeLines.join("\n") })
      continue
    }

    const level = headingLevel(line)
    if (level > 0) {
      blocks.push({ type: "heading", level: level as 1 | 2 | 3 | 4, inlines: parseInline(headingText(line)) })
      index += 1
      continue
    }

    if (isHr(trimmed)) {
      blocks.push({ type: "hr" })
      index += 1
      continue
    }

    if (isBulletLine(line)) {
      const items: MdInline[][] = []
      while (index < lines.length && isBulletLine(lines[index])) {
        items.push(parseInline(bulletContent(lines[index])))
        index += 1
      }
      blocks.push({ type: "bullet_list", items })
      continue
    }

    if (isOrderedLine(line)) {
      const items: MdInline[][] = []
      while (index < lines.length && isOrderedLine(lines[index])) {
        items.push(parseInline(orderedContent(lines[index])))
        index += 1
      }
      blocks.push({ type: "ordered_list", items })
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""))
        index += 1
      }
      blocks.push({ type: "blockquote", inlines: parseInline(quoteLines.join("\n")) })
      continue
    }

    const paragraphLines: string[] = [trimmed]
    index += 1
    while (index < lines.length) {
      const next = lines[index]
      const nextTrimmed = next.trim()
      if (
        !nextTrimmed ||
        headingLevel(next) > 0 ||
        isHr(nextTrimmed) ||
        isBulletLine(next) ||
        isOrderedLine(next) ||
        nextTrimmed.startsWith("```") ||
        /^>\s?/.test(nextTrimmed)
      ) {
        break
      }
      paragraphLines.push(nextTrimmed)
      index += 1
    }
    blocks.push({ type: "paragraph", inlines: parseInline(paragraphLines.join("\n")) })
  }

  return blocks
}
