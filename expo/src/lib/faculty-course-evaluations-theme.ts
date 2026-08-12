import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { FacultySheetSolidAccent } from "./faculty-sheet-accents"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/**
 * Color Hunt palettes for course evaluations detail sheet.
 * @see https://colorhunt.co/palette/ffc349525ea75facd397dde9
 * @see https://colorhunt.co/palette/224248325e6a44a1a4ff9a00
 * @see https://colorhunt.co/palette/00797924b1b1ffe2afe37434
 */
export const FACULTY_EVALUATIONS_HUNT = {
  gold: "#FFC349",
  indigo: "#525EA7",
  cyan: "#5FACD3",
  sky: "#97DDE9",
  tealDeep: "#224248",
  tealMid: "#325E6A",
  tealBright: "#44A1A4",
  orangeBright: "#FF9A00",
  ocean: "#007979",
  aqua: "#24B1B1",
  cream: "#FFE2AF",
  rust: "#E37434",
} as const

function evalSolid(fill: string, icon = "#FFFFFF"): FacultySheetSolidAccent {
  return { fill, icon }
}

/** Detail sheet KPI tiles — one vibrant solid swatch each. */
export const FACULTY_EVALUATIONS_KPI_SOLID = {
  overall: evalSolid(FACULTY_EVALUATIONS_HUNT.indigo),
  passGoal: evalSolid(FACULTY_EVALUATIONS_HUNT.gold, COLOR_HUNT.ink),
  current: evalSolid(FACULTY_EVALUATIONS_HUNT.cyan),
  currentMismatch: evalSolid(FACULTY_EVALUATIONS_HUNT.rust),
} as const

/** Survey metric rows — rotate solid tiles across all three palettes. */
export const FACULTY_EVALUATIONS_SURVEY_SOLID: FacultySheetSolidAccent[] = [
  evalSolid(FACULTY_EVALUATIONS_HUNT.indigo),
  evalSolid(FACULTY_EVALUATIONS_HUNT.cyan),
  evalSolid(FACULTY_EVALUATIONS_HUNT.tealBright),
  evalSolid(FACULTY_EVALUATIONS_HUNT.aqua),
  evalSolid(FACULTY_EVALUATIONS_HUNT.orangeBright),
  evalSolid(FACULTY_EVALUATIONS_HUNT.gold, COLOR_HUNT.ink),
  evalSolid(FACULTY_EVALUATIONS_HUNT.sky, "#1E3A5F"),
  evalSolid(FACULTY_EVALUATIONS_HUNT.rust),
]

export function facultyEvaluationSurveySolid(index: number): FacultySheetSolidAccent {
  return FACULTY_EVALUATIONS_SURVEY_SOLID[index % FACULTY_EVALUATIONS_SURVEY_SOLID.length]!
}

/**
 * Faculty course evaluations — Color Hunt palette.
 */
export const FACULTY_EVALUATIONS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  pending: FACULTY_EVALUATIONS_HUNT.orangeBright,
  approved: REPORT_SOLID.correct,
  rejected: REPORT_SOLID.missed,
  draft: FACULTY_EVALUATIONS_HUNT.indigo,
  proof: FACULTY_EVALUATIONS_HUNT.cyan,
  grade: FACULTY_EVALUATIONS_HUNT.gold,
  survey: FACULTY_EVALUATIONS_HUNT.indigo,
  hero: FACULTY_EVALUATIONS_HUNT.indigo,
} as const

export function facultyEvaluationStatusColor(status: string): string {
  const s = status.toLowerCase()
  if (s === "approved") return FACULTY_EVALUATIONS_COLOR.approved
  if (s === "pending") return FACULTY_EVALUATIONS_COLOR.pending
  if (s === "rejected") return FACULTY_EVALUATIONS_COLOR.rejected
  if (s === "draft") return FACULTY_EVALUATIONS_COLOR.draft
  return FACULTY_EVALUATIONS_COLOR.survey
}

export function facultyEvaluationStudentThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(String(seed))
}

export function facultyEvaluationHeroThumb(): SolidListThumb {
  return solidListThumbFixed(FACULTY_EVALUATIONS_HUNT.indigo)
}

export function facultyEvaluationProofSolid(): FacultySheetSolidAccent {
  return evalSolid(FACULTY_EVALUATIONS_HUNT.aqua)
}
