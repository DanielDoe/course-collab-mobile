import { API_BASE_URL } from "../constants"

export type QuestionMedia = {
  media_enabled?: boolean
  media_url?: string
  media_type?: string
  media_caption?: string
  media_alt_text?: string
  media_allow_zoom?: boolean
  media_placement?: string
}

export type ClassroomQuestionConfig = {
  question_text?: string
  question_type?: string
  question_media?: QuestionMedia
  expected_answer?: string
  points_hint?: string | number
  solution_upload_config?: {
    title?: string
    submission_instructions?: string
    max_files?: number
    require_solution_upload?: boolean
    grading_type?: string
  }
}

export type SolutionUploadAttachment = {
  url: string
  name: string
  mime: string
  uploaded_at?: string
}

export type SolutionUploadsMap = Record<string, SolutionUploadAttachment>

export type SolutionSubmissionAnswer = {
  version: 1
  submission_status?: "draft" | "submitted"
  submission_mode?: "upload" | "photo" | "workspace"
  solution_uploads?: SolutionUploadsMap
  written_notes?: string
}

const ROOT_KEY = "_"

const MEDIA_URL_PLACEHOLDERS = ["UPLOAD_CIRCUIT_IMAGE_URL_HERE", "UPLOAD_FIGURE_URL_HERE"]

/** Strip `/public` prefix and normalize absolute upload paths to site-relative form. */
export function normalizeQuestionMediaPath(url: string): string {
  const trimmed = (url || "").trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("/public/")) {
    return trimmed.replace(/^\/public/, "") || trimmed
  }
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed)
      const path = `${parsed.pathname}${parsed.search}`
      if (path.startsWith("/uploads/") || path.startsWith("/ece2202/")) {
        return path
      }
    }
  } catch {
    /* keep original */
  }
  return trimmed
}

/** Same allowlist as web `question-media-proxy` — campus networks often block direct Blob CDN. */
export function isAllowedQuestionMediaUrl(url: string): boolean {
  const normalized = normalizeQuestionMediaPath(url)
  if (!normalized) return false
  if (normalized.startsWith("/uploads/")) return true
  if (normalized.startsWith("/ece2202/")) return true
  if (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(normalized)) {
    return true
  }
  if (/blob\.vercel-storage\.com\/question-media\//i.test(normalized)) {
    return true
  }
  return false
}

export function isUsableQuestionMediaUrl(url: string | null | undefined): boolean {
  const u = (url || "").trim()
  if (!u) return false
  if (MEDIA_URL_PLACEHOLDERS.some((p) => u.includes(p))) return false
  return true
}

function questionMediaCacheToken(url: string | null | undefined): string | undefined {
  const trimmed = (url || "").trim()
  if (!trimmed) return undefined
  const match = trimmed.match(/\/(\d{13})_[^/?#]+/)
  return match?.[1]
}

/**
 * Resolve a question diagram URL for React Native `Image` / `WebView`.
 * Allowed paths are proxied through `/api/question-media` (matches web app).
 */
export function resolveQuestionMediaUrl(url?: string | null): string {
  const trimmed = normalizeQuestionMediaPath((url ?? "").trim())
  if (!trimmed) return ""

  if (trimmed.includes("/api/question-media?")) {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
    return `${API_BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`
  }

  if (isAllowedQuestionMediaUrl(trimmed)) {
    const base = `${API_BASE_URL}/api/question-media?url=${encodeURIComponent(trimmed)}`
    const v = questionMediaCacheToken(trimmed)
    return v != null && String(v) !== "" ? `${base}&v=${encodeURIComponent(String(v))}` : base
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `${API_BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`
}

export function hasActiveQuestionMedia(media?: QuestionMedia | null): boolean {
  const url = (media?.media_url ?? "").trim()
  if (!isUsableQuestionMediaUrl(url)) return false
  if (media?.media_enabled === false) return false
  return true
}

export function normalizeQuestionMedia(raw: unknown): QuestionMedia | null {
  if (raw == null || raw === "") return null

  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/uploads/") ||
      trimmed.startsWith("/ece2202/")
    ) {
      return { media_enabled: true, media_url: trimmed, media_type: "image" }
    }
    try {
      return normalizeQuestionMedia(JSON.parse(trimmed) as unknown)
    } catch {
      return null
    }
  }

  if (typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const media_url = String(o.media_url ?? o.mediaUrl ?? o.url ?? "").trim()
  const media: QuestionMedia = {
    media_enabled: o.media_enabled !== false,
    media_url: media_url || undefined,
    media_type: String(o.media_type ?? o.mediaType ?? "image"),
    media_caption:
      typeof o.media_caption === "string"
        ? o.media_caption
        : typeof o.mediaCaption === "string"
          ? o.mediaCaption
          : undefined,
    media_alt_text:
      typeof o.media_alt_text === "string"
        ? o.media_alt_text
        : typeof o.mediaAltText === "string"
          ? o.mediaAltText
          : undefined,
    media_allow_zoom: o.media_allow_zoom !== false,
    media_placement: typeof o.media_placement === "string" ? o.media_placement : undefined,
  }

  return hasActiveQuestionMedia(media) ? media : null
}

export function parseQuestionMedia(raw: unknown): QuestionMedia | null {
  return normalizeQuestionMedia(raw)
}

/** Normalize diagram fields returned by `/api/cora/question-import`. */
export function resolveImportedQuestionMedia(problem: {
  questionMedia?: unknown
  question_media?: unknown
  mediaUrl?: string | null
}): QuestionMedia | null {
  const parsed =
    normalizeQuestionMedia(problem.questionMedia) ?? normalizeQuestionMedia(problem.question_media)
  if (hasActiveQuestionMedia(parsed)) return parsed

  const url = (problem.mediaUrl ?? "").trim()
  if (!url) return null

  return normalizeQuestionMedia({ media_enabled: true, media_url: url, media_type: "image" })
}

export function parseQuestionConfig(raw: unknown): ClassroomQuestionConfig | null {
  if (raw == null || raw === "") return null
  try {
    const obj = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw
    if (!obj || typeof obj !== "object") return null
    return obj as ClassroomQuestionConfig
  } catch {
    return null
  }
}

/** Assignment rows may expose config on either field depending on API surface. */
export function resolveAssignmentQuestionConfig(row: {
  question_config?: unknown
  assignment_question_config?: unknown
}): ClassroomQuestionConfig | null {
  return (
    parseQuestionConfig(row.question_config) ?? parseQuestionConfig(row.assignment_question_config)
  )
}

export function parseSubmissionAnswerForReview(raw: unknown): SolutionSubmissionAnswer {
  if (raw == null || raw === "") return parseSolutionAnswer("{}")
  try {
    const obj =
      typeof raw === "string"
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>)
    if (!obj || typeof obj !== "object") return parseSolutionAnswer("{}")

    if (
      !obj.solution_uploads &&
      typeof obj.answer === "string" &&
      obj.answer.trim().startsWith("{")
    ) {
      return parseSubmissionAnswerForReview(obj.answer)
    }

    const uploads =
      obj.solution_uploads && typeof obj.solution_uploads === "object"
        ? (obj.solution_uploads as SolutionUploadsMap)
        : {}

    const mode = obj.submission_mode
    const submission_mode =
      mode === "upload" || mode === "photo" || mode === "workspace" ? mode : undefined

    return {
      version: 1,
      submission_status:
        obj.submission_status === "draft" || obj.submission_status === "submitted"
          ? obj.submission_status
          : "submitted",
      submission_mode: submission_mode ?? (obj.workspace ? "workspace" : "upload"),
      solution_uploads: uploads,
      written_notes: typeof obj.written_notes === "string" ? obj.written_notes : ""}
  } catch {
    return parseSolutionAnswer(typeof raw === "string" ? raw : "{}")
  }
}

export function parseSolutionAnswer(raw: string): SolutionSubmissionAnswer {
  try {
    const parsed = JSON.parse(raw || "{}") as SolutionSubmissionAnswer
    return {
      version: 1,
      submission_status: parsed.submission_status ?? "draft",
      submission_mode: parsed.submission_mode ?? "upload",
      solution_uploads: parsed.solution_uploads ?? {},
      written_notes: parsed.written_notes ?? ""}
  } catch {
    return { version: 1, submission_status: "draft", submission_mode: "upload", solution_uploads: {} }
  }
}

export function emptySolutionAnswer(): string {
  return JSON.stringify({
    version: 1,
    submission_status: "draft",
    submission_mode: "upload",
    solution_uploads: {},
    written_notes: ""} satisfies SolutionSubmissionAnswer)
}

export function solutionPartKey(index: number): string {
  return index === 0 ? ROOT_KEY : `f${index}`
}

export function listSolutionFiles(uploads?: SolutionUploadsMap): SolutionUploadAttachment[] {
  if (!uploads) return []
  return Object.entries(uploads)
    .filter(([, att]) => att?.url?.trim())
    .sort(([a], [b]) => {
      const order = (k: string) => (k === ROOT_KEY ? 0 : Number.parseInt(k.replace(/^f/, ""), 10) || 999)
      return order(a) - order(b)
    })
    .map(([, att]) => att)
}

export function solutionFileCount(uploads?: SolutionUploadsMap): number {
  return listSolutionFiles(uploads).length
}

export function hasRequiredSolutionUpload(
  answer: SolutionSubmissionAnswer,
  requireUpload = true,
): boolean {
  if (!requireUpload) return true
  return solutionFileCount(answer.solution_uploads) >= 1
}

export function compactSolutionForSubmit(answer: SolutionSubmissionAnswer): string {
  const uploads = answer.solution_uploads ?? {}
  const payload: SolutionSubmissionAnswer = {
    version: 1,
    submission_status: "submitted",
    submission_mode: answer.submission_mode ?? "upload",
    solution_uploads: uploads}
  const notes = (answer.written_notes ?? "").trim()
  if (notes) payload.written_notes = notes
  return JSON.stringify(payload)
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Repair LaTeX corrupted by JSON/API escaping (e.g. `\t` eating `\text`). */
export function repairLatexDamagedByJsonEscapes(input: string): string {
  if (!input) return input
  return input
    .replace(/\text\{/g, "\\text{")
    .replace(/\text(?=[A-Za-z])/g, "\\text")
    .replace(/\frac\{/g, "\\frac{")
    .replace(/\boxed\{/g, "\\boxed{")
    .replace(/\right\b/g, "\\right")
    .replace(/\times\b/g, "\\times")
    .replace(/\tau\b/g, "\\tau")
    .replace(/\u0003/g, "")
    .replace(/\\text\{\s*k\}A/g, "\\text{k}\\Omega")
    .replace(/\\text\{\s*m\}A/g, "\\text{mA}")
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Convert HTML line breaks (raw or entity-encoded) to newlines before KaTeX rendering. */
export function normalizeHtmlLineBreaks(input: string): string {
  if (!input) return input
  return input
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n\n")
    .replace(/<\/li>\s*<li[^>]*>/gi, "\n")
}

function extractKatexAnnotation(html: string): string {
  const match = html.match(/<annotation[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i)
  return match?.[1]?.trim() ?? ""
}

/** Strip HTML wrappers from quiz/bank copy while preserving LaTeX delimiters. */
export function stripQuestionHtml(input: string): string {
  if (!input || !/<[a-z][\s\S]*>/i.test(input)) return input

  let t = input

  t = t.replace(
    /<span[^>]*class=["'][^"']*katex-display[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    (block) => {
      const latex = extractKatexAnnotation(block)
      return latex ? `\n$$${latex}$$\n` : " "
    },
  )
  t = t.replace(/<span[^>]*class=["'][^"']*katex[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, (block) => {
    const latex = extractKatexAnnotation(block)
    return latex ? `$${latex}$` : " "
  })

  t = t.replace(/<br\s*\/?>/gi, "\n")
  t = t.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
  t = t.replace(/<\/div>\s*<div[^>]*>/gi, "\n\n")
  t = t.replace(/<\/li>\s*<li[^>]*>/gi, "\n")
  t = t.replace(/<[^>]+>/g, "")
  t = decodeHtmlEntities(t)
  return t.replace(/\n{3}/g, "\n\n").trim()
}

/** Normalize question copy for KaTeX WebView rendering (quiz, classroom, preview). */
export function normalizeQuestionContentForRender(text: string): string {
  const trimmed = text.trim()
  const withBreaks = normalizeHtmlLineBreaks(trimmed)
  return wrapBareMathSymbols(
    normalizeMathDelimiters(repairLatexDamagedByJsonEscapes(stripQuestionHtml(withBreaks))),
  )
}

/** Normalize \\[ \\] and \\( \\) delimiters to $$ and $ for parsing. */
export function normalizeMathDelimiters(input: string): string {
  let t = input.replace(/\\n/g, "\n")
  // Display math — tolerate a missing backslash on the closing bracket (\[ ... ])
  t = t.replace(/\\\[([\s\S]*?)(?:\\\]|\](?!\\))/g, (_, expr: string) => {
    const cleaned = expr.trim().replace(/,\s*$/, "")
    return `$$${cleaned}$$`
  })
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr: string) => `$${expr.trim()}$`)
  // Standalone [ ... ] lines that contain LaTeX commands (common bank import typo)
  t = t.replace(/^\[\s*([\s\S]*?\\[\s\S]*?)\s*\]\s*$/gm, (_, expr: string) => {
    const cleaned = expr.trim().replace(/,\s*$/, "")
    return `$$${cleaned}$$`
  })
  return t
}

function protectMathSegments(text: string): { text: string; segments: string[] } {
  const segments: string[] = []
  const protectedText = text.replace(/(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+?\$)/g, (m) => {
    segments.push(m)
    return `\x00MATH${segments.length - 1}\x00`
  })
  return { text: protectedText, segments }
}

function restoreMathSegments(text: string, segments: string[]): string {
  return text.replace(/\x00MATH(\d+)\x00/g, (_, i) => segments[Number(i)] ?? "")
}

/**
 * Wrap plain engineering symbols (Z_C, I_s, i_s(t)) in inline math delimiters.
 * Instructions often omit LaTeX delimiters unlike question stems.
 */
export function wrapBareMathSymbols(input: string): string {
  const { text: protectedText, segments } = protectMathSegments(input)
  let t = protectedText

  // Function-of-time: i_s(t)
  t = t.replace(/\b([A-Za-z])_([A-Za-z0-9]+)\(([^)]+)\)/g, (_, base, sub, args) => {
    return `$${base}_{${sub}}(${args})$`
  })

  // Subscripts: Z_C, V_out, I_s
  t = t.replace(/\b([A-Za-z])_([A-Za-z0-9]+)\b/g, (_, base, sub) => `$${base}_{${sub}}$`)

  // Bare LaTeX commands outside delimiters: \omega, \Omega, \text{V}, \mu
  t = t.replace(
    /\\(omega|Omega|mu|alpha|beta|theta|phi|pi|tau|cdot|times|frac\{[^}]+\}\{[^}]+\}|text\{[^}]+\})(?![A-Za-z])/g,
    (cmd) => `$\\${cmd}$`,
  )

  // Unicode omega in plain copy
  t = t.replace(/([A-Za-z0-9])\s*=\s*ω/g, "$1 = $\\omega$")
  t = t.replace(/ω/g, "$\\omega$")

  return restoreMathSegments(t, segments)
}

function prepareQuestionText(text: string): string {
  return normalizeQuestionContentForRender(text)
}

/** True when copy needs KaTeX/HTML WebView — plain strings render natively for speed. */
export function needsQuestionRichRender(text: string): boolean {
  if (!text?.trim()) return false
  const t = text.trim()
  if (/<span[^>]*class=["'][^"']*katex/i.test(t)) return true
  if (/<(?:pre|code|img|table|ul|ol|h[1-6]|br)\b/i.test(t)) return true
  if (/```/.test(t)) return true
  if (/\$\$[\s\S]*?\$\$/.test(t)) return true
  if (/\\\[[\s\S]*?\\\]/.test(t)) return true
  if (/\\\([\s\S]*?\\\)/.test(t)) return true
  if (/\$[^$\n]+\$/.test(t)) return true
  if (/\\(?:frac|omega|Omega|text|cdot|times|sqrt|sum|int|alpha|beta|theta|mu|pi)\b/.test(t)) return true
  if (/\b[A-Za-z]_[A-Za-z0-9]+\b/.test(t)) return true
  if (/ω/.test(t)) return true
  if (/<[a-z][\s\S]*>/i.test(t)) {
    const stripped = stripQuestionHtml(t)
    if (stripped !== t) return needsQuestionRichRender(stripped)
  }
  return false
}

/** Plain-text fallback for question stems and MCQ options. */
export function questionPlainText(text: string): string {
  return stripQuestionHtml(normalizeHtmlLineBreaks(text.trim())).replace(/\n{3,}/g, "\n\n").trim()
}

/** Collapsed list preview — readable plain text without LaTeX delimiters. */
export function questionCardPreviewText(text: string): string {
  let t = questionPlainText(text)
  if (!t) return ""
  t = t.replace(/\$\$[\s\S]*?\$\$/g, " ")
  t = t.replace(/\\\[[\s\S]*?\\\]/g, " ")
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) =>
    inner.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1").replace(/\\[a-zA-Z]+/g, " ").trim(),
  )
  t = t.replace(/\$([^$\n]+)\$/g, (_, inner: string) =>
    inner.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1").replace(/\\[a-zA-Z]+/g, " ").trim(),
  )
  return t.replace(/\s+/g, " ").trim()
}

function captionFingerprint(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/** Drop a leading figure caption from question copy when the media tile already shows it. */
export function stripDuplicateMediaCaptionFromQuestion(
  text: string,
  media?: QuestionMedia | null,
): string {
  if (!text.trim() || !hasActiveQuestionMedia(media)) return text
  const caption = (media?.media_caption ?? media?.media_alt_text ?? "").trim()
  if (!caption) return text

  const captionKey = captionFingerprint(caption)
  if (!captionKey) return text

  const parts = text.trim().split(/\n\s*\n/)
  const first = parts[0]?.trim() ?? ""
  const firstKey = captionFingerprint(stripQuestionHtml(first))
  if (!firstKey) return text

  const matches =
    firstKey === captionKey ||
    firstKey.includes(captionKey) ||
    captionKey.includes(firstKey) ||
    (firstKey.startsWith("figure") &&
      captionKey.startsWith("figure") &&
      firstKey.slice(0, 28) === captionKey.slice(0, 28))

  if (!matches) return text

  const rest = parts.slice(1).join("\n\n").trim()
  return rest || text
}

export type QuestionContentSegment =
  | { kind: "text"; content: string }
  | { kind: "math"; content: string; display: boolean }

/** Split question copy into text and math segments without breaking display blocks. */
export function parseQuestionSegments(text: string): QuestionContentSegment[] {
  const normalized = prepareQuestionText(text)
  if (!normalized) return []

  const segments: QuestionContentSegment[] = []
  const regex = /(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+?\$)/g
  let lastIndex = 0

  for (const match of normalized.matchAll(regex)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ kind: "text", content: normalized.slice(lastIndex, index) })
    }
    const raw = match[0]
    if (raw.startsWith("$$")) {
      segments.push({ kind: "math", content: raw.slice(2, -2).trim(), display: true })
    } else {
      segments.push({ kind: "math", content: raw.slice(1, -1).trim(), display: false })
    }
    lastIndex = index + raw.length
  }

  if (lastIndex < normalized.length) {
    segments.push({ kind: "text", content: normalized.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: "text", content: normalized }]
}

export type QuestionRenderBlock =
  | { type: "paragraph"; parts: Array<{ t: "text"; v: string } | { t: "math"; v: string }> }
  | { type: "display"; v: string }
  | { type: "heading"; level: number; v: string }

/** Group parsed segments into paragraph flows + display equations (avoids line break per inline symbol). */
export function buildQuestionBlocks(text: string): QuestionRenderBlock[] {
  const segments = parseQuestionSegments(text)
  const blocks: QuestionRenderBlock[] = []
  let paragraph: QuestionRenderBlock | null = null

  const flushParagraph = () => {
    if (paragraph?.type === "paragraph" && paragraph.parts.length > 0) {
      blocks.push(paragraph)
    }
    paragraph = null
  }

  const appendToParagraph = (part: { t: "text"; v: string } | { t: "math"; v: string }) => {
    if (!paragraph) paragraph = { type: "paragraph", parts: [] }
    const parts = (paragraph as Extract<QuestionRenderBlock, { type: "paragraph" }>).parts
    const last = parts[parts.length - 1]
    if (part.t === "text" && last?.t === "text") {
      last.v = `${last.v} ${part.v}`.replace(/\s+/g, " ").trim()
      return
    }
    parts.push(part)
  }

  for (const seg of segments) {
    if (seg.kind === "math" && seg.display) {
      flushParagraph()
      blocks.push({ type: "display", v: seg.content })
      continue
    }

    if (seg.kind === "math") {
      appendToParagraph({ t: "math", v: seg.content })
      continue
    }

    const chunks = seg.content.split(/\n\n+/)
    chunks.forEach((chunk, index) => {
      if (index > 0) flushParagraph()
      const lines = chunk
        .split(/\n/)
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
      if (lines.length === 0) return

      lines.forEach((line, lineIndex) => {
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
        if (headingMatch) {
          flushParagraph()
          blocks.push({
            type: "heading",
            level: headingMatch[1].length,
            v: headingMatch[2].trim()})
          return
        }
        const piece = lineIndex > 0 ? `\n${line}` : line
        appendToParagraph({ t: "text", v: piece })
      })
    })
  }

  flushParagraph()
  return blocks.map((block) => {
    if (block.type !== "paragraph") return block
    return { ...block, parts: ensureInlinePartSpacing(block.parts) }
  })
}

type InlinePart = { t: "text"; v: string } | { t: "math"; v: string }

/** Keep a thin space between prose and adjacent inline math when source copy omits it. */
function ensureInlinePartSpacing(parts: InlinePart[]): InlinePart[] {
  if (parts.length === 0) return parts

  const spaced: InlinePart[] = [{ ...parts[0] }]

  for (let index = 1; index < parts.length; index += 1) {
    const part = parts[index]
    const prev = spaced[spaced.length - 1]

    if (part.t === "math" && prev.t === "text" && prev.v.length > 0 && !/\s$/.test(prev.v)) {
      spaced[spaced.length - 1] = { t: "text", v: `${prev.v} ` }
    }

    if (part.t === "text" && prev.t === "math" && part.v.length > 0 && !/^\s/.test(part.v)) {
      spaced.push({ t: "text", v: ` ${part.v}` })
      continue
    }

    spaced.push({ ...part })
  }

  return spaced
}

/** WebView HTML — flowing paragraphs with inline math + centered display equations. */
export type QuestionHtmlTheme = {
  isDark?: boolean
  text?: string
  textSecondary?: string
  heading?: string
  codeBg?: string
  preBg?: string
  preText?: string
}

function resolveQuestionHtmlTheme(theme?: QuestionHtmlTheme) {
  const isDark = theme?.isDark ?? false
  return {
    text: theme?.text ?? (isDark ? "#F5F7FA" : "#0f172a"),
    textSecondary: theme?.textSecondary ?? (isDark ? "#98A2B3" : "#334155"),
    heading: theme?.heading ?? (isDark ? "#F5F7FA" : "#0f172a"),
    codeBg: theme?.codeBg ?? (isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"),
    preBg: theme?.preBg ?? (isDark ? "#1c1c1e" : "#0f172a"),
    preText: theme?.preText ?? (isDark ? "#f2f2f7" : "#e2e8f0"),
  }
}

export function buildQuestionHtml(
  text: string,
  options?: { compact?: boolean; theme?: QuestionHtmlTheme },
): string {
  const compact = options?.compact === true
  const colors = resolveQuestionHtmlTheme(options?.theme)
  const blocks = buildQuestionBlocks(text)
  const payload = JSON.stringify(blocks)
  const bodyFontSize = compact ? "14px" : "15px"
  const bodyLineHeight = compact ? "1.6" : "1.68"
  const paraMargin = compact ? "8px" : "12px"
  const inlineMargin = compact ? "0.36em" : "0.42em"

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: ${bodyFontSize}; line-height: ${bodyLineHeight}; color: ${colors.text}; background: transparent; }
  #content { display: flex; flex-direction: column; gap: 0; }
  p.q-para { margin: 0 0 ${paraMargin}; word-wrap: break-word; overflow-wrap: anywhere; }
  p.q-para:last-child { margin-bottom: 0; }
  p.q-para .inline-math {
    display: inline-block;
    margin: 0 ${inlineMargin};
    padding: 0 0.08em;
    vertical-align: -0.08em;
  }
  p.q-para .inline-math .katex {
    font-size: 1.05em;
    color: ${colors.text};
  }
  p.q-para .inline-math .katex .mspace.thickspace {
    min-width: 0.12em;
  }
  .q-display { margin: 10px 0 14px; padding: 2px 0; overflow-x: auto; text-align: center; }
  .q-display .katex-display { margin: 0; color: ${colors.text}; }
  .q-heading { margin: 14px 0 8px; font-weight: 800; color: ${colors.heading}; line-height: 1.35; }
  .q-heading-1 { font-size: 1.2em; }
  .q-heading-2 { font-size: 1.12em; }
  .q-heading-3 { font-size: 1.05em; }
  .q-heading-4, .q-heading-5, .q-heading-6 { font-size: 1em; }
  strong { font-weight: 700; color: ${colors.heading}; }
  em { font-style: italic; color: ${colors.textSecondary}; }
  code { font-family: Menlo, monospace; font-size: 0.92em; background: ${colors.codeBg}; padding: 0.12em 0.35em; border-radius: 4px; color: ${colors.text}; }
  pre { margin: 8px 0; padding: 10px 12px; border-radius: 8px; background: ${colors.preBg}; color: ${colors.preText}; overflow-x: auto; }
  pre code { background: transparent; padding: 0; color: inherit; }
  .math-fallback { font-family: Menlo, monospace; font-size: 13px; color: ${colors.textSecondary}; }
</style>
</head>
<body>
<div id="content"></div>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script>
  var blocks = ${payload};
  var root = document.getElementById("content");
  var html = "";

  function escapeText(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\\*([^*\\n]+)\\*(?![*])/g, "$1<em>$2</em>")
      .replace(/(^|[^_])_([^_\\n]+)_(?!_)/g, "$1<em>$2</em>")
      .replace(/\\n/g, "<br/>");
  }

  function renderMath(expr, display) {
    try {
      return katex.renderToString(expr, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore",
        trust: false});
    } catch (e) {
      return '<span class="math-fallback">' + expr + "</span>";
    }
  }

  function postHeight() {
    var root = document.getElementById("content");
    var measured = root ? Math.max(root.scrollHeight, root.offsetHeight) : document.body.scrollHeight;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(String(measured));
    }
  }

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (block.type === "display") {
      html += '<div class="q-display">' + renderMath(block.v, true) + "</div>";
      continue;
    }
    if (block.type === "heading") {
      var level = Math.min(Math.max(block.level || 3, 1), 6);
      html += '<h' + level + ' class="q-heading q-heading-' + level + '">' + escapeText(block.v) + "</h" + level + ">";
      continue;
    }
    html += '<p class="q-para">';
    for (var j = 0; j < block.parts.length; j++) {
      var part = block.parts[j];
      html += part.t === "text"
        ? escapeText(part.v)
        : '<span class="inline-math">' + renderMath(part.v, false) + "</span>";
    }
    html += "</p>";
  }

  root.innerHTML = html;
  postHeight();
  requestAnimationFrame(postHeight);
</script>
</body>
</html>`
}

export type McqReportOptionHtmlItem = {
  letter: string
  text: string
  badge?: string
  bg: string
  border: string
}

/** Single WebView for multiple MCQ options (report / review surfaces). */
export function buildMcqReportOptionsHtml(
  items: McqReportOptionHtmlItem[],
  options?: { compact?: boolean; theme?: QuestionHtmlTheme },
): string {
  const compact = options?.compact === true
  const colors = resolveQuestionHtmlTheme(options?.theme)
  const rows = items.map((item) => ({
    letter: item.letter,
    blocks: buildQuestionBlocks(item.text),
    badge: item.badge ?? "",
    bg: item.bg,
    border: item.border,
  }))
  const payload = JSON.stringify(rows)
  const bodyFontSize = compact ? "14px" : "15px"
  const bodyLineHeight = compact ? "1.55" : "1.65"

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: ${bodyFontSize}; line-height: ${bodyLineHeight}; color: ${colors.text}; background: transparent; }
  #content { display: flex; flex-direction: column; gap: ${compact ? "8px" : "10px"}; }
  .opt-row { display: flex; align-items: flex-start; gap: 10px; padding: ${compact ? "8px 10px" : "10px 12px"}; border-radius: 12px; border: 1px solid transparent; }
  .opt-letter { font-weight: 700; min-width: 1.4em; color: ${colors.heading}; flex-shrink: 0; padding-top: 1px; }
  .opt-body { flex: 1; min-width: 0; }
  .opt-badge { font-size: 11px; font-weight: 600; margin-top: 6px; color: ${colors.textSecondary}; }
  p.q-para { margin: 0 0 8px; word-wrap: break-word; overflow-wrap: anywhere; }
  p.q-para:last-child { margin-bottom: 0; }
  p.q-para .inline-math { display: inline-block; margin: 0 0.36em; vertical-align: -0.08em; }
  .q-display { margin: 8px 0 10px; overflow-x: auto; text-align: center; }
  .math-fallback { font-family: Menlo, monospace; font-size: 13px; color: ${colors.textSecondary}; }
</style>
</head>
<body>
<div id="content"></div>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script>
  var rows = ${payload};
  var root = document.getElementById("content");

  function escapeText(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\\*([^*\\n]+)\\*(?![*])/g, "$1<em>$2</em>")
      .replace(/\\n/g, "<br/>");
  }

  function renderMath(expr, display) {
    try {
      return katex.renderToString(expr, { displayMode: display, throwOnError: false, strict: "ignore", trust: false });
    } catch (e) {
      return '<span class="math-fallback">' + expr + "</span>";
    }
  }

  function renderBlocks(blocks) {
    var html = "";
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if (block.type === "display") {
        html += '<div class="q-display">' + renderMath(block.v, true) + "</div>";
        continue;
      }
      if (block.type === "heading") {
        html += "<p class=\\"q-para\\"><strong>" + escapeText(block.v) + "</strong></p>";
        continue;
      }
      html += '<p class="q-para">';
      for (var j = 0; j < block.parts.length; j++) {
        var part = block.parts[j];
        html += part.t === "text"
          ? escapeText(part.v)
          : '<span class="inline-math">' + renderMath(part.v, false) + "</span>";
      }
      html += "</p>";
    }
    return html;
  }

  function postHeight() {
    var measured = root ? Math.max(root.scrollHeight, root.offsetHeight) : document.body.scrollHeight;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(String(measured));
    }
  }

  var html = "";
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    html += '<div class="opt-row" style="background:' + row.bg + ";border-color:" + row.border + '">';
    html += '<span class="opt-letter">' + row.letter + ".</span>";
    html += '<div class="opt-body">' + renderBlocks(row.blocks);
    if (row.badge) {
      html += '<div class="opt-badge">' + escapeText(row.badge) + "</div>";
    }
    html += "</div></div>";
  }

  root.innerHTML = html;
  postHeight();
  requestAnimationFrame(postHeight);
</script>
</body>
</html>`
}

export function assignmentKindLabel(kind?: string): string {
  return kind === "solution" ? "Circuit solution" : "Code"
}

export function isSolutionAssignment(submission: { submission_kind?: string }): boolean {
  return submission.submission_kind === "solution"
}

/** Short display title for task headers and list rows. */
export function shortenTaskTitle(title: string): string {
  const cleaned = title
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/§/g, "")
    .trim()
  const section = cleaned.match(/^(\d+(?:-\d+)?)\b/)?.[1]
  const problem = cleaned.match(/Problem\s+[\d.]+/i)?.[0]
  if (section && problem) return `${section} · ${problem}`
  if (problem) return problem
  if (cleaned.length > 54) return `${cleaned.slice(0, 53).trim()}…`
  return cleaned
}
