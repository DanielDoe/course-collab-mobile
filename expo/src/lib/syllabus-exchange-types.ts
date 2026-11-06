import type { InstructorSyllabus } from "./instructor-api"

export type SyllabusTemplateProvenance = {
  sourceSyllabusId: number
  sourceCourseId: number
  sourceCourseCode: string
  sourceCourseTitle: string
  sourceInstructorId: number
  sourceInstructorName: string
  sourceTerm: string
  sourceSessionCode: string | null
  copiedAt: string
  copyRecordId: number
}

export type DiscoverableSyllabusRow = {
  syllabusId: number
  courseId: number
  sessionId: number | null
  courseCode: string
  courseTitle: string
  sessionCode: string | null
  university: string | null
  title: string
  term: string
  status: InstructorSyllabus["status"]
  contentMode: InstructorSyllabus["contentMode"]
  sectionCount: number
  hasPdf: boolean
  instructorId: number
  instructorName: string
  publishedAt: string | null
  updatedAt: string
  isOwnCourse: boolean
}
