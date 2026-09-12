/**
 * Display-only formatting for bank code fences that ship as dense one-liners.
 * Does not change grading source — only what students see in the quiz WebView.
 */

/** Space common C/C++/Java operators for readability. */
function spaceOperators(expr: string): string {
  return expr
    .replace(/\s*<<\s*/g, " << ")
    .replace(/\s*>>\s*/g, " >> ")
    .replace(/\s*->\s*/g, "->")
    .replace(/\s*([=+\-*/%<>!&|^])=\s*/g, " $1= ")
    .replace(/([^\s=<>!&|^+\-*/%])(=)([^=])/g, "$1 $2 $3")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/;\s*$/, ";")
}

/**
 * Expand a single-line function/method body onto multiple lines when the whole
 * signature + brace body sits on one line.
 */
export function formatDenseCodeLine(line: string): string {
  const match = line.match(/^(\s*)(.+?\))\s*\{\s*(.+?)\s*\}\s*$/)
  if (!match) return line

  const indent = match[1]
  const signature = match[2].replace(/\s+/g, " ").trim()
  // Skip empty bodies and already-trivial braces
  const rawBody = match[3].trim()
  if (!rawBody || rawBody === ";") return line

  // Avoid reformatting initializer lists / lambdas that aren't statement bodies
  if (/^\{/.test(rawBody)) return line

  const body = spaceOperators(rawBody)
  return `${indent}${signature} {\n${indent}  ${body}\n${indent}}`
}

export function formatDenseCodeSource(source: string): string {
  return source
    .split("\n")
    .map((line) => formatDenseCodeLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
}

/** Pretty-print fenced code blocks for quiz / bank WebView display. */
export function formatDenseCodeFencesForDisplay(markdown: string): string {
  if (!markdown?.includes("```")) return markdown
  return markdown.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_m, lang: string, body: string) => {
    const formatted = formatDenseCodeSource(body.replace(/\s+$/, ""))
    const info = String(lang ?? "").trim()
    return "```" + info + "\n" + formatted + "\n```"
  })
}
