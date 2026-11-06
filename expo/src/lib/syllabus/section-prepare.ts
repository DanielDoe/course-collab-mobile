import type { PreparedSyllabus, SyllabusPayload, SyllabusSection, SyllabusTableBlock } from "./types"

const EXAM_SECTION_ID = "exam-quiz-schedule"
const SCHEDULE_SECTION_ID = "schedule-assessments"

function mergeExamScheduleIntoAssessments(sections: SyllabusSection[]): SyllabusSection[] {
  const examSection = sections.find((s) => s.sectionId === EXAM_SECTION_ID)
  if (!examSection?.content?.columns?.length) {
    return sections.filter((s) => s.sectionId !== EXAM_SECTION_ID || s.isVisible !== false)
  }

  const examTable: SyllabusTableBlock = {
    title: "Recommended Exam and Quiz Dates",
    columns: examSection.content.columns,
    rows: examSection.content.rows ?? []}

  return sections
    .filter((s) => s.sectionId !== EXAM_SECTION_ID)
    .map((section) => {
      if (section.sectionId !== SCHEDULE_SECTION_ID) return section

      const existingTables = section.content?.tables ?? []
      const hasExamTable = existingTables.some((t) => /exam|quiz|assessment/i.test(t.title ?? ""))

      return {
        ...section,
        content: {
          ...section.content,
          tables: hasExamTable ? existingTables : [...existingTables, examTable]}}
    })
}

/** Normalize any course syllabus for student display (merge, filter, sort). */
export function prepareStudentSyllabusSections(sections: SyllabusSection[]): SyllabusSection[] {
  return mergeExamScheduleIntoAssessments(sections)
    .filter((s) => s.isVisible !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
}

export function prepareSyllabusForDisplay(
  syllabus: SyllabusPayload | null | undefined,
  fallbackTitle = "Syllabus",
): PreparedSyllabus {
  return {
    title: syllabus?.title?.trim() || fallbackTitle,
    term: syllabus?.term?.trim() || undefined,
    contentMode: syllabus?.contentMode,
    pdfUrl: syllabus?.pdfUrl ?? null,
    sections: prepareStudentSyllabusSections(syllabus?.sections ?? [])}
}
