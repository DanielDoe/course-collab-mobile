import { useCallback, useEffect, useMemo, useState } from "react"
import {
  facultyListPageCount,
  facultyListPageLabel,
  sliceFacultyListPage,
} from "../lib/faculty-list-pager"
import type { ModuleListPagePreset } from "../lib/module-list-pager"
import { useModuleListPageSize } from "./useModuleListPageSize"

export type ModuleListPagerOptions = {
  /** Explicit page size — skips dynamic sizing. */
  pageSize?: number
  preset?: ModuleListPagePreset
  dualPager?: boolean
  minPageSize?: number
  maxPageSize?: number
  viewportBuffer?: number
}

function normalizePagerOptions(options?: number | ModuleListPagerOptions): ModuleListPagerOptions {
  if (typeof options === "number") {
    return { pageSize: options }
  }
  return options ?? {}
}

export function useFacultyListPager<T>(
  items: T[],
  resetKey: string,
  noun = "items",
  options?: number | ModuleListPagerOptions,
) {
  const normalized = normalizePagerOptions(options)
  const dynamicPageSize = useModuleListPageSize({
    preset: normalized.preset ?? "standard",
    dualPager: normalized.dualPager,
    minPageSize: normalized.minPageSize,
    maxPageSize: normalized.maxPageSize,
    viewportBuffer: normalized.viewportBuffer,
  })
  const pageSize = normalized.pageSize ?? dynamicPageSize
  const effectiveResetKey = `${resetKey}|${pageSize}`

  const [page, setPage] = useState(0)
  const pageCount = facultyListPageCount(items.length, pageSize)
  const safePage = Math.min(page, pageCount - 1)
  const paged = useMemo(
    () => sliceFacultyListPage(items, safePage, pageSize),
    [items, safePage, pageSize],
  )

  useEffect(() => {
    setPage(0)
  }, [effectiveResetKey])

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(Math.max(0, pageCount - 1))
    }
  }, [page, pageCount])

  const setPageClamped = useCallback(
    (next: number) => {
      setPage(Math.min(Math.max(0, next), Math.max(0, pageCount - 1)))
    },
    [pageCount],
  )

  const stepPage = useCallback(
    (delta: number) => {
      setPage((current) => {
        const max = Math.max(0, pageCount - 1)
        const clamped = Math.min(Math.max(0, current), max)
        return Math.min(Math.max(0, clamped + delta), max)
      })
    },
    [pageCount],
  )

  return {
    items: paged,
    page: safePage,
    pageCount,
    pageSize,
    setPage: setPageClamped,
    stepPage,
    label: facultyListPageLabel(noun, items.length, safePage, pageSize),
    total: items.length,
  }
}
