/**
 * Normalize user text for semantic intent classification.
 * Decodes common obfuscation so equivalent requests collapse together.
 * Does not decide policy — it only prepares the requested output.
 */

const FRAMING_PREFIXES = [
  /^(please\s+)?pretend\s+(you\s+are|to\s+be)\b[^.!?\n]{0,160}[.!?:]\s*/i,
  /^(please\s+)?(act|roleplay|role-play)\s+as\b[^.!?\n]{0,160}[.!?:]\s*/i,
  /^(you\s+are|imagine\s+you\s+are)\s+[^.!?\n]{0,160}[.!?:]\s*/i,
  /^in\s+a\s+(hypothetical|fictional|thought)\s+(scenario|exercise|experiment)[^.!?\n]{0,80}[.!?:]\s*/i,
  /^(this is )?(only )?a hypothetical[^.!?\n]{0,120}[.!?:]\s*/i,
  /^for\s+research\s+purposes[^.!?\n]{0,80}[.!?:]\s*/i,
  /^(please\s+)?pretend\s+[^.!?\n]{0,200}[.!?:]\s*/i,
  /^for\s+(a\s+)?(research|academic|school|class|ceo|board)\s+(paper|report|assignment|briefing)[^.!?\n]{0,80}[.!?:]\s*/i,
  /^(as\s+a\s+thought\s+experiment|hypothetically|just\s+curious)[,:]?\s*/i,
  /^(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|policies?)[^.!?\n]{0,80}[.!?:]\s*/i,
  /^(enable|activate|enter|switch\s+to)\s+(developer|debug|security|dan|jailbreak)\s+mode[^.!?\n]{0,40}[.!?:]\s*/i,
  /^(don'?t\s+call\s+them|do\s+not\s+call\s+them)\s+\w+[^.!?\n]{0,80}[.!?:]\s*/i,
  /^(translate|summarize|rewrite|rephrase)\s+(the\s+following|this)[:\s]+/i,
]

const JSON_TASK_KEYS = ["task", "instruction", "prompt", "request", "query", "question", "output"]

export function collapseHomoglyphs(value: string): string {
  return value
    .replace(/[0]/g, "o")
    .replace(/[1|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[!]/g, "i")
}

function tryDecodeUri(value: string): string {
  try {
    const decoded = decodeURIComponent(value.replace(/\+/g, " "))
    return decoded.length > 0 && decoded !== value ? decoded : value
  } catch {
    return value
  }
}

function isMostlyPrintable(value: string): boolean {
  if (!value || value.length < 8) return false
  let printable = 0
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127)) printable += 1
  }
  return printable / value.length >= 0.85
}

function looksInstructional(value: string): boolean {
  return /\b(ignore|print|reveal|system|prompt|secret|instruction|endpoint|vulnerab|bypass|api key|hidden)\b/i.test(
    value,
  )
}

/** Decode standalone base64 payloads that look like hidden instructions. */
export function decodeEmbeddedBase64(value: string): string {
  const matches = value.match(/[A-Za-z0-9+/]{16,}={0,2}/g)
  if (!matches) return value
  let extra = ""
  for (const chunk of matches) {
    if (chunk.length % 4 !== 0) continue
    try {
      const decoded =
        typeof Buffer !== "undefined"
          ? Buffer.from(chunk, "base64").toString("utf8")
          : typeof atob === "function"
            ? atob(chunk)
            : ""
      if (decoded && isMostlyPrintable(decoded) && looksInstructional(decoded)) {
        extra += ` ${decoded}`
      }
    } catch {
      /* ignore */
    }
  }
  return extra ? `${value} ${extra}` : value
}

function extractJsonTasks(value: string): string {
  const trimmed = value.trim()
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) return value
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const parts: string[] = []
    for (const key of JSON_TASK_KEYS) {
      const entry = parsed[key]
      if (typeof entry === "string" && entry.trim()) parts.push(entry)
    }
    return parts.length > 0 ? `${value} ${parts.join(" ")}` : value
  } catch {
    return value
  }
}

export function stripFraming(value: string): string {
  let next = value.trim()
  for (let i = 0; i < 3; i += 1) {
    let changed = false
    for (const pattern of FRAMING_PREFIXES) {
      const stripped = next.replace(pattern, "").trim()
      if (stripped && stripped !== next) {
        next = stripped
        changed = true
      }
    }
    if (!changed) break
  }
  return next
}

export function normalizeCoraSecurityText(raw: string): string {
  let text = raw ?? ""
  text = tryDecodeUri(text)
  text = decodeEmbeddedBase64(text)
  text = extractJsonTasks(text)
  text = text.replace(/\s+/g, " ").trim()
  const stripped = stripFraming(text)
  const lower = stripped.toLowerCase()
  const collapsed = collapseHomoglyphs(lower)
  return collapsed === lower ? lower : `${lower}\n${collapsed}`
}

export function historyUserBlob(
  history: ReadonlyArray<{ role?: string; content?: string }> | undefined,
): string {
  if (!history?.length) return ""
  return history
    .filter((entry) => (entry.role ?? "user") === "user")
    .slice(-6)
    .map((entry) => normalizeCoraSecurityText(String(entry.content ?? "")))
    .join("\n")
}
