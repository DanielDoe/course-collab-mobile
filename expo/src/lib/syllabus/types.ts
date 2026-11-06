/** Mirrors backend syllabus section shapes — works for any course template. */
export type SyllabusSectionType =
  | "text"
  | "table"
  | "list"
  | "policy"
  | "schedule"
  | "grading"
  | string

export type SyllabusTableBlock = {
  title?: string
  columns: string[]
  rows: string[][]
}

export type SyllabusSectionContent = {
  markdown?: string
  fields?: Record<string, string>
  columns?: string[]
  rows?: string[][]
  tables?: SyllabusTableBlock[]
  items?: string[]
  imageUrl?: string
  imageCaption?: string
  documentUrl?: string
  documentFileName?: string
}

export type SyllabusSection = {
  sectionId?: string
  id?: string
  title: string
  order?: number
  type?: SyllabusSectionType
  isVisible?: boolean
  content?: SyllabusSectionContent
  body?: string
}

export type SyllabusPayload = {
  title?: string
  term?: string
  contentMode?: string
  pdfUrl?: string | null
  sections?: SyllabusSection[]
}

export type PreparedSyllabus = {
  title: string
  term?: string
  contentMode?: string
  pdfUrl?: string | null
  sections: SyllabusSection[]
}
