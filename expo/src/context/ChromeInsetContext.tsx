import { createContext, useContext, type ReactNode } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NATIVE } from "../constants/faculty-native-theme"

type ChromeInsetValue = {
  top: number
  bottom: number
}

const ChromeInsetContext = createContext<ChromeInsetValue>({ top: 0, bottom: 0 })

export function ChromeInsetProvider({
  topInset,
  bottomInset = 0,
  children,
}: {
  topInset: number
  bottomInset?: number
  children: ReactNode
}) {
  return (
    <ChromeInsetContext.Provider value={{ top: topInset, bottom: bottomInset }}>
      {children}
    </ChromeInsetContext.Provider>
  )
}

/** Extra scroll padding when the top bar floats over content (Liquid Glass / blur chrome). */
export function useChromeTopInset(): number {
  return useContext(ChromeInsetContext).top
}

/** Extra scroll padding when the bottom search dock floats over content. */
export function useChromeBottomInset(): number {
  return useContext(ChromeInsetContext).bottom
}

/** Breathing room between floating top chrome and the first content row. */
export const CHROME_CONTENT_TOP_GAP = 16

/** Scroll content padding when top/bottom chrome floats over the page. */
export function useChromeScrollPadding(extraBottom = 24, extraTop = CHROME_CONTENT_TOP_GAP) {
  const insets = useSafeAreaInsets()
  const chromeTop = useChromeTopInset()
  const chromeBottom = useChromeBottomInset()
  return {
    paddingBottom: insets.bottom + extraBottom + chromeBottom,
    paddingTop: chromeTop > 0 ? chromeTop + extraTop : undefined,
  }
}

/** Top inset for full-screen module layouts (floating chrome or stacked header). */
export function useModuleContentTopPadding(stackedGap: number = NATIVE.pagePadding) {
  const chromeTop = useChromeTopInset()
  return chromeTop > 0 ? chromeTop + CHROME_CONTENT_TOP_GAP : stackedGap
}

/** Top + bottom scroll padding for module screens (floating chrome or stacked header). */
export function useModuleScrollContentPadding(extraBottom = 24, extraTop = CHROME_CONTENT_TOP_GAP) {
  const insets = useSafeAreaInsets()
  const chromeTop = useChromeTopInset()
  const chromeBottom = useChromeBottomInset()
  return {
    paddingBottom: insets.bottom + extraBottom + chromeBottom,
    paddingTop: chromeTop > 0 ? chromeTop + extraTop : extraTop,
  }
}
