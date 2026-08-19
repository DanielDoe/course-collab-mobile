/** Weekly buckets from academic term start through term end (or today). */

export type SemesterBounds = {
  start: Date
  end: Date
  termLabel?: string
}

export type SemesterWeek = {
  weekStart: Date
  label: string
  weekNum: number
}

const MS_WEEK = 7 * 24 * 60 * 60 * 1000

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function startOfWeekSunday(d: Date): Date {
  const out = startOfDay(d)
  out.setDate(out.getDate() - out.getDay())
  return out
}

/** Same season heuristics as calendar export — used when API omits term dates. */
export function inferTermBoundsFromLabel(term: string, referenceYear?: number): SemesterBounds {
  const match = term.match(/(spring|summer|fall|winter)\s*(\d{4})/i)
  const season = match?.[1]?.toLowerCase() ?? "fall"
  const year = Number.parseInt(match?.[2] ?? String(referenceYear ?? new Date().getFullYear()), 10)

  switch (season) {
    case "spring":
      return { start: new Date(year, 0, 15), end: new Date(year, 4, 15), termLabel: term }
    case "summer":
      return { start: new Date(year, 5, 1), end: new Date(year, 7, 4), termLabel: term }
    case "winter":
      return { start: new Date(year, 0, 2), end: new Date(year, 0, 31), termLabel: term }
    default:
      return { start: new Date(year, 7, 20), end: new Date(year, 11, 15), termLabel: term }
  }
}

export function resolveSemesterBounds(input?: {
  termLabel?: string | null
  semesterEndIso?: string | null
  earliestActivity?: Date | null
  now?: Date
}): SemesterBounds {
  const now = input?.now ?? new Date()
  const termLabel = input?.termLabel?.trim() || undefined

  let bounds: SemesterBounds
  if (termLabel) {
    bounds = inferTermBoundsFromLabel(termLabel, now.getFullYear())
  } else {
    bounds = inferTermBoundsFromLabel("fall", now.getFullYear())
  }

  if (input?.semesterEndIso) {
    const parsedEnd = new Date(input.semesterEndIso)
    if (!Number.isNaN(parsedEnd.getTime())) {
      bounds = { ...bounds, end: startOfDay(parsedEnd) }
    }
  }

  if (input?.earliestActivity && !Number.isNaN(input.earliestActivity.getTime())) {
    const activityStart = startOfWeekSunday(input.earliestActivity)
    if (activityStart.getTime() < bounds.start.getTime()) {
      bounds = { ...bounds, start: activityStart }
    }
  }

  bounds.start = startOfWeekSunday(bounds.start)
  bounds.end = startOfDay(bounds.end)

  if (bounds.end.getTime() < bounds.start.getTime()) {
    bounds.end = new Date(bounds.start)
    bounds.end.setDate(bounds.end.getDate() + 7 * 15)
  }

  return bounds
}

function formatWeekLabel(weekStart: Date, index: number, total: number): string {
  if (total <= 8) {
    return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  if (index === 0 || index === total - 1) {
    return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  if (weekStart.getDate() <= 7) {
    return weekStart.toLocaleDateString("en-US", { month: "short" })
  }
  return `W${index + 1}`
}

/** One bucket per calendar week from term start through min(term end, now). */
export function buildSemesterWeeks(bounds: SemesterBounds, now: Date = new Date()): SemesterWeek[] {
  const today = startOfDay(now)
  const horizon = bounds.end.getTime() < today.getTime() ? bounds.end : today
  const weeks: SemesterWeek[] = []

  let cursor = startOfWeekSunday(bounds.start)
  let guard = 0
  while (cursor.getTime() <= horizon.getTime() && guard < 22) {
    weeks.push({
      weekStart: new Date(cursor),
      label: "",
      weekNum: Math.floor(cursor.getTime() / MS_WEEK),
    })
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 7)
    guard++
  }

  if (weeks.length === 0) {
    const fallbackStart = startOfWeekSunday(today)
    fallbackStart.setDate(fallbackStart.getDate() - 7 * 5)
    for (let i = 0; i < 6; i++) {
      const weekStart = new Date(fallbackStart)
      weekStart.setDate(weekStart.getDate() + i * 7)
      weeks.push({
        weekStart,
        label: "",
        weekNum: Math.floor(weekStart.getTime() / MS_WEEK),
      })
    }
  }

  return weeks.map((w, i) => ({
    ...w,
    label: formatWeekLabel(w.weekStart, i, weeks.length),
  }))
}
