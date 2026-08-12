import { getSyllabusSectionDisplayTitle } from "./section-titles"
import type { SyllabusSection, SyllabusTableBlock } from "./types"

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function textMatchesQuery(text: string, query: string): boolean {
  const q = normalizeSearchQuery(query)
  if (!q) return true
  return text.toLowerCase().includes(q)
}

function tableSearchText(table: SyllabusTableBlock): string {
  const parts: string[] = []
  if (table.title) parts.push(table.title)
  parts.push(...table.columns)
  parts.push(...(table.rows ?? []).flat())
  return parts.join(" ")
}

export function syllabusSectionSearchText(section: SyllabusSection): string {
  const parts: string[] = [getSyllabusSectionDisplayTitle(section), section.title]
  const content = section.content

  if (section.body) parts.push(section.body)
  if (content?.markdown) parts.push(content.markdown)
  if (content?.items) parts.push(...content.items)
  if (content?.fields) parts.push(...Object.entries(content.fields).flat())
  if (content?.rows) parts.push(...content.rows.flat())
  if (content?.columns) parts.push(...content.columns)
  if (content?.imageCaption) parts.push(content.imageCaption)
  if (content?.tables) {
    for (const table of content.tables) parts.push(tableSearchText(table))
  }

  return parts.join(" ").toLowerCase()
}

export function filterSyllabusSections(sections: SyllabusSection[], query: string): SyllabusSection[] {
  const q = normalizeSearchQuery(query)
  if (!q) return sections
  return sections.filter((section) => syllabusSectionSearchText(section).includes(q))
}

export function filterSyllabusFieldEntries(
  entries: Array<[string, string]>,
  query: string,
): Array<[string, string]> {
  const q = normalizeSearchQuery(query)
  if (!q) return entries
  return entries.filter(([label, value]) => textMatchesQuery(`${label} ${value}`, query))
}

export function filterSyllabusItems(items: string[], query: string): string[] {
  const q = normalizeSearchQuery(query)
  if (!q) return items
  return items.filter((item) => textMatchesQuery(item, query))
}

export function filterSyllabusTable(
  table: SyllabusTableBlock,
  query: string,
): SyllabusTableBlock | null {
  if (!table.columns.length) return null
  const q = normalizeSearchQuery(query)
  if (!q) return table

  const titleMatches = table.title ? textMatchesQuery(table.title, q) : false
  const headerMatches = table.columns.some((col) => textMatchesQuery(col, q))
  const matchingRows = (table.rows ?? []).filter((row) => textMatchesQuery(row.join(" "), q))

  if (titleMatches || headerMatches) return table
  if (matchingRows.length > 0) return { ...table, rows: matchingRows }
  if (textMatchesQuery(tableSearchText(table), q)) return table
  return null
}

export function filterSyllabusMarkdownBlocks(markdown: string, query: string): string[] {
  const trimmed = markdown.trim()
  if (!trimmed) return []

  const q = normalizeSearchQuery(query)
  if (!q) return [trimmed]
  if (!textMatchesQuery(trimmed, q)) return []

  const chunks = trimmed.split(/(?=^#{2,3}\s)/m).filter(Boolean)
  if (chunks.length <= 1) return [trimmed]

  const matching = chunks.filter((chunk) => textMatchesQuery(chunk, q))
  return matching.length > 0 ? matching : [trimmed]
}

export function syllabusSectionHasVisibleContent(
  section: SyllabusSection,
  query: string,
  visible: {
    fieldEntries: Array<[string, string]>
    items: string[]
    markdownBlocks: string[]
    tables: SyllabusTableBlock[]
    legacyTable: SyllabusTableBlock | null
    imageUrl?: string
  },
): boolean {
  if (!normalizeSearchQuery(query)) return true
  return Boolean(
    visible.fieldEntries.length ||
      visible.items.length ||
      visible.markdownBlocks.length ||
      visible.tables.length ||
      visible.legacyTable ||
      (visible.imageUrl && textMatchesQuery(visible.imageUrl, query)),
  )
}
