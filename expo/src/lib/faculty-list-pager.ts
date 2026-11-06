/** Shared faculty list paging — Student Directory, letters, question bank, etc. */
export const FACULTY_LIST_PAGE_SIZE = 8

export function facultyListPageCount(
  total: number,
  pageSize = FACULTY_LIST_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize))
}

export function sliceFacultyListPage<T>(
  items: T[],
  page: number,
  pageSize = FACULTY_LIST_PAGE_SIZE,
): T[] {
  const pageCount = facultyListPageCount(items.length, pageSize)
  const safe = Math.min(Math.max(0, page), pageCount - 1)
  return items.slice(safe * pageSize, safe * pageSize + pageSize)
}

export function facultyListPageLabel(
  noun: string,
  total: number,
  page: number,
  pageSize = FACULTY_LIST_PAGE_SIZE,
): string {
  if (total <= 0) return `0 ${noun}`
  const pageCount = facultyListPageCount(total, pageSize)
  const safe = Math.min(Math.max(0, page), pageCount - 1)
  const start = safe * pageSize + 1
  const end = Math.min(total, (safe + 1) * pageSize)
  return `Showing ${start}–${end} of ${total}`
}
