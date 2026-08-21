import {
  instructorApi,
  EMPTY_INSTRUCTOR_DASHBOARD_STATS,
  type InstructorAcademicTerm,
  type InstructorDashboardStats,
  type InstructorQuiz,
  type Scope,
} from "./instructor-api"
import {
  activeTermWindowFromLabel,
  buildInstructorDashboardStatsFromSources,
  prefersDerivedDashboardStats,
  quizzesForFacultyScope,
  resolveTermWindowForScope,
  type ActiveTermWindow,
} from "./faculty-dashboard-stats-logic"

export function termWindowFromAcademicTerm(term: InstructorAcademicTerm): ActiveTermWindow {
  return activeTermWindowFromLabel(
    `${term.term} ${term.year}`,
    term.start_date,
    term.end_date,
  )!
}

export { resolveTermWindowForScope } from "./faculty-dashboard-stats-logic"

async function loadTermWindowForScope(scope: Scope): Promise<ActiveTermWindow | null> {
  try {
    const { terms } = await instructorApi.getAcademicTerms(scope)
    return resolveTermWindowForScope(terms ?? [], scope.academicTermId)
  } catch {
    return null
  }
}

async function shouldPreferDerivedStats(scope: Scope): Promise<boolean> {
  if (scope.academicTermId == null) return false
  try {
    const { terms } = await instructorApi.getAcademicTerms(scope)
    const activeTermId = terms?.find((term) => term.is_active)?.id ?? null
    return prefersDerivedDashboardStats(scope.academicTermId, activeTermId)
  } catch {
    return true
  }
}

async function deriveInstructorDashboardStats(scope: Scope): Promise<InstructorDashboardStats> {
  const [students, quizzes, issues, charts, termWindow] = await Promise.all([
    scope.sessionId != null && scope.sessionId > 0
      ? instructorApi.getStudentsBySessionId(scope, scope.sessionId)
      : instructorApi.getStudents(scope, scope.sessionCode ?? undefined),
    instructorApi.getQuizzes(scope).catch(() => [] as InstructorQuiz[]),
    instructorApi.getIssues(scope, "open").catch(() => []),
    instructorApi.getDashboardCharts(scope).catch(() => null),
    loadTermWindowForScope(scope),
  ])

  const scopedQuizzes = quizzesForFacultyScope(quizzes, scope)
  const stats = buildInstructorDashboardStatsFromSources(
    students,
    scopedQuizzes,
    issues,
    termWindow,
  )

  const submissionSeries =
    charts?.submissionsOverTimeExtended?.length
      ? charts.submissionsOverTimeExtended
      : charts?.submissionsOverTime
  const latestDay = submissionSeries?.[submissionSeries.length - 1]
  if (latestDay && Number.isFinite(latestDay.count)) {
    stats.recentSubmissions24h = latestDay.count
  }

  return stats
}

/** Primary stats fetch with a composed fallback when `/dashboard/stats` is unavailable. */
export async function fetchInstructorDashboardStats(scope: Scope): Promise<InstructorDashboardStats> {
  if (await shouldPreferDerivedStats(scope)) {
    try {
      return await deriveInstructorDashboardStats(scope)
    } catch {
      return EMPTY_INSTRUCTOR_DASHBOARD_STATS
    }
  }

  try {
    const apiStats = await instructorApi.getDashboardStats(scope)
    const termWindow = await loadTermWindowForScope(scope)
    if (termWindow?.startDate) {
      const termStart = Date.parse(termWindow.startDate)
      const viewingActiveTerm = scope.academicTermId == null
      if (
        viewingActiveTerm &&
        Number.isFinite(termStart) &&
        Date.now() < termStart &&
        apiStats.totalAttempts > 0
      ) {
        return deriveInstructorDashboardStats(scope)
      }
    }

    try {
      const derived = await deriveInstructorDashboardStats(scope)
      if (apiStats.totalAttempts === 0 && derived.totalAttempts > 0) {
        return derived
      }
      if (derived.totalQuizzes > apiStats.totalQuizzes && derived.totalAttempts >= apiStats.totalAttempts) {
        return derived
      }
    } catch {
      // Keep API stats when derivation fails.
    }

    return apiStats
  } catch {
    try {
      return await deriveInstructorDashboardStats(scope)
    } catch {
      return EMPTY_INSTRUCTOR_DASHBOARD_STATS
    }
  }
}

export { quizzesForFacultyScope, quizzesForActiveTerm } from "./faculty-dashboard-stats-logic"
