/**
 * Local UX classification only.
 * Server `routeCoraModel` owns provider/model/profile. Do not send this as billing input.
 */

export type CoraTaskDomain =
  | "code"
  | "creative"
  | "reasoning"
  | "teaching"
  | "general"
  | "lightweight"

export type CoraTaskComplexity = "simple" | "medium" | "complex"

export type CoraRoutingMeta = {
  profile?: string
  publicMode?: string
  complexity?: string
  reason?: string
}

const CODE_RE =
  /\b(code|coding|debug|compile|runtime|segfault|pointer|algorithm|leetcode|refactor|typescript|javascript|python|java\b|c\+\+|cpp|matlab|sql|regex|api\s*route|stack\s*trace|function\s*\(|```|npm |git |dockerfile|kubernetes)\b/i

const CREATIVE_RE =
  /\b(design|creative|brainstorm|ideate|story|narrative|metaphor|analogy|poster|slide\s*deck|pitch|branding|visual|ux|ui\s*copy|tagline|poem|essay|rewrite\s*creatively|imagine|what\s*if)\b/i

const REASONING_RE =
  /\b(prove|proof|derive|why\s+does|trade-?off|compare|contrast|critique|analyze|architecture|system\s*design|optimiz|complexity|big-?o|edge\s*cases)\b/i

const TEACHING_RE =
  /\b(explain|teach|tutor|lesson|concept|understand|eli5|walk\s*me\s*through|help\s*me\s*learn|flashcard|study\s*plan|quiz\s*me)\b/i

const LIGHTWEIGHT_RE =
  /\b(what\s+is|define|when\s+is|due\s+date|deadline|grade|schedule|syllabus|office\s*hours|how\s+do\s+i\s+open|navigate|go\s+to)\b/i

const COMPLEX_RE =
  /\b(comprehensive|entire|full\s+exam|multi-?step|architecture|from\s+scratch|end-?to-?end|production|optimize|performance|memory\s+leak|race\s+condition|distributed|concurrent|prove\s+that|formal)\b/i

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function classifyCoraTaskDomain(
  message: string,
  history?: { content?: string }[],
): CoraTaskDomain {
  const blob = [message, ...(history ?? []).slice(-4).map((h) => String(h.content ?? ""))]
    .join("\n")
    .slice(0, 8000)

  if (CODE_RE.test(blob) || /```[\s\S]{20,}/.test(blob)) return "code"
  if (LIGHTWEIGHT_RE.test(message) && wordCount(message) < 25 && !CODE_RE.test(message)) {
    return "lightweight"
  }
  if (CREATIVE_RE.test(blob)) return "creative"
  if (REASONING_RE.test(blob)) return "reasoning"
  if (TEACHING_RE.test(blob)) return "teaching"
  return "general"
}

export function classifyCoraTaskComplexity(
  message: string,
  history?: { content?: string }[],
): CoraTaskComplexity {
  const words = wordCount(message)
  const histLen = (history ?? []).length
  const hasCodeFence = /```/.test(message)
  const complexHits = COMPLEX_RE.test(message) ? 1 : 0

  let score = 0
  if (words < 18 && !hasCodeFence) score -= 2
  if (words > 80 || hasCodeFence) score += 2
  if (words > 160) score += 2
  if (histLen >= 6) score += 1
  if (complexHits) score += 2
  if (/\b(debug|optimize|refactor|architect)\b/i.test(message)) score += 2
  if (/^[?\s]*$/.test(message) || /^(hi|hello|hey|thanks)\b/i.test(message.trim())) score -= 3

  if (score >= 3) return "complex"
  if (score <= -1) return "simple"
  return "medium"
}

/** @deprecated Server owns routing. Always returns undefined. */
export function buildCoraDomainHint(
  _message: string,
  _history?: { content?: string }[],
): CoraTaskDomain | undefined {
  return undefined
}
