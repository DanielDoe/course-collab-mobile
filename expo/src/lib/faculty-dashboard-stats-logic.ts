import type { InstructorQuiz } from "./instructor-api"

export type FacultyStatsScope = {
  sessionCode?: string | null
}

export type ActiveTermWindow = {
  label?: string | null
  startDate?: string | null
  endDate?: string | null
}

/** When a section is selected, honor session_access maps from the quizzes API. */
export function quizzesForFacultyScope(
  quizzes: InstructorQuiz[],
  scope: FacultyStatsScope,
): InstructorQuiz[] {
  const sessionCode = scope.sessionCode?.trim()
  if (!sessionCode) return quizzes

  return quizzes.filter((quiz) => {
    const access = quiz.session_access
    if (!access || Object.keys(access).length === 0) return true
    return access[sessionCode] === true
  })
}

export function assessmentOverlapsActiveTerm(
  quiz: InstructorQuiz,
  term: ActiveTermWindow,
): boolean {
  const termStart = term.startDate ? Date.parse(term.startDate) : NaN
  const termEnd = term.endDate ? Date.parse(term.endDate) : NaN
  if (!Number.isFinite(termStart) || !Number.isFinite(termEnd)) return false

  const from = quiz.available_from ? Date.parse(quiz.available_from) : NaN
  const until = quiz.available_until ? Date.parse(quiz.available_until) : NaN

  // Undated bank / legacy items are not attributed to the active term KPIs.
  if (!Number.isFinite(from) && !Number.isFinite(until)) return false

  const assessStart = Number.isFinite(from) ? from : termStart
  const assessEnd = Number.isFinite(until) ? until : termEnd
  return assessStart <= termEnd && assessEnd >= termStart
}

export function quizzesForActiveTerm(
  quizzes: InstructorQuiz[],
  term: ActiveTermWindow | null | undefined,
): InstructorQuiz[] {
  if (!term?.startDate || !term?.endDate) return quizzes
  return quizzes.filter((quiz) => assessmentOverlapsActiveTerm(quiz, term))
}

export function isAssessmentOpenNow(quiz: InstructorQuiz, now = Date.now()): boolean {
  if (quiz.is_active) return true
  const from = quiz.available_from ? Date.parse(quiz.available_from) : NaN
  const until = quiz.available_until ? Date.parse(quiz.available_until) : NaN
  if (Number.isFinite(from) && from > now) return false
  if (Number.isFinite(until) && until < now) return false
  if (Number.isFinite(from) || Number.isFinite(until)) return true
  return false
}

export function isAssessmentOpenInActiveTerm(
  quiz: InstructorQuiz,
  term: ActiveTermWindow | null | undefined,
  now = Date.now(),
): boolean {
  if (term?.startDate) {
    const termStart = Date.parse(term.startDate)
    if (Number.isFinite(termStart) && now < termStart) return false
  }
  if (term?.startDate && term?.endDate && !assessmentOverlapsActiveTerm(quiz, term)) return false
  return isAssessmentOpenNow(quiz, now)
}

export function isAssessmentUpcomingInActiveTerm(
  quiz: InstructorQuiz,
  term: ActiveTermWindow | null | undefined,
  now = Date.now(),
): boolean {
  if (term?.startDate && term?.endDate && !assessmentOverlapsActiveTerm(quiz, term)) return false

  const horizon = now + 7 * 24 * 60 * 60 * 1000
  const from = quiz.available_from ? Date.parse(quiz.available_from) : NaN
  const until = quiz.available_until ? Date.parse(quiz.available_until) : NaN
  if (!Number.isFinite(from) || from <= now) return false
  if (from > horizon) return false
  if (Number.isFinite(until) && until < now) return false

  if (term?.startDate) {
    const termStart = Date.parse(term.startDate)
    if (Number.isFinite(termStart) && from < termStart) return false
  }
  return true
}

export function buildInstructorDashboardStatsFromSources(
  students: unknown[],
  quizzes: InstructorQuiz[],
  openIssues: unknown[],
  term?: ActiveTermWindow | null,
  now = Date.now(),
) {
  const termQuizzes =
    term?.startDate && term?.endDate ? quizzesForActiveTerm(quizzes, term) : quizzes

  const termStart = term?.startDate ? Date.parse(term.startDate) : NaN
  const termEnd = term?.endDate ? Date.parse(term.endDate) : NaN
  const termStarted = !Number.isFinite(termStart) || now >= termStart
  const termEnded = Number.isFinite(termEnd) && now > termEnd
  const countAttempts = termStarted || termEnded

  const activeQuizzes = termQuizzes.filter((quiz) =>
    isAssessmentOpenInActiveTerm(quiz, term, now),
  ).length
  const upcomingAssessments = termQuizzes.filter((quiz) =>
    isAssessmentUpcomingInActiveTerm(quiz, term, now),
  ).length
  const totalAttempts = countAttempts
    ? termQuizzes.reduce((sum, quiz) => sum + (Number(quiz.total_attempts) || 0), 0)
    : 0

  return {
    totalQuizzes: termQuizzes.length,
    activeQuizzes,
    totalStudents: students.length,
    totalAttempts,
    pendingIssues: openIssues.length,
    upcomingAssessments,
    recentSubmissions24h: 0,
  }
}

export function activeTermWindowFromLabel(
  label: string | null | undefined,
  startDate?: string | null,
  endDate?: string | null,
): ActiveTermWindow | null {
  if (!startDate || !endDate) return null
  return { label: label ?? null, startDate, endDate }
}

export type AcademicTermLike = {
  id: number
  year: number
  term: string
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

export function termWindowFromAcademicTerm(term: AcademicTermLike): ActiveTermWindow {
  return activeTermWindowFromLabel(
    `${term.term} ${term.year}`,
    term.start_date,
    term.end_date,
  )!
}

/** Client-side KPI derivation is required when the selected course is not in the globally active term. */
export function prefersDerivedDashboardStats(
  academicTermId: number | null | undefined,
  activeTermId: number | null | undefined,
): boolean {
  if (academicTermId == null) return false
  if (activeTermId == null) return true
  return academicTermId !== activeTermId
}

export function resolveTermWindowForScope(
  terms: AcademicTermLike[],
  academicTermId?: number | null,
): ActiveTermWindow | null {
  const preferred =
    academicTermId != null ? terms.find((term) => term.id === academicTermId) : null
  const active = terms.find((term) => term.is_active) ?? null
  const match = preferred ?? active
  if (!match?.start_date || !match?.end_date) return null
  return termWindowFromAcademicTerm(match)
}
