import { repairLatexDamagedByJsonEscapes } from "./classroom-submission"

const LATEX_COMMAND_RE =
  /\\(?:frac|tfrac|cdot|cdotp|times|mathrm|text|mathbf|mathit|Omega|mu|alpha|beta|sqrt|left|right|boxed|Rightarrow|pm|mp|leq|geq|neq|approx|sum|int|infty|partial|nabla|vec|hat|bar|dot)\b/

const SUB_SUP_RE = /[_^]\{?[A-Za-z0-9+-]+\}?/
const MATHY_SUBSCRIPT_RE = /[A-Za-z]_[A-Za-z0-9]+/

/** Normalize LaTeX delimiters into remark-math / marked-friendly $ / $$ form. */
export function normalizeReportMathDelimiters(input: string): string {
  let t = input.replace(/\\n/g, "\n")
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr: string) => `\n$$\n${expr.trim()}\n$$\n`)
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr: string) => `$${expr.trim()}$`)
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr: string) => `\n$$\n${String(expr).trim()}\n$$\n`)
  return t.replace(/\n{3,}/g, "\n\n")
}

function looksLikeLatex(expr: string): boolean {
  return (
    LATEX_COMMAND_RE.test(expr) ||
    (SUB_SUP_RE.test(expr) && MATHY_SUBSCRIPT_RE.test(expr)) ||
    /\^\{[^}]+\}/.test(expr)
  )
}

function fixScientificNotationShorthand(expr: string): string {
  return expr
    .replace(/(\d+(?:\.\d+)?)\s*x\s*10(\^\{[^}]+\})/gi, "$1\\times 10$2")
    .replace(/(\d+(?:\.\d+)?)\s*x\s*10\^([+-]?\d+)/gi, "$1\\times 10^{$2}")
}

function protectMathSegments(text: string): { text: string; segments: string[] } {
  const segments: string[] = []
  const protectedText = text.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (m) => {
    segments.push(m)
    return `\x00MATH${segments.length - 1}\x00`
  })
  return { text: protectedText, segments }
}

function restoreMathSegments(text: string, segments: string[]): string {
  return text.replace(/\x00MATH(\d+)\x00/g, (_, i) => segments[Number(i)] ?? "")
}

function wrapAsInlineMath(expr: string): string {
  const fixed = fixScientificNotationShorthand(expr.trim())
  return looksLikeLatex(fixed) ? `$${fixed}$` : expr
}

const EQUATION_RE = new RegExp(
  `(?<![$\\\\])([A-Za-z][A-Za-z0-9_]*\\s*=\\s*(?:(?:\\([^)]*\\)|\\\\[a-zA-Z]+(?:\\{[^{}]*\\})*|[A-Za-z0-9_^{}\\s+\\-*/])+))`,
  "g",
)

function wrapBareLatexInPlainText(text: string): string {
  const { text: protectedText, segments } = protectMathSegments(text)
  let t = protectedText

  t = t.replace(EQUATION_RE, (match) => wrapAsInlineMath(match))

  t = t.replace(/"([^"]+)"/g, (_, quoted: string) => {
    if (quoted.includes("$")) return `"${quoted}"`
    const inner = quoted.replace(EQUATION_RE, (match) => wrapAsInlineMath(match))
    const wrapped = inner.includes("$") ? inner : wrapAsInlineMath(quoted)
    return wrapped === quoted ? `"${quoted}"` : `"${wrapped}"`
  })

  t = t.replace(/(\S)\$\$/g, "$1\n$$").replace(/\$\$(\S)/g, "$$\n$1")

  return restoreMathSegments(t, segments)
}

/**
 * Normalize AI / instructor feedback for markdown + KaTeX WebView rendering.
 * Mirrors web `normalizeAiFeedbackMath` (remark-math pipeline).
 */
export function normalizeAiFeedbackMath(input: string): string {
  if (!input?.trim()) return input

  let t = normalizeReportMathDelimiters(input.replace(/\\n/g, "\n"))

  // "1) item" → markdown ordered list
  t = t.replace(/^(\d+)\)\s+/gm, "$1. ")

  t = t.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr: string) => `\n$$\n${expr.trim()}\n$$\n`)

  t = t.replace(/^[ \t]+(\$\$)/gm, "$1")
  t = t.replace(/^[ \t]{1,3}(?=[A-Za-z"'(])/gm, "")

  t = wrapBareLatexInPlainText(t)

  return t.trim()
}

export function hasReportMathContent(input: string): boolean {
  return (
    /\\\([\s\S]*?\\\)/.test(input) ||
    /\\\[[\s\S]*?\\\]/.test(input) ||
    /\$[^$\n]+\$/.test(input) ||
    /\$\$[\s\S]*?\$\$/.test(input) ||
    LATEX_COMMAND_RE.test(input) ||
    (SUB_SUP_RE.test(input) && MATHY_SUBSCRIPT_RE.test(input))
  )
}

/** True when markdown needs WebView rendering (math, lists, HTML, formatting). */
export function needsMarkdownRichRender(input: string): boolean {
  const t = input.trim()
  if (!t) return false
  if (hasReportMathContent(t)) return true
  if (/^[-*+]\s/m.test(t) || /^\d+[.)]\s/m.test(t)) return true
  if (/\*\*|__|`/.test(t)) return true
  if (/^#{1,6}\s/m.test(t)) return true
  if (/^\|/.test(t)) return true
  if (/<[a-z][\s\S]*>/i.test(t)) return true
  return false
}

/** Prepare prose / AI feedback / answer copy for `buildMarkdownHtml`. */
export function prepareAssessmentReportMarkdown(input: string): string {
  if (!input?.trim()) return ""
  const repaired = repairLatexDamagedByJsonEscapes(input)
  return normalizeAiFeedbackMath(repaired)
}

/** Join list items into a markdown bullet list, then normalize math. */
export function prepareAssessmentReportMarkdownList(items: string[]): string {
  const body = items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (/^[-*+]\s/.test(item) || /^\d+[.)]\s/.test(item) ? item : `- ${item}`))
    .join("\n\n")
  return prepareAssessmentReportMarkdown(body)
}
