const NOTE_BODY_FIELDS = new Set(["bodyText", "inkWorkspace"])
const LECTURE_BODY_FIELDS = new Set(["sample_practice", "lecture_workspace", "transcript", "slides"])

function stripObjectFields(value: unknown, fields: Set<string>): unknown {
  if (Array.isArray(value)) return value.map((item) => stripObjectFields(item, fields))
  if (!value || typeof value !== "object") return value
  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (fields.has(key)) continue
    next[key] = stripObjectFields(entry, fields)
  }
  return next
}

/** Persist metadata only — never write note bodies, ink, or lecture workspace payloads. */
export function sanitizePersistedQueryData(queryKey: readonly unknown[], data: unknown): unknown {
  const module = queryKey[1]
  if (module === "notes") return stripObjectFields(data, NOTE_BODY_FIELDS)
  if (module === "lectures") return stripObjectFields(data, LECTURE_BODY_FIELDS)
  return data
}
