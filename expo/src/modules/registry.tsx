import type { ComponentType } from "react"
import { WEB_ONLY_MODULE_IDS, getModuleWebPath } from "../constants/module-web-paths"
import { WebModuleScreen } from "../components/modules/WebModuleScreen"
import { AiTutorScreen } from "../components/ai-tutor/AiTutorScreen"
import { AnalyticsMoreScreen } from "../components/analytics-more/AnalyticsMoreScreen"
import { CodebenchScreen } from "../components/codebench/CodebenchScreen"
import { NotetakerHomeScreen } from "../components/notetaker/NotetakerHomeScreen"
import { NotesScreen } from "../components/notes/NotesScreen"
import { FlashcardsHomeScreen } from "../components/flashcards/FlashcardsHomeScreen"
import { PracticeHubScreen } from "../components/practice/PracticeHubScreen"
import {
  AssessmentModuleScreen,
  AttendanceModuleScreen,
  CalendarModuleScreen,
  ClassroomPointsModuleScreen,
  ForumModuleScreen,
  MessagesModuleScreen,
  GradesModuleScreen,
  GroupsModuleScreen,
  HelpCenterModuleScreen,
  LecturesModuleScreen,
  MembershipModuleScreen,
  OfficeHoursModuleScreen,
  PlaygroundModuleScreen,
  CourseEvaluationModuleScreen,
  PoliciesModuleScreen,
  ProgressReviewModuleScreen,
  ProjectsModuleScreen,
  QuizHistoryModuleScreen,
  RecommendationsModuleScreen,
  SettingsModuleScreen,
  SupportFormModuleScreen,
  SyllabusModuleScreen,
  TradeCenterModuleScreen} from "./native-screens"
import { NAV_LABEL_BY_ROUTE } from "../constants/student-nav"

type ModuleRenderer = ComponentType

function webModule(id: string): ModuleRenderer {
  const path = getModuleWebPath(id)
  const title = NAV_LABEL_BY_ROUTE[`/module/${id}`] ?? id
  return function WebModuleWrapper() {
    return <WebModuleScreen webPath={path} title={title} />
  }
}

export const MODULE_RENDERERS: Record<string, ModuleRenderer> = {
  lectures: LecturesModuleScreen,
  practice: PracticeHubScreen,
  quizzes: () => <AssessmentModuleScreen type="quiz" title="Quizzes" />,
  "quiz-history": QuizHistoryModuleScreen,
  homework: () => <AssessmentModuleScreen type="homework" title="Homework" />,
  "mid-semester-exams": () => <AssessmentModuleScreen type="mid_semester" title="Mid-Semester Exams" />,
  "final-exams": () => <AssessmentModuleScreen type="final" title="Final Exams" />,
  grades: GradesModuleScreen,
  forum: ForumModuleScreen,
  messages: MessagesModuleScreen,
  groups: GroupsModuleScreen,
  projects: ProjectsModuleScreen,
  playground: PlaygroundModuleScreen,
  "classroom-points": ClassroomPointsModuleScreen,
  attendance: AttendanceModuleScreen,
  "trade-center": TradeCenterModuleScreen,
  "progress-review": ProgressReviewModuleScreen,
  syllabus: SyllabusModuleScreen,
  calendar: CalendarModuleScreen,
  "office-hours": OfficeHoursModuleScreen,
  "course-policies": PoliciesModuleScreen,
  "course-evaluation": CourseEvaluationModuleScreen,
  recommendations: RecommendationsModuleScreen,
  settings: SettingsModuleScreen,
  membership: MembershipModuleScreen,
  "help-center": HelpCenterModuleScreen,
  "submit-ticket": () => <SupportFormModuleScreen kind="support" />,
  "report-bug": () => <SupportFormModuleScreen kind="bug" />,
  "feature-requests": () => <SupportFormModuleScreen kind="feature" />,
  "ai-notetaker": NotetakerHomeScreen,
  notes: NotesScreen,
  flashcards: FlashcardsHomeScreen,
  "ai-tutor": AiTutorScreen,
  codebench: CodebenchScreen,
  "codebench-more": AnalyticsMoreScreen}

for (const id of WEB_ONLY_MODULE_IDS) {
  if (!MODULE_RENDERERS[id]) {
    MODULE_RENDERERS[id] = webModule(id)
  }
}

export function getModuleRenderer(id: string): ModuleRenderer {
  return MODULE_RENDERERS[id] ?? webModule(id)
}
