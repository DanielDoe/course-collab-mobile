import type { InstructorAcademicTerm } from "./instructor-api"
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

export function formatAcademicTermDateRange(
  start?: string | null,
  end?: string | null,
): string | null {
  if (!start && !end) return null
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return `Starts ${fmt(start)}`
  return `Ends ${fmt(end!)}`
}

export function canonicalSectionLabel(courseCodeRaw: string, sectionCodeRaw: string): string {
  const sectionCode = sectionCodeRaw.trim()
  if (!sectionCode) return sectionCodeRaw
  const courseCompact = courseCodeRaw.replace(/\s+/g, "").toUpperCase()
  const sectionNorm = sectionCode.toUpperCase().replace(/\s+/g, "")
  if (sectionNorm.startsWith(courseCompact) && sectionNorm.length >= courseCompact.length) {
    return sectionCode
  }
  if (sectionNorm.includes(courseCompact) && sectionNorm !== courseCompact) {
    return sectionCode
  }
  if (/^P\d+/i.test(sectionCode)) {
    return `${courseCompact}${sectionCode.toUpperCase()}`
  }
  return `${courseCodeRaw.trim()} · ${sectionCode}`
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

export function termPayloadFromForm(form: AcademicTermNameForm, isActive?: boolean) {
  const year = Number.parseInt(form.year, 10)
  if (!Number.isFinite(year) || !form.term.trim()) {
    throw new Error("Year and term are required")
  }
  return {
    year,
    term: form.term,
    start_date: form.start_date.trim() || null,
    end_date: form.end_date.trim() || null,
    ...(isActive != null ? { is_active: isActive } : {})}
}

export const ACADEMIC_TERM_OPTIONS = TERM_OPTIONS
