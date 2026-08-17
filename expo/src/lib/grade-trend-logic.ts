import type { GradeTrendPoint, PerformanceComparison, PerformanceInsight } from "../types/dashboard"

type QuizHistoryItem = {
  attempts?: { percentage?: number; completed_at?: string }[]
}

type HomeworkHistoryItem = {
  status?: string
  attempts?: { percentage?: number; completed_at?: string }[]
}

/** Some APIs send 0–1 fractions; KPI cards already show 0–100. */
function asPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  const scaled = value > 0 && value <= 1 ? value * 100 : value
  return Math.round(scaled * 10) / 10
}

function lifetimeQuizAverage(quizHistory: QuizHistoryItem[]): number {
  const scores: number[] = []
  for (const q of quizHistory) {
    const best = q.attempts?.reduce((max, a) => Math.max(max, asPercent(a.percentage ?? 0)), 0) ?? 0
    if (best > 0) scores.push(best)
  }
  return scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0
}

function lifetimeHomeworkAverage(homeworkHistory: HomeworkHistoryItem[]): number {
  const completed = homeworkHistory.filter((h) => h.status === "completed")
  const scores = completed
    .map((h) => h.attempts?.reduce((max, a) => Math.max(max, asPercent(a.percentage ?? 0)), 0) ?? 0)
    .filter((s) => s > 0)
  return scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0
}

/**
 * No weekly attempts landed in the visible window — show the honest lifetime
 * average as a FLAT line, not a fake ramp.
 *
 * This previously spread the value linearly across the weeks
 * (`value * (i + 1) / weeks.length`), which invented a rising trend the student
 * never had: a steady 76% average was drawn as a climb from 12% to 76%. The web
 * implementation (components/student/dashboard-v2/GradeTrendChart.tsx) has
 * always assigned the value flat; this is now in parity with it.
 */
function applyFlatTrend(
  weeks: GradeTrendPoint[],
  key: "quiz" | "homework",
  value: number,
): void {
  if (value <= 0) return
  weeks.forEach((w) => {
    w[key] = value
  })
}

/** Mirrors web GradeTrendChart week aggregation. */
export function buildGradeTrendSeries(
  gradeTotal: number,
  quizHistory: QuizHistoryItem[],
  homeworkHistory: HomeworkHistoryItem[],
  /**
   * Averages already computed for the KPI cards. Used only as a last resort
   * when neither the weekly buckets nor the lifetime pass yield anything, so
   * the chart can never sit at 0% while the card above it reads 76%. The two
   * surfaces disagreeing is what students were reporting.
   */
  fallbackAverages?: { quiz?: number; homework?: number },
): GradeTrendPoint[] {
  const weeks: GradeTrendPoint[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const weekStart = new Date(d)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    // Production labels the bucket with the week's start date ("Sep 7").
    // The previous `W${epochWeeks % 52}` produced values like "W36" that are
    // an epoch-week index, not an academic week number — meaningless to a
    // student and not what the web dashboard shows.
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    weeks.push({ label, overall: undefined, quiz: 0, homework: 0 })
  }

  weeks.forEach((week, index) => {
    week.overall = index === weeks.length - 1 ? gradeTotal : undefined
  })

  const weekNums = weeks.map((_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (5 - i) * 7)
    return Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))
  })

  const quizByWeek = new Map<number, number[]>()
  for (const q of quizHistory) {
    for (const a of q.attempts ?? []) {
      if (a.completed_at && a.percentage != null) {
        const weekNum = Math.floor(new Date(a.completed_at).getTime() / (7 * 24 * 60 * 60 * 1000))
        if (!quizByWeek.has(weekNum)) quizByWeek.set(weekNum, [])
        quizByWeek.get(weekNum)!.push(asPercent(a.percentage))
      }
    }
  }

  weekNums.forEach((wn, i) => {
    const scores = quizByWeek.get(wn)
    weeks[i].quiz =
      scores && scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : weeks[i - 1]?.quiz ?? 0
  })

  if (weeks[0].quiz === 0 && weeks.some((w) => w.quiz > 0)) {
    const firstNonZero = weeks.findIndex((w) => w.quiz > 0)
    for (let i = 0; i < firstNonZero; i++) weeks[i].quiz = weeks[firstNonZero].quiz
  }
  if (!weeks.some((w) => w.quiz > 0)) {
    applyFlatTrend(weeks, "quiz", asPercent(lifetimeQuizAverage(quizHistory) || fallbackAverages?.quiz || 0))
  }

  const hwByWeek = new Map<number, number[]>()
  for (const h of homeworkHistory) {
    for (const a of h.attempts ?? []) {
      if (a.completed_at && a.percentage != null) {
        const weekNum = Math.floor(new Date(a.completed_at).getTime() / (7 * 24 * 60 * 60 * 1000))
        if (!hwByWeek.has(weekNum)) hwByWeek.set(weekNum, [])
        hwByWeek.get(weekNum)!.push(asPercent(a.percentage))
      }
    }
  }

  weekNums.forEach((wn, i) => {
    const scores = hwByWeek.get(wn)
    weeks[i].homework =
      scores && scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : weeks[i - 1]?.homework ?? 0
  })

  if (!weeks.some((w) => w.homework > 0)) {
    applyFlatTrend(
      weeks,
      "homework",
      asPercent(lifetimeHomeworkAverage(homeworkHistory) || fallbackAverages?.homework || 0),
    )
  }

  return weeks
}

/** Mirrors web PerformanceComparisonChart rows. */
export function buildPerformanceComparison(
  quizYou: number,
  quizClass: number,
  hwYou: number,
  hwClass: number,
  attYou: number,
): PerformanceComparison[] {
  return [
    { label: "Quiz Avg", you: quizYou, classAvg: quizClass },
    { label: "Homework Avg", you: hwYou, classAvg: hwClass },
    { label: "Attendance", you: attYou, classAvg: 90 },
  ]
}

/** Mirrors web PerformanceInsightsCard insight rules. */
export function buildPerformanceInsights(input: {
  quizAvg: number
  hwAvg: number
  attendancePct: number
  overallGrade: number
  missingAssignments: number
  finalTaken: boolean
}): PerformanceInsight[] {
  const generated: PerformanceInsight[] = []
  const { quizAvg, hwAvg, attendancePct, overallGrade, missingAssignments, finalTaken } = input

  if (quizAvg > 0 && hwAvg > 0 && quizAvg < hwAvg - 5) {
    const diff = Math.round(hwAvg - quizAvg)
    generated.push({
      id: "quiz-vs-hw",
      message: `Your quizzes are ${diff}% lower than homework. Focus on timed assessments and review.`,
      type: "tip",
      actionLabel: "Practice Hub",
      actionRoute: "/module/practice"})
  }

  if (attendancePct < 85 && attendancePct > 0) {
    generated.push({
      id: "attendance",
      message: "Attendance is impacting your grade. Aim for 90%+ to stay on track.",
      type: "warning",
      actionLabel: "Attendance",
      actionRoute: "/module/attendance"})
  }

  if (!finalTaken && overallGrade > 0) {
    const projected =
      overallGrade >= 88 ? "A-" : overallGrade >= 85 ? "B+" : overallGrade >= 80 ? "B" : "B-"
    generated.push({
      id: "final",
      message: `Scoring 88%+ on the final projects your grade to ${projected}.`,
      type: "info",
      actionLabel: "Final Exams",
      actionRoute: "/module/final-exams"})
  }

  if (missingAssignments > 0) {
    generated.push({
      id: "missing",
      message: `${missingAssignments} assignment${missingAssignments > 1 ? "s are" : " is"} missing. Complete them to improve your grade.`,
      type: "warning",
      actionLabel: "Homework",
      actionRoute: "/module/homework"})
  }

  if (overallGrade >= 90 && attendancePct >= 95 && missingAssignments === 0) {
    generated.push({
      id: "excellent",
      message: "Strong performance across the board. Keep it up!",
      type: "info"})
  }

  if (generated.length === 0) {
    generated.push({
      id: "default",
      message: "Track your grades and attendance to get personalized insights.",
      type: "info",
      actionLabel: "View Grades",
      actionRoute: "/module/grades"})
  }

  return generated
}
