import { getSyllabusFieldEntries, isPolicySyllabusSection } from "./section-fields"
import {
  filterSyllabusFieldEntries,
  filterSyllabusItems,
  filterSyllabusMarkdownBlocks,
  filterSyllabusTable,
  normalizeSearchQuery} from "./section-search"
import type { SyllabusSection, SyllabusTableBlock } from "./types"

export type SyllabusVisibleContent = {
  fieldEntries: Array<[string, string]>
  items: string[]
  markdownBlocks: string[]
  tables: SyllabusTableBlock[]
  legacyTable: SyllabusTableBlock | null
  imageUrl?: string
  imageCaption?: string
  isPolicySection: boolean
}

function legacyTableFromSection(section: SyllabusSection): SyllabusTableBlock | null {
  const content = section.content
  if (!content?.columns?.length) return null
  return { columns: content.columns, rows: content.rows ?? [] }
}

/** Builds the filtered, ordered content blocks to render for any syllabus section. */
export function getSyllabusVisibleContent(section: SyllabusSection, query = ""): SyllabusVisibleContent {
  const content = section.content ?? {}
  const markdown = content.markdown ?? section.body ?? ""
  const fieldEntries = filterSyllabusFieldEntries(getSyllabusFieldEntries(section), query)
  const items = filterSyllabusItems(content.items ?? [], query)
  const markdownBlocks = filterSyllabusMarkdownBlocks(markdown, query)

  const tables = (content.tables ?? [])
    .map((table) => filterSyllabusTable(table, query))
    .filter((table): table is SyllabusTableBlock => Boolean(table))

  const legacyTable = (() => {
    const table = legacyTableFromSection(section)
    if (!table) return null
    return filterSyllabusTable(table, query)
  })()

  return {
    fieldEntries,
    items,
    markdownBlocks,
    tables,
    legacyTable,
    imageUrl: content.imageUrl,
    imageCaption: content.imageCaption,
    isPolicySection: isPolicySyllabusSection(section)}
}

export function syllabusHasRenderableContent(visible: SyllabusVisibleContent): boolean {
  return Boolean(
    visible.fieldEntries.length ||
      visible.items.length ||
      visible.markdownBlocks.length ||
      visible.tables.length ||
      visible.legacyTable ||
      visible.imageUrl,
  )
}

export function defaultExpandedSectionIds(sections: SyllabusSection[], query = ""): Set<string> {
  const q = normalizeSearchQuery(query)
  if (q) {
    return new Set(sections.map((section, index) => String(section.sectionId ?? section.id ?? index)))
  }
  return new Set(sections.map((section, index) => String(section.sectionId ?? section.id ?? index)))
}
