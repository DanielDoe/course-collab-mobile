import { isAcademicCalendarDate, parseAcademicCalendarDate } from "./faculty-academic-term-utils"

/** Normalize API / form values to YYYY-MM-DD, or empty if missing/invalid. */
export function normalizeCampIsoDate(value?: string | null): string {
  if (!value) return ""
  const sliced = value.trim().slice(0, 10)
  return isAcademicCalendarDate(sliced) ? sliced : ""
}

export function campDateRangeError(start: string, end: string): string | null {
  const s = start.trim()
  const e = end.trim()
  if (s && !isAcademicCalendarDate(s)) return "Start date must be a valid calendar day."
  if (e && !isAcademicCalendarDate(e)) return "End date must be a valid calendar day."
  if (s && e && parseAcademicCalendarDate(s) > parseAcademicCalendarDate(e)) {
    return "End date must be on or after the start date."
  }
  return null
}

export function campDatePayload(start: string, end: string): { start_date?: string; end_date?: string } {
  const error = campDateRangeError(start, end)
  if (error) throw new Error(error)
  const payload: { start_date?: string; end_date?: string } = {}
  if (start.trim()) payload.start_date = start.trim()
  if (end.trim()) payload.end_date = end.trim()
  return payload
}

export function formatCampDateLabel(value: string): string {
  const iso = normalizeCampIsoDate(value)
  if (!iso) return ""
  return parseAcademicCalendarDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function daysInCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function composeCampIsoDate(year: string, month: string, day: string): string {
  if (!year || !month || !day) return ""
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  return isAcademicCalendarDate(iso) ? iso : ""
}

export function splitCampIsoDate(value: string): { year: string; month: string; day: string } {
  const iso = normalizeCampIsoDate(value)
  if (!iso) return { year: "", month: "", day: "" }
  return { year: iso.slice(0, 4), month: iso.slice(5, 7), day: iso.slice(8, 10) }
}

export function campDatePickerYears(now = new Date()): string[] {
  const current = now.getFullYear()
  const years: string[] = []
  for (let year = current - 2; year <= current + 6; year += 1) {
    years.push(String(year))
  }
  return years
}
