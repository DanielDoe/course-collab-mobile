import type { GradeCategoryKey } from "./grades-api"
import { fetchGradeCategoryBreakdown } from "./grades-category-breakdown"
import type { StudentSession } from "./session"
import type { StudentContextPayload, StudentGradeBreakdownRow } from "./student-context-api"

export type StudentCoraLookupCategory =
  | "grades"
  | "homework"
  | "quiz"
  | "midterm"
  | "final"
  | "calendar"
  | "assessments"

const GRADE_INTENT =
  /\b(score|scored|grade|grades|gradebook|percent|percentage|mark|marks|gpa|result|results)\b/i
const HOMEWORK_INTENT = /\b(homework|homeworks|hw\b|assignment|assignments)\b/i
const QUIZ_INTENT = /\b(quiz|quizzes)\b/i
const MIDTERM_INTENT = /\b(midterm|mid-term|mid semester|mid-semester)\b/i
const FINAL_INTENT = /\b(final exam|finals?)\b/i
const CALENDAR_INTENT = /\b(calendar|schedule|due date|deadline|when is|what'?s due)\b/i
const ASSESSMENT_INTENT = /\b(assessment|assessments|exam|exams|test|tests)\b/i

/** Detect which CourseCollab data sources a student message likely needs. */
export function detectStudentCoraLookupCategories(message: string): StudentCoraLookupCategory[] {
  const text = message.trim()
  if (!text) return []

  const categories = new Set<StudentCoraLookupCategory>()
  const asksGrades = GRADE_INTENT.test(text)
  const asksHomework = HOMEWORK_INTENT.test(text)
  const asksQuiz = QUIZ_INTENT.test(text)
  const asksMidterm = MIDTERM_INTENT.test(text)
  const asksFinal = FINAL_INTENT.test(text)
  const asksCalendar = CALENDAR_INTENT.test(text)
  const asksAssessments = ASSESSMENT_INTENT.test(text)

  if (asksHomework || (asksGrades && !asksQuiz && !asksMidterm && !asksFinal)) {
    categories.add("homework")
  }
  if (asksQuiz || (asksGrades && !asksHomework && !asksMidterm && !asksFinal)) {
    categories.add("quiz")
  }
  if (asksMidterm) categories.add("midterm")
  if (asksFinal) categories.add("final")
  if (asksCalendar) categories.add("calendar")
  if (asksAssessments && categories.size === 0) {
    categories.add("assessments")
  }
  if (asksGrades && categories.size === 0) {
    categories.add("grades")
    categories.add("homework")
    categories.add("quiz")
  }

  return [...categories]
}

function categoryToBreakdownKey(category: StudentCoraLookupCategory): GradeCategoryKey | null {
  switch (category) {
    case "homework":
      return "homework"
    case "quiz":
      return "quiz"
    case "midterm":
      return "midterm"
    case "final":
      return "final"
    default:
      return null
  }
}

function breakdownCategoryLabel(category: StudentCoraLookupCategory): string {
  switch (category) {
    case "homework":
      return "Homework"
    case "quiz":
      return "Quiz"
    case "midterm":
      return "Midterm"
    case "final":
      return "Final"
    default:
      return category
  }
}

async function fetchBreakdownRows(
  session: StudentSession,
  categories: StudentCoraLookupCategory[],
): Promise<StudentGradeBreakdownRow[]> {
  const keys = categories
    .map(categoryToBreakdownKey)
    .filter((key): key is GradeCategoryKey => key != null)

  const uniqueKeys = [...new Set(keys)]
  if (uniqueKeys.length === 0) return []

  const rows: StudentGradeBreakdownRow[] = []
  for (const key of uniqueKeys) {
    const items = await fetchGradeCategoryBreakdown(session, key).catch(() => [])
    const label = breakdownCategoryLabel(
      key === "homework"
        ? "homework"
        : key === "quiz"
          ? "quiz"
          : key === "midterm"
            ? "midterm"
            : "final",
    )
    for (const item of items) {
      rows.push({
        category: label,
        title: item.title,
        score: item.valueLabel ?? null,
        status: item.statusLabel ?? null,
        completedAt: item.subtitle ?? null,
      })
    }
  }

  return rows
}

/**
 * After base context is loaded, fetch live CourseCollab data the message needs
 * (grade breakdowns, etc.) and merge into the payload.
 */
export async function enrichStudentContextForMessage(
  session: StudentSession,
  base: StudentContextPayload,
  message: string,
): Promise<StudentContextPayload> {
  const categories = detectStudentCoraLookupCategories(message)
  if (categories.length === 0) return base

  const needsBreakdown = categories.some((c) => categoryToBreakdownKey(c) != null)
  const liveGradeBreakdown = needsBreakdown
    ? await fetchBreakdownRows(session, categories)
    : base.liveGradeBreakdown

  return {
    ...base,
    liveGradeBreakdown: liveGradeBreakdown?.length ? liveGradeBreakdown : base.liveGradeBreakdown,
    liveLookupAt: new Date().toISOString(),
  }
}
