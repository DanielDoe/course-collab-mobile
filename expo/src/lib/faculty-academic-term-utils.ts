import type { InstructorAcademicTerm } from "./instructor-api"
import { facultySectionDisplayLabel } from "./faculty-section-label"
import { solidListThumbFixed, type SolidListThumb } from "./solid-list-thumb"
import type { IoniconName } from "../components/icons/AppIcon"

const TERM_OPTIONS = ["Fall", "Spring", "Summer", "Winter"] as const
export type AcademicTermName = (typeof TERM_OPTIONS)[number]

/** Distinct solid tile + icon per academic season. */
export type AcademicTermSeasonVisual = {
  season: AcademicTermName
  icon: IoniconName
  thumb: SolidListThumb
  accent: string
}

const SEASON_VISUALS: Record<AcademicTermName, AcademicTermSeasonVisual> = {
  Spring: {
    season: "Spring",
    icon: "flower-outline",
    thumb: solidListThumbFixed("#2EAE6F"),
    accent: "#2EAE6F",
  },
  Summer: {
    season: "Summer",
    icon: "sunny-outline",
    thumb: solidListThumbFixed("#FF9F0A"),
    accent: "#FF9F0A",
  },
  Fall: {
    season: "Fall",
    icon: "leaf-outline",
    thumb: solidListThumbFixed("#C65D21"),
    accent: "#C65D21",
  },
  Winter: {
    season: "Winter",
    icon: "snow-outline",
    thumb: solidListThumbFixed("#4A90C4"),
    accent: "#4A90C4",
  },
}

export function normalizeAcademicTermSeason(term: string): AcademicTermName {
  const normalized = term.trim().toLowerCase()
  if (normalized.startsWith("spring")) return "Spring"
  if (normalized.startsWith("summer")) return "Summer"
  if (normalized.startsWith("winter")) return "Winter"
  return "Fall"
}

export function academicTermSeasonVisual(
  term: Pick<InstructorAcademicTerm, "term"> | string,
): AcademicTermSeasonVisual {
  const name = typeof term === "string" ? term : term.term
  const season = normalizeAcademicTermSeason(name)
  return SEASON_VISUALS[season]
}

export function academicTermLabel(term: Pick<InstructorAcademicTerm, "term" | "year">): string {
  return `${term.term} ${term.year}`
}

/** API can return the same course_code more than once; chips should stay unique. */
export function uniqueTermCourses(
  courses?: Array<{ id: number; course_code: string; course_title: string }>,
): Array<{ id: number; course_code: string; course_title: string }> {
  if (!courses?.length) return []
  const seen = new Set<string>()
  return courses.filter((course) => {
    const key = course.course_code.trim().toUpperCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Parse YYYY-MM-DD as a local calendar date so US timezones do not shift a day. */
export function parseAcademicCalendarDate(value: string): Date {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  return new Date(value)
}

export function formatAcademicTermDateRange(
  start?: string | null,
  end?: string | null,
): string | null {
  if (!start && !end) return null
  const fmt = (value: string) =>
    parseAcademicCalendarDate(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return `Starts ${fmt(start)}`
  return `Ends ${fmt(end!)}`
}

export function canonicalSectionLabel(courseCodeRaw: string, sectionCodeRaw: string): string {
  return facultySectionDisplayLabel(courseCodeRaw, sectionCodeRaw)
}

export function defaultTermFormData(): AcademicTermNameForm {
  return {
    year: String(new Date().getFullYear()),
    term: "Fall",
    start_date: "",
    end_date: ""}
}

export type AcademicTermNameForm = {
  year: string
  term: AcademicTermName
  start_date: string
  end_date: string
}

export function termFormFromRecord(term: InstructorAcademicTerm): AcademicTermNameForm {
  return {
    year: String(term.year),
    term: (TERM_OPTIONS.includes(term.term as AcademicTermName)
      ? term.term
      : "Fall") as AcademicTermName,
    start_date: term.start_date?.slice(0, 10) ?? "",
    end_date: term.end_date?.slice(0, 10) ?? ""}
}

export function isAcademicCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = parseAcademicCalendarDate(value)
  if (Number.isNaN(parsed.getTime())) return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
}

export function termPayloadFromForm(form: AcademicTermNameForm, isActive?: boolean) {
  const year = Number.parseInt(form.year, 10)
  if (!Number.isFinite(year) || !form.term.trim()) {
    throw new Error("Year and term are required")
  }
  const start = form.start_date.trim()
  const end = form.end_date.trim()
  if (start && !isAcademicCalendarDate(start)) {
    throw new Error("Start date must be YYYY-MM-DD")
  }
  if (end && !isAcademicCalendarDate(end)) {
    throw new Error("End date must be YYYY-MM-DD")
  }
  if (start && end && parseAcademicCalendarDate(start) > parseAcademicCalendarDate(end)) {
    throw new Error("End date must be on or after the start date")
  }
  return {
    year,
    term: form.term,
    start_date: start || null,
    end_date: end || null,
    ...(isActive != null ? { is_active: isActive } : {})}
}

export const ACADEMIC_TERM_OPTIONS = TERM_OPTIONS
