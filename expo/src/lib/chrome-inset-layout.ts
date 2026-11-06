/** Breathing room between floating top chrome and the first content row. */
export const CHROME_CONTENT_TOP_GAP = 12

/** Kept at 0 so list, tab, and dashboard screens share the same 12pt gap. */
export const CHROME_FLOATING_CONTENT_EXTRA_GAP = 0

export function floatingChromeSpacerHeight(
  chromeTop: number,
  contentGap: number = CHROME_CONTENT_TOP_GAP,
  extraGap: number = CHROME_FLOATING_CONTENT_EXTRA_GAP,
): number {
  if (chromeTop <= 0) return 0
  return chromeTop + contentGap + extraGap
}

/**
 * Header → first content (card, tabs, or action row).
 * Same number for list modules, tabbed modules, and sticky faculty chrome.
 */
export function moduleHeaderContentTop(
  chromeTop: number,
  contentGap: number = CHROME_CONTENT_TOP_GAP,
): number {
  if (chromeTop <= 0) return contentGap
  return floatingChromeSpacerHeight(chromeTop, contentGap)
}
