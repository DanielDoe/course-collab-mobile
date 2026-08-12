import type { SyllabusSection } from "./types"

/** Friendly accordion titles keyed by stable section ids (same across courses). */
const DISPLAY_TITLES: Record<string, string> = {
  "course-header": "Course Overview",
  "instructor-info": "Instructor Information",
  "general-course-info": "General Course Information",
  "objectives-outcomes": "Course Objectives and Student Learning Outcomes",
  "required-materials": "Required Instructional Materials",
  "schedule-assessments": "Course Schedule, Assignments, and Assessments",
  "exam-quiz-schedule": "Exam and Quiz Schedule",
  "lecture-topics": "Discussion and Lecture Topics",
  grading: "Grading Rubrics and Weights",
  "course-policies": "Course Policies and Procedures",
  "university-policies": "University Policies and Student Support Resources"}

const LEGACY_TITLE_ALIASES: Record<string, string> = {
  "Course Header": "Course Overview",
  "Course Objectives and Learning Outcomes": "Course Objectives and Student Learning Outcomes"}

export function getSyllabusSectionId(section: SyllabusSection, index = 0): string {
  return String(section.sectionId ?? section.id ?? index)
}

export function getSyllabusSectionDisplayTitle(section: SyllabusSection): string {
  const sectionId = section.sectionId ?? section.id ?? ""
  if (sectionId && DISPLAY_TITLES[sectionId]) return DISPLAY_TITLES[sectionId]
  if (LEGACY_TITLE_ALIASES[section.title]) return LEGACY_TITLE_ALIASES[section.title]
  return section.title.trim() || "Syllabus Section"
}
