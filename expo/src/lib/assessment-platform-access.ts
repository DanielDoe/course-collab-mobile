export const ASSESSMENT_PLATFORM_IDS = ["web", "mobile", "desktop"] as const
export type AssessmentPlatformId = (typeof ASSESSMENT_PLATFORM_IDS)[number]

export const ASSESSMENT_PLATFORM_KINDS = ["quiz", "homework", "mid_semester", "final"] as const
export type AssessmentPlatformKind = (typeof ASSESSMENT_PLATFORM_KINDS)[number]

export type AssessmentPlatformFlags = Record<AssessmentPlatformId, boolean>

export type AssessmentPlatformAccess = Record<AssessmentPlatformKind, AssessmentPlatformFlags>

export const DEFAULT_ASSESSMENT_PLATFORM_FLAGS: AssessmentPlatformFlags = {
  web: true,
  mobile: true,
  desktop: true,
}

export const DEFAULT_ASSESSMENT_PLATFORM_ACCESS: AssessmentPlatformAccess = {
  quiz: { ...DEFAULT_ASSESSMENT_PLATFORM_FLAGS },
  homework: { ...DEFAULT_ASSESSMENT_PLATFORM_FLAGS },
  mid_semester: { ...DEFAULT_ASSESSMENT_PLATFORM_FLAGS },
  final: { ...DEFAULT_ASSESSMENT_PLATFORM_FLAGS },
}

const KIND_ALIASES: Record<string, AssessmentPlatformKind> = {
  quiz: "quiz",
  quizzes: "quiz",
  homework: "homework",
  mid_semester: "mid_semester",
  midsem: "mid_semester",
  midterm: "mid_semester",
  "mid-semester": "mid_semester",
  final: "final",
  finals: "final",
}

export function resolveAssessmentPlatformKind(raw: string | undefined | null): AssessmentPlatformKind {
  const key = String(raw ?? "quiz").trim().toLowerCase().replace(/-/g, "_")
  return KIND_ALIASES[key] ?? "quiz"
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value
  if (value === 0 || value === "0" || value === "false") return false
  if (value === 1 || value === "1" || value === "true") return true
  return fallback
}

function parseFlags(raw: unknown, fallback: AssessmentPlatformFlags): AssessmentPlatformFlags {
  if (!raw || typeof raw !== "object") return { ...fallback }
  const o = raw as Record<string, unknown>
  return {
    web: parseBool(o.web, fallback.web),
    mobile: parseBool(o.mobile ?? o.app ?? o.native, fallback.mobile),
    desktop: parseBool(o.desktop, fallback.desktop),
  }
}

export function parseAssessmentPlatformAccess(raw: unknown): AssessmentPlatformAccess {
  const base = {
    quiz: { ...DEFAULT_ASSESSMENT_PLATFORM_ACCESS.quiz },
    homework: { ...DEFAULT_ASSESSMENT_PLATFORM_ACCESS.homework },
    mid_semester: { ...DEFAULT_ASSESSMENT_PLATFORM_ACCESS.mid_semester },
    final: { ...DEFAULT_ASSESSMENT_PLATFORM_ACCESS.final },
  }
  if (!raw || typeof raw !== "object") return base
  const o = raw as Record<string, unknown>
  return {
    quiz: parseFlags(o.quiz ?? o.quizzes, base.quiz),
    homework: parseFlags(o.homework, base.homework),
    mid_semester: parseFlags(o.mid_semester ?? o.midsem ?? o.midterm, base.mid_semester),
    final: parseFlags(o.final ?? o.finals, base.final),
  }
}

/** Pull platform access from governance, course policies, or nested assessment_policy. */
export function extractAssessmentPlatformAccess(raw: unknown): AssessmentPlatformAccess {
  if (!raw || typeof raw !== "object") return parseAssessmentPlatformAccess(null)
  const o = raw as Record<string, unknown>
  if (o.platform_access && typeof o.platform_access === "object") {
    return parseAssessmentPlatformAccess(o.platform_access)
  }
  const policy = o.assessment_policy
  if (policy && typeof policy === "object") {
    const access = (policy as Record<string, unknown>).access
    if (access && typeof access === "object") {
      const nested = (access as Record<string, unknown>).platform_access
      if (nested) return parseAssessmentPlatformAccess(nested)
    }
  }
  return parseAssessmentPlatformAccess(null)
}

/** `null` means inherit the course default for this assessment's type. */
export function parseAssessmentPlatformOverride(raw: unknown): AssessmentPlatformFlags | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    const s = raw.trim()
    if (!s || s === "null" || s === "inherit") return null
    try {
      return parseAssessmentPlatformOverride(JSON.parse(s) as unknown)
    } catch {
      return null
    }
  }
  if (typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (o.inherit === true || o.mode === "inherit" || o.use_course_default === true) return null
  const hasFlag =
    o.web != null || o.mobile != null || o.desktop != null || o.app != null || o.native != null
  if (!hasFlag) return null
  return parseFlags(o, DEFAULT_ASSESSMENT_PLATFORM_FLAGS)
}

export function assessmentPlatformFlagsLabel(flags: AssessmentPlatformFlags): string {
  const on = ASSESSMENT_PLATFORM_IDS.filter((id) => flags[id]).map((id) =>
    id === "web" ? "website" : id === "mobile" ? "mobile" : "desktop",
  )
  if (on.length === 0) return "no platforms"
  if (on.length === ASSESSMENT_PLATFORM_IDS.length) return "website, mobile, and desktop"
  if (on.length === 2) return `${on[0]} and ${on[1]}`
  return on[0] ?? "no platforms"
}

export function resolveAssessmentPlatformFlags(
  courseAccess: AssessmentPlatformAccess,
  kind: string | undefined | null,
  override?: unknown,
): AssessmentPlatformFlags {
  const parsed = parseAssessmentPlatformOverride(override)
  if (parsed) return parsed
  return { ...courseAccess[resolveAssessmentPlatformKind(kind)] }
}

export function isAssessmentPlatformAllowed(
  access: AssessmentPlatformAccess,
  kind: string | undefined | null,
  platform: AssessmentPlatformId,
  override?: unknown,
): boolean {
  return resolveAssessmentPlatformFlags(access, kind, override)[platform] !== false
}

export function assessmentPlatformBlockedMessage(
  kind: string | undefined | null,
  platform: AssessmentPlatformId = "mobile",
): string {
  const resolved = resolveAssessmentPlatformKind(kind)
  const label =
    resolved === "homework"
      ? "homework"
      : resolved === "mid_semester"
        ? "mid-semester exam"
        : resolved === "final"
          ? "final exam"
          : "quiz"
  if (platform === "mobile") {
    return `This ${label} must be taken on the CourseCollab website. The mobile app is turned off for this assessment — open coursecollab.com on a computer or in a browser to continue.`
  }
  if (platform === "desktop") {
    return `This ${label} must be taken on the CourseCollab website. The desktop app is turned off for this assessment.`
  }
  return `This ${label} must be taken in the CourseCollab mobile app. The website is turned off for this assessment.`
}

export function isAssessmentPlatformError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const rec = err as { code?: unknown; error?: unknown; message?: unknown; details?: unknown }
  const fromDetails =
    rec.details && typeof rec.details === "object"
      ? String((rec.details as { code?: unknown }).code ?? "")
      : ""
  const code = String(rec.code ?? rec.error ?? fromDetails).toLowerCase()
  if (
    code.includes("platform") &&
    (code.includes("disabled") || code.includes("not_allowed") || code.includes("blocked"))
  ) {
    return true
  }
  const message = String(rec.message ?? "").toLowerCase()
  return (
    message.includes("wrong platform") ||
    message.includes("turned off for this assessment") ||
    (message.includes("visit the") && message.includes("platform"))
  )
}
