import { useMemo } from "react"
import { useWindowDimensions } from "react-native"
import { useChromeBottomInset, useChromeTopInset } from "../context/ChromeInsetContext"
import {
  MODULE_LIST_DUAL_PAGER_HEIGHT,
  MODULE_LIST_PAGER_HEIGHT,
  resolveModuleListPageSize,
  type ModuleListPagePreset,
  type ModuleListPageSizeOptions,
} from "../lib/module-list-pager"

type Options = Pick<
  ModuleListPageSizeOptions,
  "rowHeight" | "rowGap" | "pagerHeight" | "minPageSize" | "maxPageSize" | "viewportBuffer" | "contentTopGap"
> & {
  preset?: ModuleListPagePreset
  dualPager?: boolean
}

export function useModuleListPageSize(options?: Options): number {
  const { height: windowHeight } = useWindowDimensions()
  const chromeTop = useChromeTopInset()
  const chromeBottom = useChromeBottomInset()
  const preset = options?.preset ?? "standard"
  const pagerHeight =
    options?.pagerHeight ??
    (options?.dualPager ? MODULE_LIST_DUAL_PAGER_HEIGHT : MODULE_LIST_PAGER_HEIGHT)

  return useMemo(
    () =>
      resolveModuleListPageSize({
        windowHeight,
        topInset: chromeTop,
        bottomInset: chromeBottom,
        preset,
        pagerHeight,
        rowHeight: options?.rowHeight,
        rowGap: options?.rowGap,
        minPageSize: options?.minPageSize,
        maxPageSize: options?.maxPageSize,
        viewportBuffer: options?.viewportBuffer,
        contentTopGap: options?.contentTopGap,
      }),
    [
      windowHeight,
      chromeTop,
      chromeBottom,
      preset,
      pagerHeight,
      options?.rowHeight,
      options?.rowGap,
      options?.minPageSize,
      options?.maxPageSize,
      options?.viewportBuffer,
      options?.contentTopGap,
    ],
  )
}

/** @deprecated Prefer useModuleListPageSize({ preset: "standard" }). */
export function useLectureListPageSize(options?: Omit<Options, "preset">): number {
  return useModuleListPageSize({ ...options, preset: "standard" })
}

/** @deprecated Prefer useModuleListPageSize({ preset: "tall" }). */
export function useFacultyLectureListPageSize(): number {
  return useModuleListPageSize({ preset: "tall" })
}
