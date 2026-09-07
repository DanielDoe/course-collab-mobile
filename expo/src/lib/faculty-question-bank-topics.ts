/** Compact browse cards — matches faculty notification / playground paging density. */
export const QUESTION_BANK_BROWSE_PAGE_SIZE = 8
export const QUESTION_BANK_TOPICS_PAGE_SIZE = QUESTION_BANK_BROWSE_PAGE_SIZE

function matchesBrowseSearch(parts: Array<string | null | undefined>, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return parts.filter(Boolean).join(" ").toLowerCase().includes(q)
}

export function filterBankTopics<T extends { name: string; description?: string | null }>(
  topics: T[],
  search: string,
): T[] {
  return topics.filter((topic) => matchesBrowseSearch([topic.name, topic.description], search))
}

export function filterBankTypes<T extends { label: string; type?: string; description?: string | null }>(
  rows: T[],
  search: string,
): T[] {
  return rows.filter((row) => matchesBrowseSearch([row.label, row.type, row.description], search))
}

export function questionBankBrowsePageCount(
  total: number,
  pageSize = QUESTION_BANK_BROWSE_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize))
}

export function sliceQuestionBankBrowsePage<T>(
  items: T[],
  page: number,
  pageSize = QUESTION_BANK_BROWSE_PAGE_SIZE,
): T[] {
  const pageCount = questionBankBrowsePageCount(items.length, pageSize)
  const safe = Math.min(Math.max(0, page), pageCount - 1)
  return items.slice(safe * pageSize, safe * pageSize + pageSize)
}

export function questionBankBrowsePageLabel(
  noun: string,
  total: number,
  page: number,
  pageSize = QUESTION_BANK_BROWSE_PAGE_SIZE,
): string {
  if (total <= 0) return `0 ${noun}`
  const pageCount = questionBankBrowsePageCount(total, pageSize)
  const safe = Math.min(Math.max(0, page), pageCount - 1)
  const start = safe * pageSize + 1
  const end = Math.min(total, (safe + 1) * pageSize)
  return `Showing ${start}–${end} of ${total}`
}

export const questionBankTopicPageCount = questionBankBrowsePageCount
export const sliceQuestionBankTopicPage = sliceQuestionBankBrowsePage

export function questionBankTopicPageLabel(
  total: number,
  page: number,
  pageSize = QUESTION_BANK_BROWSE_PAGE_SIZE,
): string {
  return questionBankBrowsePageLabel("topics", total, page, pageSize)
}

export function questionBankTypePageLabel(
  total: number,
  page: number,
  pageSize = QUESTION_BANK_BROWSE_PAGE_SIZE,
): string {
  return questionBankBrowsePageLabel("types", total, page, pageSize)
}
