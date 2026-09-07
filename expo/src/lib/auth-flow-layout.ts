import {
  COMPACT_PHONE_MAX_WIDTH,
  LARGE_TABLET_MIN_WIDTH,
  TABLET_MIN_WIDTH,
} from "./responsive-layout-breakpoints"

/** Phone max width for onboarding/legal scroll areas. */
export const AUTH_FLOW_PHONE_MAX_WIDTH = 560

/** Phone max width for login forms and compact auth steps. */
export const AUTH_FORM_PHONE_MAX_WIDTH = 440

/** Extra vertical breathing room below safe area on auth screens (welcome + sign-in). */
export const AUTH_FLOW_VERTICAL_PADDING = 32

/** Upper cap for auth flow content on large tablets (readability). */
export const AUTH_FLOW_TABLET_MAX_WIDTH = 920

/** Short-phone height — iPhone SE, landscape phones. */
export const AUTH_COMPACT_HEIGHT_MAX = 700

/** Tall-phone height — iPhone Pro Max class. Extra slack vs 17 Pro (~874). */
export const AUTH_TALL_PHONE_MIN_HEIGHT = 900

/** Very short viewport — prefer top-aligned scroll over vertical centering. */
export const AUTH_MIN_CENTER_HEIGHT = 580

export function authFlowIsTallPhone(screenWidth: number, screenHeight: number): boolean {
  return screenHeight >= AUTH_TALL_PHONE_MIN_HEIGHT && screenWidth < TABLET_MIN_WIDTH
}

/**
 * Extra top/bottom padding that optically centers auth content inside a ScrollView.
 * iOS ignores flexGrow + justifyContent on ScrollView children, so padding slack is reliable.
 */
export function authFlowCenterSlack(input: {
  viewportH: number
  contentH: number
  padTop: number
  padBottom: number
  shouldCenter: boolean
}): number {
  if (!input.shouldCenter || input.viewportH <= 0 || input.contentH <= 0) return 0
  const available = input.viewportH - input.padTop - input.padBottom
  if (input.contentH >= available) return 0
  return Math.round((available - input.contentH) / 2)
}

export function authFlowHorizontalPadding(screenWidth: number): number {
  if (screenWidth >= LARGE_TABLET_MIN_WIDTH) return 48
  if (screenWidth >= TABLET_MIN_WIDTH) return 32
  if (screenWidth <= COMPACT_PHONE_MAX_WIDTH) return 16
  return 20
}

/** Onboarding/legal steps — slightly tighter gutters so copy uses more of the phone canvas. */
export function authFlowOnboardingHorizontalPadding(screenWidth: number): number {
  if (screenWidth >= LARGE_TABLET_MIN_WIDTH) return 36
  if (screenWidth >= TABLET_MIN_WIDTH) return 24
  if (screenWidth <= COMPACT_PHONE_MAX_WIDTH) return 12
  return 14
}

export function authFlowOnboardingContentMaxWidth(screenWidth: number): number {
  if (screenWidth < TABLET_MIN_WIDTH) {
    return screenWidth - 24
  }
  return authFlowContentMaxWidth(screenWidth, AUTH_FLOW_PHONE_MAX_WIDTH)
}

export function authFlowVerticalPadding(
  screenHeight: number,
  keyboardVisible = false,
  isLandscape = false,
): number {
  if (keyboardVisible) return 12
  if (isLandscape) return 16
  if (screenHeight < 667) return 12
  if (screenHeight < AUTH_COMPACT_HEIGHT_MAX) return 20
  if (screenHeight < 820) return 24
  return AUTH_FLOW_VERTICAL_PADDING
}

export function authFlowContentGap(screenWidth: number, screenHeight: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) return 20
  if (screenHeight < AUTH_COMPACT_HEIGHT_MAX) return 12
  if (authFlowIsTallPhone(screenWidth, screenHeight)) return 20
  return 16
}

export function authFlowStackGap(screenWidth: number, screenHeight: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) return 24
  if (screenHeight < AUTH_COMPACT_HEIGHT_MAX) return 16
  if (authFlowIsTallPhone(screenWidth, screenHeight)) return 24
  return 20
}

export function authFlowShouldCenterVertically(
  screenHeight: number,
  keyboardVisible: boolean,
  isLandscape: boolean,
): boolean {
  if (keyboardVisible) return false
  if (isLandscape && screenHeight < 500) return false
  return screenHeight >= AUTH_MIN_CENTER_HEIGHT
}

/** Typography scale for auth screens — down on compact phones, slightly up on tablet / Pro Max. */
export function authFlowTypeScale(screenWidth: number, screenHeight: number): number {
  if (screenWidth >= TABLET_MIN_WIDTH) return 1.06
  if (screenHeight < 667 || screenWidth <= 320) return 0.92
  if (screenHeight < AUTH_COMPACT_HEIGHT_MAX) return 0.96
  if (authFlowIsTallPhone(screenWidth, screenHeight)) return 1.04
  return 1
}

export function authFlowContentMaxWidth(
  screenWidth: number,
  phoneMax: number = AUTH_FLOW_PHONE_MAX_WIDTH,
): number {
  const horizontalPad = 40
  if (screenWidth < TABLET_MIN_WIDTH) {
    return Math.min(screenWidth - horizontalPad, phoneMax)
  }
  const tabletTarget = Math.min(
    AUTH_FLOW_TABLET_MAX_WIDTH,
    Math.round(screenWidth * 0.85),
  )
  return Math.max(phoneMax, tabletTarget)
}
