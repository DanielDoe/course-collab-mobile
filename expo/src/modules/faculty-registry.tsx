import type { ComponentType } from "react"
import { useLocalSearchParams } from "expo-router"
import { FacultyAcademicTermsScreen } from "../components/faculty/FacultyAcademicTermsScreen"
import { FacultyAnnouncementsScreen } from "../components/faculty/FacultyAnnouncementsScreen"
import { FacultyAssessmentsScreen } from "../components/faculty/FacultyAssessmentsScreen"
import { FacultyAttendanceScreen } from "../components/faculty/FacultyAttendanceScreen"
import { FacultyCalendarScreen } from "../components/faculty/FacultyCalendarScreen"
import { FacultyCampersScreen } from "../components/faculty/FacultyCampersScreen"
import { FacultyClassroomPointsScreen } from "../components/faculty/FacultyClassroomPointsScreen"
import { FacultyCourseNotesScreen } from "../components/faculty/FacultyCourseNotesScreen"
import { FacultyFlashcardsScreen } from "../components/faculty/FacultyFlashcardsScreen"
import { FacultyCourseEvaluationsScreen } from "../components/faculty/FacultyCourseEvaluationsScreen"
import { FacultyGroupsScreen } from "../components/faculty/FacultyGroupsScreen"
import { FacultyLecturesScreen } from "../components/faculty/FacultyLecturesScreen"
import { FacultyMessagesScreen } from "../components/faculty/FacultyMessagesScreen"
import { FacultyModulePlaceholderScreen } from "../components/faculty/FacultyModulePlaceholderScreen"
import { FacultyMyCoursesScreen } from "../components/faculty/FacultyMyCoursesScreen"
import { FacultyDiscussionsScreen } from "../components/faculty/FacultyDiscussionsScreen"
import { FacultyNotificationsScreen } from "../components/faculty/FacultyNotificationsScreen"
import { FacultyOfficeHoursScreen } from "../components/faculty/FacultyOfficeHoursScreen"
import { FacultyStudentSupportScreen } from "../components/faculty/FacultyStudentSupportScreen"
import { FacultyPlaygroundScreen } from "../components/faculty/FacultyPlaygroundScreen"
import { FacultyPracticeScreen } from "../components/faculty/FacultyPracticeScreen"
import { FacultyHelpCenterScreen } from "../components/faculty/FacultyHelpCenterScreen"
import { FacultySettingsHubScreen } from "../components/faculty/FacultySettingsHubScreen"
import { FacultyProjectsScreen } from "../components/faculty/FacultyProjectsScreen"
import { FacultyQuestionBankScreen } from "../components/faculty/FacultyQuestionBankScreen"
import { FacultyRecentActivityScreen } from "../components/faculty/FacultyRecentActivityScreen"
import { FacultyProgressReviewsScreen } from "../components/faculty/FacultyProgressReviewsScreen"
import { FacultyReportsScreen } from "../components/faculty/FacultyReportsScreen"
import { FacultyStudentProgressScreen } from "../components/faculty/FacultyStudentProgressScreen"
import { FacultyRecommendationsScreen } from "../components/faculty/FacultyRecommendationsScreen"
import { FacultyResultsScreen } from "../components/faculty/FacultyResultsScreen"
import { FacultyStudentsScreen } from "../components/faculty/FacultyStudentsScreen"
import { FacultyAccessRequestsScreen } from "../components/faculty/FacultyAccessRequestsScreen"
import { FacultySummerCampScreen } from "../components/faculty/FacultySummerCampScreen"
import { FacultySyllabusScreen } from "../components/faculty/FacultySyllabusScreen"
import { FacultyTradeCenterScreen } from "../components/faculty/FacultyTradeCenterScreen"
import { FacultyCourseExchangeScreen } from "../components/faculty/FacultyCourseExchangeScreen"
import { FacultyCourseSettingsScreen } from "../components/faculty/admin/FacultyCourseSettingsScreen"
import { FacultyScheduleAdjustmentScreen } from "../components/faculty/admin/FacultyScheduleAdjustmentScreen"
import { FacultyAssessmentGovernanceScreen } from "../components/faculty/admin/FacultyAssessmentGovernanceScreen"
import { FacultyAssessmentDefaultsScreen } from "../components/faculty/admin/FacultyAssessmentDefaultsScreen"
import { FacultyGradingPoliciesScreen } from "../components/faculty/admin/FacultyGradingPoliciesScreen"
import { FacultyAttendancePoliciesScreen } from "../components/faculty/admin/FacultyAttendancePoliciesScreen"
import { FacultyClassroomPointsRulesScreen } from "../components/faculty/admin/FacultyClassroomPointsRulesScreen"
import { FacultyPlaygroundRulesScreen } from "../components/faculty/admin/FacultyPlaygroundRulesScreen"
import { FacultyTeamProjectPoliciesScreen } from "../components/faculty/admin/FacultyTeamProjectPoliciesScreen"
import { FacultyAiAssistantSettingsScreen } from "../components/faculty/admin/FacultyAiAssistantSettingsScreen"
import { FacultyTeachingAssistantsScreen } from "../components/faculty/admin/FacultyTeachingAssistantsScreen"
import { FacultySubmissionIssuesScreen } from "../components/faculty/admin/FacultySubmissionIssuesScreen"
import { FacultySupportFormScreen } from "../components/faculty/FacultySupportFormScreen"
import { FacultyCoraScreen } from "../components/faculty/cora/FacultyCoraScreen"
import type { SupportFormKind } from "../lib/support-color-theme"
import type { AssessmentModuleSegment, AssessmentType } from "../lib/faculty-assessment-utils"
import { FACULTY_MODULE_META } from "../lib/faculty-module-meta"

type ModuleRenderer = ComponentType

function placeholderModule(moduleId: string): ModuleRenderer {
  return function FacultyPlaceholderModule() {
    return <FacultyModulePlaceholderScreen moduleId={moduleId} />
  }
}

function parseAssessmentSegment(
  value: unknown,
  fallback: AssessmentModuleSegment = "manage",
): AssessmentModuleSegment {
  if (value === "issues" || value === "deleted" || value === "manage") return value
  return fallback
}

function assessmentModule(
  type: AssessmentType,
  defaultSegment: AssessmentModuleSegment = "manage",
): ModuleRenderer {
  return function FacultyAssessmentModule() {
    const { segment } = useLocalSearchParams<{ segment?: string }>()
    return (
      <FacultyAssessmentsScreen
        assessmentType={type}
        initialSegment={parseAssessmentSegment(segment, defaultSegment)}
      />
    )
  }
}

function supportFormModule(kind: SupportFormKind): ModuleRenderer {
  return function FacultySupportFormModule() {
    return <FacultySupportFormScreen kind={kind} />
  }
}

const PLACEHOLDER_RENDERERS = Object.fromEntries(
  Object.keys(FACULTY_MODULE_META).map((id) => [id, placeholderModule(id)]),
) as Record<string, ModuleRenderer>

export const FACULTY_MODULE_RENDERERS: Record<string, ModuleRenderer> = {
  ...PLACEHOLDER_RENDERERS,

  "academic-terms": FacultyAcademicTermsScreen,
  calendar: FacultyCalendarScreen,
  announcements: FacultyAnnouncementsScreen,
  syllabus: FacultySyllabusScreen,
  lectures: FacultyLecturesScreen,
  "course-notes": FacultyCourseNotesScreen,
  "course-exchange": FacultyCourseExchangeScreen,
  flashcards: FacultyFlashcardsScreen,
  practice: FacultyPracticeScreen,
  playground: FacultyPlaygroundScreen,
  projects: FacultyProjectsScreen,
  groups: FacultyGroupsScreen,
  "summer-camp": FacultySummerCampScreen,
  "classroom-points": FacultyClassroomPointsScreen,
  "course-evaluations": FacultyCourseEvaluationsScreen,
  attendance: FacultyAttendanceScreen,
  "question-bank": FacultyQuestionBankScreen,

  quizzes: assessmentModule("quiz"),
  homework: assessmentModule("homework"),
  "mid-semester-exams": assessmentModule("mid_semester"),
  "final-exams": assessmentModule("final"),

  /** Legacy deep links — open the quiz module on the matching segment. */
  "quiz-issues": assessmentModule("quiz", "issues"),
  issues: assessmentModule("quiz", "issues"),
  "deleted-quizzes": assessmentModule("quiz", "deleted"),

  campers: FacultyCampersScreen,
  recommendations: FacultyRecommendationsScreen,
  students: FacultyStudentsScreen,
  "access-requests": FacultyAccessRequestsScreen,
  "trade-center": FacultyTradeCenterScreen,
  "office-hours": FacultyOfficeHoursScreen,

  results: FacultyResultsScreen,
  "student-progress": FacultyStudentProgressScreen,
  reports: FacultyReportsScreen,
  "progress-reviews": FacultyProgressReviewsScreen,
  "recent-activity": FacultyRecentActivityScreen,

  notifications: FacultyNotificationsScreen,
  messages: FacultyMessagesScreen,
  discussions: FacultyDiscussionsScreen,
  "student-support": FacultyStudentSupportScreen,
  "my-courses": FacultyMyCoursesScreen,

  "course-settings": FacultyCourseSettingsScreen,
  "schedule-adjustment": FacultyScheduleAdjustmentScreen,
  "assessment-governance": FacultyAssessmentGovernanceScreen,
  "assessment-defaults": FacultyAssessmentDefaultsScreen,
  "grading-policies": FacultyGradingPoliciesScreen,
  "attendance-policies": FacultyAttendancePoliciesScreen,
  "classroom-points-rules": FacultyClassroomPointsRulesScreen,
  "playground-rules": FacultyPlaygroundRulesScreen,
  "ai-assistant-settings": FacultyAiAssistantSettingsScreen,
  "team-project-policies": FacultyTeamProjectPoliciesScreen,
  "submission-issues": FacultySubmissionIssuesScreen,
  "teaching-assistants": FacultyTeachingAssistantsScreen,

  profile: FacultySettingsHubScreen,
  settings: FacultySettingsHubScreen,
  "help-center": FacultyHelpCenterScreen,
  "report-bug": supportFormModule("bug"),
  "submit-ticket": supportFormModule("support"),
  "feature-requests": supportFormModule("feature"),
  cora: FacultyCoraScreen,
}

export function getFacultyModuleRenderer(id: string): ModuleRenderer {
  return FACULTY_MODULE_RENDERERS[id] ?? placeholderModule(id)
}
