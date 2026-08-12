import type { AttendanceRecord, AttendanceScore, AttendanceStreak } from "./rewards-api"
import { gradePerformanceColor } from "./grades-theme"

export type AttendanceStatusBucket = "present" | "late" | "absent" | "other"

export type AttendanceWeeklyBar = {
  label: string
  attended: number
  missed: number
  total: number
  rate: number
}

export type AttendanceOverviewSnapshot = {
  pct: number
  attended: number
  scoredTotal: number
  scheduledTotal: number
  missed: number
  classesLeft: number
  pointsEarned: number
  scoreOutOf10: number | null
  currentStreak: number
  longestStreak: number
  nextMilestone: number
  daysToMilestone: number | null
  performanceColor: string
  performanceLabel: string
  statusBreakdown: Record<AttendanceStatusBucket, number>
  weeklyBars: AttendanceWeeklyBar[]
  recentMisses: AttendanceRecord[]
  insights: string[]
}

function classifyStatus(raw?: string): AttendanceStatusBucket {
  const s = (raw ?? "").toLowerCase()
  if (s === "present") return "present"
  if (s === "late") return "late"
  if (s === "absent" || s === "missed" || s === "excused") return "absent"
  return "other"
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(start: Date): string {
  return start.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function performanceLabel(pct: number): string {
  if (pct >= 90) return "Excellent"
  if (pct >= 80) return "On track"
  if (pct >= 70) return "Needs focus"
  return "At risk"
}

export function buildAttendanceOverviewSnapshot(
  score: AttendanceScore,
  streak: AttendanceStreak,
  records: AttendanceRecord[] = [],
): AttendanceOverviewSnapshot {
  const attended = Number(score.classes_attended ?? 0)
  const scoredTotal = Number(score.sessions_scored_so_far ?? score.total_classes ?? 0)
  const scheduledTotal = Number(score.sessions_scheduled_total ?? scoredTotal)
  const pct = Math.min(100, Math.max(0, Number(score.attendance_percentage ?? 0)))
  const missed = Math.max(0, scoredTotal - attended)
  const classesLeft = Math.max(0, scheduledTotal - scoredTotal)

  const statusBreakdown: Record<AttendanceStatusBucket, number> = {
    present: 0,
    late: 0,
    absent: 0,
    other: 0,
  }

  for (const record of records) {
    statusBreakdown[classifyStatus(record.status)] += 1
  }

  const now = new Date()
  const weekStarts: Date[] = []
  for (let i = 5; i >= 0; i -= 1) {
    const start = startOfWeek(new Date(now))
    start.setDate(start.getDate() - i * 7)
    weekStarts.push(start)
  }

  const weeklyBars: AttendanceWeeklyBar[] = weekStarts.map((start) => {
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    let attendedWeek = 0
    let missedWeek = 0
    for (const record of records) {
      const ts = record.timestamp ?? record.startTime
      if (!ts) continue
      const when = new Date(ts)
      if (when < start || when >= end) continue
      const bucket = classifyStatus(record.status)
      if (bucket === "present" || bucket === "late") attendedWeek += 1
      else if (bucket === "absent") missedWeek += 1
    }
    const total = attendedWeek + missedWeek
    const rate = total > 0 ? Math.round((attendedWeek / total) * 100) : 0
    return {
      label: weekLabel(start),
      attended: attendedWeek,
      missed: missedWeek,
      total,
      rate,
    }
  })

  const recentMisses = [...records]
    .filter((r) => classifyStatus(r.status) === "absent")
    .sort(
      (a, b) =>
        new Date(b.timestamp ?? b.startTime ?? 0).getTime() -
        new Date(a.timestamp ?? a.startTime ?? 0).getTime(),
    )
    .slice(0, 3)

  const currentStreak = Number(streak.currentStreak ?? 0)
  const longestStreak = Number(streak.longestStreak ?? 0)
  const nextMilestone = Number(streak.nextMilestone ?? 5)
  const daysToMilestone =
    streak.daysToMilestone != null && streak.daysToMilestone > 0
      ? streak.daysToMilestone
      : null

  const insights: string[] = []
  if (classesLeft > 0) {
    insights.push(
      `${classesLeft} class${classesLeft === 1 ? "" : "es"} still scheduled this term — every session counts toward your grade.`,
    )
  }
  if (missed > 0) {
    insights.push(
      `You've missed ${missed} scored session${missed === 1 ? "" : "s"}. Check in on time to protect your attendance weight.`,
    )
  } else if (scoredTotal > 0) {
    insights.push("Perfect attendance so far on scored sessions — keep the streak going.")
  }
  if (daysToMilestone != null) {
    insights.push(
      `${daysToMilestone} more day${daysToMilestone === 1 ? "" : "s"} until your ${nextMilestone}-day streak milestone.`,
    )
  } else if (currentStreak >= nextMilestone && nextMilestone > 0) {
    insights.push(`You're on a ${currentStreak}-day streak — past your ${nextMilestone}-day milestone.`)
  }
  if (pct < 80 && scoredTotal >= 3) {
    insights.push("Attendance below 80% can affect your overall grade — prioritize showing up or arriving on time.")
  }

  return {
    pct,
    attended,
    scoredTotal,
    scheduledTotal,
    missed,
    classesLeft,
    pointsEarned: Number(score.total_points_earned ?? 0),
    scoreOutOf10: score.attendance_score_10 != null ? Number(score.attendance_score_10) : null,
    currentStreak,
    longestStreak,
    nextMilestone,
    daysToMilestone,
    performanceColor: gradePerformanceColor(pct),
    performanceLabel: performanceLabel(pct),
    statusBreakdown,
    weeklyBars,
    recentMisses,
    insights: insights.slice(0, 3),
  }
}
