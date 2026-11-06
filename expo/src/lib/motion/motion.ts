/** Semantic timing tokens. Keep micro-interactions in the 120–250ms range. */
export const motion = {
  instant: 0,
  fast: 140,
  normal: 200,
  slow: 280,
} as const

export type MotionDuration = (typeof motion)[keyof typeof motion]

/** Press-in is shorter than release so the control feels immediate. */
export const PRESS_IN_MS = 80
export const PRESS_OUT_MS = motion.fast

/** Card / row press scale — physical, not playful. */
export const PRESS_SCALE = 0.98

/** FAB / + control press scale. */
export const FAB_PRESS_SCALE = 0.94

/** Navigation tap-guard window for the same destination. */
export const NAV_GUARD_MS = 420
