export type MembershipTier = "Scholar" | "Explorer" | "Trailblazer"

export type FacultyMembershipTier = "Free" | "Pro" | "Enterprise"

export type StudentDashboardStats = {
  overallGrade: number
  letterGrade: string
  quizAverage: number
  classQuizAverage: number
  homeworkAverage: number
  missingAssignments: number
  attendancePct: number
  classesMissed: number
  attendanceStreak: number
  classroomPoints: number
  engagementCredits: number
  upcomingDeadlines: number
  riskLevel: "low" | "moderate" | "high"
  riskReason: string
}

export type GradeTrendPoint = {
  label: string
  overall?: number
  quiz: number
  homework: number
}

export type PerformanceComparison = {
  label: string
  you: number
  classAvg: number
}

export type PerformanceInsight = {
  id: string
  message: string
  type: "info" | "warning" | "tip"
  actionLabel?: string
  actionRoute?: string
}
