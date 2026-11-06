import type { SyllabusSection } from "../instructor-api"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const templateJson = require("../../data/syllabus-generic-template.json") as {
  title: string
  term: string
  sections: SyllabusSection[]
}

export type SyllabusTemplateDefaults = {
  title: string
  term: string
  sections: SyllabusSection[]
}

function cloneSection(section: SyllabusSection): SyllabusSection {
  const content = section.content
  return {
    ...section,
    content: {
      markdown: content.markdown,
      fields: content.fields ? { ...content.fields } : undefined,
      columns: content.columns ? [...content.columns] : undefined,
      rows: content.rows ? content.rows.map((row) => [...row]) : undefined,
      items: content.items ? [...content.items] : undefined,
      tables: content.tables
        ? content.tables.map((table) => ({
            title: table.title,
            columns: [...table.columns],
            rows: table.rows.map((row) => [...row]),
          }))
        : undefined,
    },
  }
}

/** Deep copy of the generic syllabus template (matches web Load template). */
export function getDefaultSyllabusTemplate(
  overrides?: Partial<{ title: string; term: string; courseCode: string; courseTitle: string }>,
): SyllabusTemplateDefaults {
  const title =
    overrides?.title ??
    (overrides?.courseCode && overrides?.courseTitle
      ? `${overrides.courseCode} — ${overrides.courseTitle} Syllabus`
      : templateJson.title)
  const term = overrides?.term ?? templateJson.term

  const sections = templateJson.sections.map(cloneSection)

  if (overrides?.courseCode || overrides?.courseTitle) {
    const header = sections.find((s) => s.sectionId === "course-header")
    if (header?.content?.fields) {
      if (overrides.courseCode) header.content.fields["Course Code"] = overrides.courseCode
      if (overrides.courseTitle) header.content.fields["Course Title"] = overrides.courseTitle
    }
  }

  return { title, term, sections }
}
