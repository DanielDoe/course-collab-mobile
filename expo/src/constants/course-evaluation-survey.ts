/** Course evaluation survey definitions — mirrors production web. */

export const LIKERT_5 = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" },
] as const

export const PLATFORM_HELPFULNESS_LIKERT = [
  { value: 1, label: "Not at all" },
  { value: 2, label: "Slightly" },
  { value: 3, label: "Moderately" },
  { value: 4, label: "Significantly" },
  { value: 5, label: "Extremely" },
] as const

export const INSTRUCTOR_CLARITY_LIKERT = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
] as const

export const SURVEY_OTHER_OPTION = "Other" as const

export const FAVORITE_FEATURE_OPTIONS = [
  "AI Tutor",
  "Practice Hub",
  "CodeBench",
  "Playground",
  "Lecture Slides",
  "Homework",
  "Quizzes",
  "Attendance",
  "Classroom Points",
  "Trade Center",
  "Announcements",
  "Calendar",
  "Grades Dashboard",
  "Team Projects",
  "Other",
] as const

export const FEATURE_TO_IMPROVE_OPTIONS = [
  "User Interface",
  "Mobile Experience",
  "Performance / Speed",
  "AI Tutor",
  "CodeBench",
  "Practice Hub",
  "Notifications",
  "Analytics",
  "Classroom Points",
  "Trade Center",
  "Other",
] as const

export const WORKLOAD_OPTIONS = [
  "Too Light",
  "Slightly Light",
  "Just Right",
  "Slightly Heavy",
  "Too Heavy",
] as const

export const AI_TUTOR_USAGE_OPTIONS = [
  "Never",
  "Rarely",
  "Sometimes",
  "Often",
  "Daily",
] as const

export const PASS_EXPECTATION_GRADE_OPTIONS = ["A", "B", "C", "D", "F"] as const

export type SurveyFormState = {
  overallExperience: number
  platformHelpfulness: number
  favoriteFeatures: string[]
  favoriteFeaturesOther: string
  featureToImprove: string
  featureToImproveOther: string
  openFeedback: string
  instructorClarity: number
  workload: string
  aiTutorUsage: string
  npsScore: number | null
  missingFeatures: string
}

export function emptySurveyFormState(): SurveyFormState {
  return {
    overallExperience: 0,
    platformHelpfulness: 0,
    favoriteFeatures: [],
    favoriteFeaturesOther: "",
    featureToImprove: "",
    featureToImproveOther: "",
    openFeedback: "",
    instructorClarity: 0,
    workload: "",
    aiTutorUsage: "",
    npsScore: null,
    missingFeatures: "",
  }
}

export function likertLabel(
  options: readonly { value: number; label: string }[],
  value?: number | null,
): string {
  if (value == null) return "—"
  return options.find((o) => o.value === value)?.label ?? String(value)
}

export function validateSurveyForm(
  survey: SurveyFormState,
  selfAssessedGrade: string,
  proofCount: number,
): string | null {
  if (!(survey.overallExperience >= 1 && survey.overallExperience <= 5)) {
    return "Select your overall course experience."
  }
  if (!(survey.platformHelpfulness >= 1 && survey.platformHelpfulness <= 5)) {
    return "Select how much CourseCollab improved your learning."
  }
  if (survey.favoriteFeatures.length === 0) {
    return "Pick at least one favorite feature."
  }
  if (
    survey.favoriteFeatures.includes(SURVEY_OTHER_OPTION) &&
    !survey.favoriteFeaturesOther.trim()
  ) {
    return "Describe your other favorite feature."
  }
  if (!survey.featureToImprove) {
    return "Select what to improve first."
  }
  if (
    survey.featureToImprove === SURVEY_OTHER_OPTION &&
    !survey.featureToImproveOther.trim()
  ) {
    return "Describe what else should improve first."
  }
  if (survey.openFeedback.trim().length < 10) {
    return "Open feedback must be at least 10 characters."
  }
  if (!(PASS_EXPECTATION_GRADE_OPTIONS as readonly string[]).includes(selfAssessedGrade)) {
    return "Select the grade that would feel like a pass for you."
  }
  if (proofCount < 1) {
    return "Upload screenshots or a PDF showing you completed the Canvas course evaluation."
  }
  return null
}
