import { modulePageHorizontalPadding } from "./module-page-layout"
import { COMPACT_PHONE_MAX_WIDTH, TABLET_MIN_WIDTH } from "./responsive-layout-breakpoints"

/** Max readable width for message threads on iPad / wide layouts. */
export const MESSAGES_THREAD_MAX_WIDTH = 720

export function messagesBubbleMaxWidthPercent(screenWidth: number): `${number}%` {
  if (screenWidth >= TABLET_MIN_WIDTH) return "62%"
  if (screenWidth <= COMPACT_PHONE_MAX_WIDTH) return "88%"
  return "82%"
}

export function messagesCourseImportBubbleMaxWidthPercent(screenWidth: number): `${number}%` {
  if (screenWidth >= TABLET_MIN_WIDTH) return "72%"
  return "92%"
}

export function messagesAvatarSize(screenWidth: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) return 44
  if (screenWidth <= COMPACT_PHONE_MAX_WIDTH) return 36
  return 40
}

export function messagesThreadRowMinHeight(screenWidth: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) return 76
  if (screenWidth <= COMPACT_PHONE_MAX_WIDTH) return 68
  return 72
}

export function messagesComposerHorizontalInset(screenWidth: number): number {
  return modulePageHorizontalPadding(screenWidth)
}
