import { attendanceDisplayPercent } from "./attendance-leaderboard-scope"
import type {
  AttendanceStudentSummary,
  ClassroomPointsSummaryRow,
  InstructorAssessmentResult,
  InstructorStudent,
  ModuleStudentActivityPayload,
  ModuleStudentActivityRow,
  PlaygroundLeaderboardEntry,
  PracticeStudentProgress,
} from "./instructor-api"

export type ClassAnalyticsSort =
  | "engagement"
  | "assessments"
  | "practice"
  | "points"
  | "attendance"
  | "lectures"
  | "flashcards"
  | "playground"
  | "name"

export type ClassAnalyticsModuleFlashcardRow = {
  studentDbId: number
  decksStudied: number
  studyEvents: number
  pointsAwarded: number
}

export type ClassAnalyticsModuleLectureRow = {
  studentDbId: number
  lecturesOpened: number
  lecturesCompleted: number
}

export type ClassAnalyticsPlaygroundRow = {
  studentDbId?: number
  studentId: string
  sessionsPlayed: number
  totalScore: number
  accuracy: number | null
}

export type ClassAnalyticsStudentRow = {
  student: InstructorStudent
  practiceScore: number | null
  practiceAttempts: number
  topicsPracticed: number
  assessmentAvg: number | null
  assessmentCount: number
  attendanceRate: number | null
  classroomPoints: number
  classroomAwards: number
  flashcardsDecksStudied: number
  flashcardsStudyEvents: number
  flashcardsPoints: number
  lecturesOpened: number
  lecturesCompleted: number
  playgroundSessionsPlayed: number
  playgroundTotalScore: number
  playgroundAccuracy: number | null
  engagementScore: number
  lastActiveLabel: string | null
  signals: string[]
}

export type EngagementBand = {
  label: string
  count: number
}

function namesMatch(a?: string | null, b?: string | null): boolean {
  if (!a?.trim() || !b?.trim()) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function findPracticeRow(
  student: InstructorStudent,
  rows: PracticeStudentProgress[],
): PracticeStudentProgress | undefined {
  return rows.find(
    (row) =>
      row.student_id === student.id ||
      String(row.student_id) === student.student_id ||
      namesMatch(row.student_name ?? row.full_name, student.full_name),
  )
}

function findAttendanceSummary(
  student: InstructorStudent,
  rows: AttendanceStudentSummary[],
): AttendanceStudentSummary | undefined {
  return rows.find(
    (row) =>
      row.id === student.id ||
      row.student_id === student.student_id ||
      namesMatch(row.full_name, student.full_name),
  )
}

function findPointsSummary(
  student: InstructorStudent,
  rows: ClassroomPointsSummaryRow[],
): ClassroomPointsSummaryRow | undefined {
  return rows.find(
    (row) =>
      row.student_id === student.id ||
      row.student_number === student.student_id ||
      namesMatch(row.full_name, student.full_name),
  )
}

export function aggregateAssessmentByStudent(
  results: InstructorAssessmentResult[],
): Map<number, { sum: number; count: number }> {
  const map = new Map<number, { sum: number; count: number }>()
  for (const row of results) {
    if (row.is_in_progress) continue
    const pct = row.percentage ?? row.score
    if (pct == null || !Number.isFinite(Number(pct))) continue
    const studentId = row.student_id
    if (!studentId) continue
    const prev = map.get(studentId) ?? { sum: 0, count: 0 }
    map.set(studentId, { sum: prev.sum + Number(pct), count: prev.count + 1 })
  }
  return map
}

function rosterFromPractice(practice: PracticeStudentProgress[]): InstructorStudent[] {
  return practice.map((row) => ({
    id: Number(row.student_id) || 0,
    student_id: String(row.student_number ?? row.student_id ?? ""),
    full_name: row.student_name ?? row.full_name ?? "Student",
    section: row.student_section ?? row.session,
    session_code: row.session,
    quiz_attempts: row.total_attempts,
  }))
}

function rosterFromAttendance(summaries: AttendanceStudentSummary[]): InstructorStudent[] {
  return summaries.map((row) => ({
    id: Number(row.id) || 0,
    student_id: String(row.student_id ?? row.id ?? ""),
    full_name: row.full_name ?? "Student",
  }))
}

function mergeRoster(
  roster: InstructorStudent[],
  practice: PracticeStudentProgress[],
  attendanceSummaries: AttendanceStudentSummary[],
): InstructorStudent[] {
  const byKey = new Map<string, InstructorStudent>()
  const add = (student: InstructorStudent) => {
    const key = student.id > 0 ? `id:${student.id}` : `sid:${student.student_id}`
    if (!byKey.has(key)) byKey.set(key, student)
  }
  for (const student of roster) add(student)
  for (const student of rosterFromPractice(practice)) add(student)
  for (const student of rosterFromAttendance(attendanceSummaries)) add(student)
  return [...byKey.values()].sort((a, b) => a.full_name.localeCompare(b.full_name))
}

function findFlashcardActivity(
  student: InstructorStudent,
  rows: ClassAnalyticsModuleFlashcardRow[],
): ClassAnalyticsModuleFlashcardRow | undefined {
  return rows.find((row) => row.studentDbId === student.id)
}

function findLectureActivity(
  student: InstructorStudent,
  rows: ClassAnalyticsModuleLectureRow[],
): ClassAnalyticsModuleLectureRow | undefined {
  return rows.find((row) => row.studentDbId === student.id)
}

function findPlaygroundActivity(
  student: InstructorStudent,
  rows: ClassAnalyticsPlaygroundRow[],
): ClassAnalyticsPlaygroundRow | undefined {
  return rows.find(
    (row) =>
      row.studentDbId === student.id ||
      row.studentId === student.student_id ||
      row.studentId === String(student.id),
  )
}

function computeEngagementScore(input: {
  assessmentAvg: number | null
  assessmentCount: number
  practiceScore: number | null
  practiceAttempts: number
  attendanceRate: number | null
  classroomPoints: number
  maxClassroomPoints: number
  flashcardsDecksStudied: number
  maxFlashcardDecks: number
  lecturesOpened: number
  lecturesCompleted: number
  playgroundSessionsPlayed: number
  playgroundAccuracy: number | null
}): number {
  let total = 0
  let weight = 0
  if (input.assessmentAvg != null && input.assessmentCount > 0) {
    total += Math.min(100, input.assessmentAvg) * 0.25
    weight += 0.25
  }
  if (input.practiceAttempts > 0 && input.practiceScore != null) {
    total += Math.min(100, input.practiceScore) * 0.18
    weight += 0.18
  }
  if (input.attendanceRate != null) {
    total += Math.min(100, input.attendanceRate) * 0.18
    weight += 0.18
  }
  if (input.classroomPoints > 0 && input.maxClassroomPoints > 0) {
    total += Math.min(100, (input.classroomPoints / input.maxClassroomPoints) * 100) * 0.1
    weight += 0.1
  }
  if (input.flashcardsDecksStudied > 0 && input.maxFlashcardDecks > 0) {
    total += Math.min(100, (input.flashcardsDecksStudied / input.maxFlashcardDecks) * 100) * 0.09
    weight += 0.09
  }
  if (input.lecturesOpened > 0) {
    total += Math.min(100, (input.lecturesCompleted / input.lecturesOpened) * 100) * 0.12
    weight += 0.12
  }
  if (input.playgroundSessionsPlayed > 0 && input.playgroundAccuracy != null) {
    total += Math.min(100, input.playgroundAccuracy) * 0.08
    weight += 0.08
  }
  if (weight === 0) return 0
  return Math.round(total / weight)
}

function buildSignals(input: {
  assessmentAvg: number | null
  assessmentCount: number
  practiceScore: number | null
  practiceAttempts: number
  attendanceRate: number | null
  classroomPoints: number
  flashcardsDecksStudied: number
  lecturesOpened: number
  lecturesCompleted: number
  playgroundSessionsPlayed: number
}): string[] {
  const signals: string[] = []
  if (input.assessmentCount === 0) signals.push("No submissions")
  else if (input.assessmentAvg != null && input.assessmentAvg >= 85) signals.push("Strong assessments")
  else if (input.assessmentAvg != null && input.assessmentAvg < 60) signals.push("Low assessment avg")

  if (input.practiceAttempts === 0) signals.push("No practice")
  else if (input.practiceScore != null && input.practiceScore >= 80) signals.push("Practice leader")
  else if (input.practiceScore != null && input.practiceScore < 60) signals.push("Low practice")

  if (input.attendanceRate != null && input.attendanceRate >= 90) signals.push("Strong attendance")
  else if (input.attendanceRate != null && input.attendanceRate < 70) signals.push("Attendance risk")

  if (input.classroomPoints >= 50) signals.push("Active in class")
  if (input.flashcardsDecksStudied >= 3) signals.push("Flashcard regular")
  else if (input.flashcardsDecksStudied === 0) signals.push("No flashcards")
  if (input.lecturesOpened >= 3 && input.lecturesCompleted >= input.lecturesOpened) signals.push("Lectures complete")
  else if (input.lecturesOpened === 0) signals.push("No lectures")
  if (input.playgroundSessionsPlayed >= 2) signals.push("Playground active")
  return signals.slice(0, 4)
}

export function buildClassAnalyticsRows(input: {
  roster: InstructorStudent[]
  practice: PracticeStudentProgress[]
  attendanceSummaries: AttendanceStudentSummary[]
  pointsSummary: ClassroomPointsSummaryRow[]
  assessmentResults: InstructorAssessmentResult[]
  flashcardActivity?: ClassAnalyticsModuleFlashcardRow[]
  lectureActivity?: ClassAnalyticsModuleLectureRow[]
  playgroundActivity?: ClassAnalyticsPlaygroundRow[]
}): ClassAnalyticsStudentRow[] {
  const assessmentMap = aggregateAssessmentByStudent(input.assessmentResults)
  const roster = mergeRoster(input.roster, input.practice, input.attendanceSummaries)
  const maxClassroomPoints = Math.max(
    1,
    ...input.pointsSummary.map((row) => Number(row.total_points) || 0),
  )
  const maxFlashcardDecks = Math.max(
    1,
    ...(input.flashcardActivity ?? []).map((row) => row.decksStudied),
  )

  return roster.map((student) => {
    const practiceRow = findPracticeRow(student, input.practice)
    const attendanceRow = findAttendanceSummary(student, input.attendanceSummaries)
    const pointsRow = findPointsSummary(student, input.pointsSummary)
    const flashcardRow = findFlashcardActivity(student, input.flashcardActivity ?? [])
    const lectureRow = findLectureActivity(student, input.lectureActivity ?? [])
    const playgroundRow = findPlaygroundActivity(student, input.playgroundActivity ?? [])
    const assessment =
      assessmentMap.get(student.id) ??
      assessmentMap.get(Number(student.student_id)) ??
      undefined

    const practiceAttempts = practiceRow?.total_attempts ?? 0
    const practiceScore =
      practiceAttempts > 0 ? Math.round(practiceRow?.avg_score ?? practiceRow?.accuracy ?? 0) : null
    const assessmentCount = assessment?.count ?? student.quiz_attempts ?? 0
    const assessmentAvg =
      assessment && assessment.count > 0 ? Math.round(assessment.sum / assessment.count) : null
    const attendanceRate =
      attendanceRow?.attendance_percentage != null
        ? attendanceDisplayPercent(attendanceRow.attendance_percentage)
        : null
    const classroomPoints = Number(pointsRow?.total_points ?? 0)
    const classroomAwards = Number(pointsRow?.award_count ?? 0)
    const flashcardsDecksStudied = flashcardRow?.decksStudied ?? 0
    const flashcardsStudyEvents = flashcardRow?.studyEvents ?? 0
    const flashcardsPoints = flashcardRow?.pointsAwarded ?? 0
    const lecturesOpened = lectureRow?.lecturesOpened ?? 0
    const lecturesCompleted = lectureRow?.lecturesCompleted ?? 0
    const playgroundSessionsPlayed = playgroundRow?.sessionsPlayed ?? 0
    const playgroundTotalScore = playgroundRow?.totalScore ?? 0
    const playgroundAccuracy = playgroundRow?.accuracy ?? null

    const engagementScore = computeEngagementScore({
      assessmentAvg,
      assessmentCount,
      practiceScore,
      practiceAttempts,
      attendanceRate,
      classroomPoints,
      maxClassroomPoints,
      flashcardsDecksStudied,
      maxFlashcardDecks,
      lecturesOpened,
      lecturesCompleted,
      playgroundSessionsPlayed,
      playgroundAccuracy,
    })

    return {
      student,
      practiceScore,
      practiceAttempts,
      topicsPracticed: practiceRow?.topics_practiced?.length ?? 0,
      assessmentAvg,
      assessmentCount,
      attendanceRate,
      classroomPoints,
      classroomAwards,
      flashcardsDecksStudied,
      flashcardsStudyEvents,
      flashcardsPoints,
      lecturesOpened,
      lecturesCompleted,
      playgroundSessionsPlayed,
      playgroundTotalScore,
      playgroundAccuracy,
      engagementScore,
      lastActiveLabel: practiceRow?.last_practiced ?? null,
      signals: buildSignals({
        assessmentAvg,
        assessmentCount,
        practiceScore,
        practiceAttempts,
        attendanceRate,
        classroomPoints,
        flashcardsDecksStudied,
        lecturesOpened,
        lecturesCompleted,
        playgroundSessionsPlayed,
      }),
    }
  })
}

export function filterClassAnalyticsRows(
  rows: ClassAnalyticsStudentRow[],
  query: string,
  section: string,
): ClassAnalyticsStudentRow[] {
  const q = query.trim().toLowerCase()
  return rows.filter((row) => {
    const sectionCode = row.student.section ?? row.student.session_code ?? ""
    if (section !== "ALL" && sectionCode && sectionCode !== section) return false
    if (!q) return true
    const hay = [row.student.full_name, row.student.student_id, row.student.email, sectionCode, ...row.signals]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })
}

export function sortClassAnalyticsRows(
  rows: ClassAnalyticsStudentRow[],
  sort: ClassAnalyticsSort,
): ClassAnalyticsStudentRow[] {
  const next = [...rows]
  switch (sort) {
    case "assessments":
      return next.sort(
        (a, b) =>
          (b.assessmentAvg ?? -1) - (a.assessmentAvg ?? -1) ||
          b.assessmentCount - a.assessmentCount,
      )
    case "practice":
      return next.sort(
        (a, b) =>
          (b.practiceScore ?? -1) - (a.practiceScore ?? -1) || b.practiceAttempts - a.practiceAttempts,
      )
    case "points":
      return next.sort((a, b) => b.classroomPoints - a.classroomPoints || b.classroomAwards - a.classroomAwards)
    case "attendance":
      return next.sort((a, b) => (b.attendanceRate ?? -1) - (a.attendanceRate ?? -1))
    case "lectures":
      return next.sort(
        (a, b) =>
          b.lecturesCompleted - a.lecturesCompleted ||
          b.lecturesOpened - a.lecturesOpened,
      )
    case "flashcards":
      return next.sort(
        (a, b) =>
          b.flashcardsDecksStudied - a.flashcardsDecksStudied ||
          b.flashcardsStudyEvents - a.flashcardsStudyEvents,
      )
    case "playground":
      return next.sort(
        (a, b) =>
          b.playgroundTotalScore - a.playgroundTotalScore ||
          b.playgroundSessionsPlayed - a.playgroundSessionsPlayed,
      )
    case "name":
      return next.sort((a, b) => a.student.full_name.localeCompare(b.student.full_name))
    case "engagement":
    default:
      return next.sort(
        (a, b) =>
          b.engagementScore - a.engagementScore || a.student.full_name.localeCompare(b.student.full_name),
      )
  }
}

export function buildEngagementDistribution(rows: ClassAnalyticsStudentRow[]): EngagementBand[] {
  const bands: EngagementBand[] = [
    { label: "Highly engaged", count: 0 },
    { label: "On track", count: 0 },
    { label: "Needs support", count: 0 },
    { label: "No activity", count: 0 },
  ]
  for (const row of rows) {
    if (row.engagementScore >= 70) bands[0].count += 1
    else if (row.engagementScore >= 45) bands[1].count += 1
    else if (row.engagementScore > 0) bands[2].count += 1
    else bands[3].count += 1
  }
  return bands
}

export function hasEngagementDistributionData(bands: EngagementBand[]): boolean {
  return bands.some((band) => band.count > 0)
}

export type ClassAnalyticsOverviewStats = {
  activePracticers: number
  avgAssessment: number | null
  avgAttendance: number | null
  totalClassPoints: number
  submissionCount: number
  activeFlashcardStudiers: number
  activeLectureViewers: number
  activePlaygroundPlayers: number
}

export function computeClassAnalyticsOverview(rows: ClassAnalyticsStudentRow[]): ClassAnalyticsOverviewStats {
  const withAssessment = rows.filter((row) => row.assessmentAvg != null)
  const withAttendance = rows.filter((row) => row.attendanceRate != null)
  return {
    activePracticers: rows.filter((row) => row.practiceAttempts > 0).length,
    avgAssessment:
      withAssessment.length > 0
        ? Math.round(
            withAssessment.reduce((sum, row) => sum + (row.assessmentAvg ?? 0), 0) / withAssessment.length,
          )
        : null,
    avgAttendance:
      withAttendance.length > 0
        ? Math.round(
            withAttendance.reduce((sum, row) => sum + (row.attendanceRate ?? 0), 0) / withAttendance.length,
          )
        : null,
    totalClassPoints: rows.reduce((sum, row) => sum + row.classroomPoints, 0),
    submissionCount: rows.reduce((sum, row) => sum + row.assessmentCount, 0),
    activeFlashcardStudiers: rows.filter((row) => row.flashcardsDecksStudied > 0).length,
    activeLectureViewers: rows.filter((row) => row.lecturesOpened > 0).length,
    activePlaygroundPlayers: rows.filter((row) => row.playgroundSessionsPlayed > 0).length,
  }
}

function parseLectureCompleted(label: string): number {
  const match = label.match(/(\d+)\s+completed/)
  return match ? Number(match[1]) : 0
}

function parseStudyEvents(detail: string | null | undefined): number {
  if (!detail) return 0
  const match = detail.match(/(\d+)\s+study event/)
  return match ? Number(match[1]) : 0
}

export function mapModuleFlashcardRows(
  payload: ModuleStudentActivityPayload | null,
): ClassAnalyticsModuleFlashcardRow[] {
  return (payload?.students ?? []).map((row: ModuleStudentActivityRow) => ({
    studentDbId: row.studentDbId,
    decksStudied: row.activityCount,
    studyEvents: parseStudyEvents(row.detail),
    pointsAwarded: row.pointsAwarded,
  }))
}

export function mapModuleLectureRows(
  payload: ModuleStudentActivityPayload | null,
): ClassAnalyticsModuleLectureRow[] {
  return (payload?.students ?? []).map((row: ModuleStudentActivityRow) => ({
    studentDbId: row.studentDbId,
    lecturesOpened: row.activityCount,
    lecturesCompleted: parseLectureCompleted(row.activityLabel),
  }))
}

export function mapPlaygroundLeaderboardRows(
  entries: PlaygroundLeaderboardEntry[],
): ClassAnalyticsPlaygroundRow[] {
  return entries.map((row) => ({
    studentId: row.studentId,
    sessionsPlayed: row.sessionsPlayed,
    totalScore: row.score,
    accuracy: Number.isFinite(row.accuracyPercentage) ? Math.round(row.accuracyPercentage) : null,
  }))
}
