export type AssessmentAntiCheatConfig = {
  strictMode: boolean
  blockCopyPaste: boolean
  trackTabSwitches: boolean
  warnOnTabSwitch: boolean
  maxTabSwitches: number
  autoSubmitOnViolations: boolean
  keystrokePlaybackEnforced: boolean
}

export const DEFAULT_ASSESSMENT_ANTI_CHEAT: AssessmentAntiCheatConfig = {
  strictMode: false,
  blockCopyPaste: true,
  trackTabSwitches: true,
  warnOnTabSwitch: true,
  maxTabSwitches: 3,
  autoSubmitOnViolations: false,
  keystrokePlaybackEnforced: true,
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value
  if (value === 0 || value === "0" || value === "false") return false
  if (value === 1 || value === "1" || value === "true") return true
  return fallback
}

function parseNum(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : fallback
}

function read(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined) return raw[key]
  }
  return undefined
}

/** Normalize quiz.antiCheatConfig or quiz-level integrity columns. */
export function parseAssessmentAntiCheatConfig(raw: unknown): AssessmentAntiCheatConfig {
  const d = DEFAULT_ASSESSMENT_ANTI_CHEAT
  if (!raw || typeof raw !== "object") return { ...d }
  const o = raw as Record<string, unknown>
  const nested =
    o.antiCheatConfig && typeof o.antiCheatConfig === "object"
      ? (o.antiCheatConfig as Record<string, unknown>)
      : o
  return {
    strictMode: parseBool(read(nested, "strict_mode_enabled", "strictMode", "enabled"), d.strictMode),
    blockCopyPaste: parseBool(read(nested, "block_copy_paste", "blockCopyPaste"), d.blockCopyPaste),
    trackTabSwitches: parseBool(read(nested, "track_tab_switches", "trackTabSwitches"), d.trackTabSwitches),
    warnOnTabSwitch: parseBool(read(nested, "warn_on_tab_switch", "warnOnTabSwitch"), d.warnOnTabSwitch),
    maxTabSwitches: parseNum(read(nested, "max_tab_switches", "maxTabSwitches"), d.maxTabSwitches),
    autoSubmitOnViolations: parseBool(
      read(nested, "auto_submit_on_violations", "autoSubmitOnViolations"),
      d.autoSubmitOnViolations,
    ),
    keystrokePlaybackEnforced: parseBool(
      read(nested, "keystroke_playback_enforced", "keystrokePlaybackEnforced"),
      d.keystrokePlaybackEnforced,
    ),
  }
}

export type AssessmentKeystrokeEvent = {
  t: number
  op: "insert" | "delete" | "replace"
  count: number
}

const PASTE_INSERT_THRESHOLD = 8

export function diffTextChange(prev: string, next: string): AssessmentKeystrokeEvent["op"] {
  if (next.length > prev.length && next.includes(prev)) return "insert"
  if (prev.length > next.length && prev.includes(next)) return "delete"
  return "replace"
}

export function recordTextChange(
  prev: string,
  next: string,
  startedAt: number,
): AssessmentKeystrokeEvent {
  return {
    t: Math.max(0, Date.now() - startedAt),
    op: diffTextChange(prev, next),
    count: Math.abs(next.length - prev.length) || next.length,
  }
}

export function looksLikePastedAnswer(events: AssessmentKeystrokeEvent[], answer: string): boolean {
  const trimmed = answer.trim()
  if (!trimmed) return false
  if (events.length === 0) return trimmed.length > 1
  if (events.length === 1) {
    const only = events[0]
    return only.op !== "delete" && only.count >= Math.min(PASTE_INSERT_THRESHOLD, trimmed.length)
  }
  const largestInsert = events
    .filter((event) => event.op === "insert" || event.op === "replace")
    .reduce((max, event) => Math.max(max, event.count), 0)
  return largestInsert >= PASTE_INSERT_THRESHOLD && largestInsert >= trimmed.length - 1
}

export function buildKeystrokePayload(events: AssessmentKeystrokeEvent[], answer: string) {
  return {
    events,
    charCount: answer.length,
    pasteSuspected: looksLikePastedAnswer(events, answer),
    source: "native_app" as const,
  }
}
