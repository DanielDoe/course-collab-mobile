import type { InstructorScope } from "./instructor-content-api"
import {
  instructorApi,
  type InstructorCourse,
  type InstructorLecture,
  type InstructorQuiz,
} from "./instructor-api"
import {
  FACULTY_CORA_CAPABILITIES,
  type FacultyCoraCapability,
  type FacultyCoraCapabilityId,
} from "./faculty-cora-config"
import {
  inferFacultyCoraDiscipline,
  pickTopic,
  type FacultyCoraDisciplineId,
  type FacultyCoraDisciplineProfile,
} from "./faculty-cora-discipline"

export const FACULTY_CORA_CONTEXT_VERSION = 2

export type FacultyCoraCourseSnapshot = {
  courseId: number
  courseCode: string
  courseTitle: string
  disciplineId: FacultyCoraDisciplineId
  disciplineLabel: string
  topics: string[]
  quizTitles: string[]
  homeworkTitles: string[]
  lectureTitles: string[]
  syllabusExcerpt?: string
}

export type FacultyCoraInstructorContext = {
  version: typeof FACULTY_CORA_CONTEXT_VERSION
  instructorId: number
  instructorName?: string
  activeCourseId: number
  courses: FacultyCoraCourseSnapshot[]
  activeCourse: FacultyCoraCourseSnapshot
  discipline: FacultyCoraDisciplineProfile
  tailoredCapabilities: FacultyCoraCapability[]
  generatedAt: string
  setupComplete: boolean
}

export type FacultyCoraSetupStepId =
  | "preparing"
  | "exploring"
  | "reading"
  | "generating"
  | "finalizing"

export const FACULTY_CORA_SETUP_STEPS: Array<{ id: FacultyCoraSetupStepId; label: string }> = [
  { id: "preparing", label: "Setting things up" },
  { id: "exploring", label: "Exploring CourseCollab context" },
  { id: "reading", label: "Reading course context" },
  { id: "generating", label: "Generating tailored suggestions" },
  { id: "finalizing", label: "Finalizing Cora setup" },
]

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

function findAssessmentLabel(titles: string[], index: number, fallback: string): string {
  const sorted = [...titles].sort((a, b) => a.localeCompare(b))
  return sorted[index] ?? fallback
}

function tailorCapabilityPrompts(
  capabilityId: FacultyCoraCapabilityId,
  base: FacultyCoraCapability,
  course: FacultyCoraCourseSnapshot,
  discipline: FacultyCoraDisciplineProfile,
): string[] {
  const topicA = pickTopic(course.topics, discipline.conceptA, 0)
  const topicB = pickTopic(course.topics, discipline.conceptB, 1)
  const topicC = pickTopic(course.topics, discipline.conceptC, 2)
  const quiz1 = findAssessmentLabel(course.quizTitles, 0, "Quiz 1")
  const quiz2 = findAssessmentLabel(course.quizTitles, 1, "Quiz 3")
  const homework1 = findAssessmentLabel(course.homeworkTitles, 0, "Homework 1")
  const homework2 = findAssessmentLabel(course.homeworkTitles, 1, "Homework 4")
  const lectureLabel = course.lectureTitles[0] ?? "recent lecture"

  switch (capabilityId) {
    case "create":
      return [
        `Generate 5 question bank items on ${topicA}`,
        `Draft a weekly announcement for ${homework1}`,
        `Create flashcards from ${lectureLabel}`,
        `Build a playground question set on ${topicB}`,
      ]
    case "improve":
      return [
        `Improve this quiz for better discrimination`,
        `Make these questions more conceptual on ${topicA}`,
        `Generate better distractors for ${topicB} questions`,
        `Reduce difficulty on ${homework2}`,
      ]
    case "analyze":
      return [
        `Which topics are students missing most in ${course.courseCode}?`,
        `Compare ${homework1} vs ${homework2} difficulty`,
        `Find duplicate questions in my bank`,
        `Summarize ${quiz1} item analysis`,
      ]
    case "explain":
      return [
        `Why are students missing ${topicA} questions?`,
        `Explain common misconceptions on ${topicB}`,
        `Explain this grading trend from Results`,
        `Explain why the AI flagged this submission`,
      ]
    case "automate":
      return [
        `Plan weekly announcements for ${course.courseTitle}`,
        `Generate practice after each quiz this term`,
        `Draft a pre-final review checklist for ${course.courseCode}`,
        `Summarize today's office hours`,
      ]
    case "review":
      return [
        `Review my syllabus for learning outcomes coverage`,
        `Review ${quiz2} for ambiguous wording`,
        `Review flashcards for ${topicC}`,
        `Review project rubric fairness`,
      ]
    case "assistant":
      return [
        `Help me build ${quiz2}`,
        `Help answer this student email about ${topicA}`,
        `Help organize lectures by topic in ${course.courseCode}`,
        `Help analyze grades from the midterm`,
      ]
    case "insights":
      return [
        `What should I focus on this week in ${course.courseCode}?`,
        `Which assessments need attention?`,
        `Summarize student Cora usage trends`,
        `What content gaps should I fill for ${topicA}?`,
      ]
    default:
      return base.examplePrompts
  }
}

export function tailorFacultyCoraCapabilities(
  course: FacultyCoraCourseSnapshot,
  discipline: FacultyCoraDisciplineProfile,
): FacultyCoraCapability[] {
  return FACULTY_CORA_CAPABILITIES.map((capability) => {
    const examplePrompts = tailorCapabilityPrompts(capability.id, capability, course, discipline)
    const description = capability.description.replace(
      "circuits, code, and AI flags",
      `${discipline.label.toLowerCase()} topics, grading trends, and AI flags`,
    )
    return {
      ...capability,
      description: capability.id === "explain" ? description : capability.description,
      examplePrompts,
    }
  })
}

async function buildCourseSnapshot(
  scope: InstructorScope,
  course: InstructorCourse,
): Promise<FacultyCoraCourseSnapshot> {
  const courseScope = { instructorId: scope.instructorId, courseId: course.id }
  const [syllabusRes, bankTopics, practiceTopicsRes, lectures, quizzes, homework] = await Promise.all([
    instructorApi.getSyllabus(courseScope).catch(() => null),
    instructorApi.getQuestionBankTopics(courseScope).catch(() => []),
    instructorApi.getPracticeTopics(courseScope).catch(() => ({ topics: [] })),
    instructorApi.getLectures(courseScope).catch(() => [] as InstructorLecture[]),
    instructorApi.getQuizzes(courseScope, "quiz").catch(() => [] as InstructorQuiz[]),
    instructorApi.getQuizzes(courseScope, "homework").catch(() => [] as InstructorQuiz[]),
  ])

  const syllabusSections = syllabusRes?.syllabus?.sections ?? []
  const syllabusText = syllabusSections
    .slice(0, 6)
    .map((section) => `${section.title} ${stripHtml(section.content.markdown ?? "")}`)
    .join(" ")

  const topics = uniqueStrings([
    ...bankTopics.map((row) => row.name),
    ...(practiceTopicsRes.topics ?? []).map((row) => row.name),
    ...lectures.map((lecture) => lecture.title),
  ])

  const signals = [
    course.course_code,
    course.course_title,
    syllabusRes?.syllabus?.title ?? "",
    syllabusText,
    ...topics,
    ...quizzes.map((row) => row.title),
    ...homework.map((row) => row.title),
  ]

  const discipline = inferFacultyCoraDiscipline(signals)

  return {
    courseId: course.id,
    courseCode: course.course_code,
    courseTitle: course.course_title,
    disciplineId: discipline.id,
    disciplineLabel: discipline.label,
    topics,
    quizTitles: uniqueStrings(quizzes.map((row) => row.title)),
    homeworkTitles: uniqueStrings(homework.map((row) => row.title)),
    lectureTitles: lectures.map((lecture) => `Week ${lecture.week}: ${lecture.title}`),
    syllabusExcerpt: syllabusText.slice(0, 280) || undefined,
  }
}

export async function buildFacultyCoraInstructorContext(
  scope: InstructorScope,
  options: {
    instructorName?: string
    courses: InstructorCourse[]
    activeCourse: InstructorCourse
  },
): Promise<FacultyCoraInstructorContext> {
  const courseSnapshots = await Promise.all(
    options.courses.map((course) => buildCourseSnapshot(scope, course)),
  )
  const activeCourse =
    courseSnapshots.find((row) => row.courseId === options.activeCourse.id) ??
    (await buildCourseSnapshot(scope, options.activeCourse))

  const discipline = inferFacultyCoraDiscipline([
    activeCourse.courseCode,
    activeCourse.courseTitle,
    activeCourse.disciplineLabel,
    ...activeCourse.topics,
    activeCourse.syllabusExcerpt ?? "",
  ])

  const tailoredCapabilities = tailorFacultyCoraCapabilities(activeCourse, discipline)

  return {
    version: FACULTY_CORA_CONTEXT_VERSION,
    instructorId: scope.instructorId,
    instructorName: options.instructorName,
    activeCourseId: activeCourse.courseId,
    courses: courseSnapshots,
    activeCourse,
    discipline,
    tailoredCapabilities,
    generatedAt: new Date().toISOString(),
    setupComplete: true,
  }
}

export async function runFacultyCoraContextSetup(
  scope: InstructorScope,
  options: {
    instructorName?: string
    courses: InstructorCourse[]
    activeCourse: InstructorCourse
    onStep?: (step: FacultyCoraSetupStepId) => void
  },
): Promise<FacultyCoraInstructorContext> {
  options.onStep?.("preparing")
  options.onStep?.("exploring")
  let courses = options.courses
  if (courses.length === 0) {
    const response = await instructorApi.getCourses(scope.instructorId).catch(() => null)
    courses = response?.courses ?? [options.activeCourse]
  }
  options.onStep?.("reading")
  options.onStep?.("generating")
  const context = await buildFacultyCoraInstructorContext(scope, {
    instructorName: options.instructorName,
    courses,
    activeCourse: options.activeCourse,
  })
  options.onStep?.("finalizing")
  return context
}
