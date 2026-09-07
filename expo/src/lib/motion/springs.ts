/** Shared spring configs. Prefer these over per-screen damping/stiffness. */
export const spring = {
  snappy: { damping: 26, stiffness: 320, mass: 0.7 },
  standard: { damping: 24, stiffness: 280, mass: 0.9 },
  gentle: { damping: 22, stiffness: 220, mass: 1 },
  /** Drawer panel — keep existing tuned physics. */
  drawer: { damping: 26, stiffness: 290, mass: 0.82 },
  /** Pill tab thumb — lively glide with a soft settle. */
  pill: { damping: 19, stiffness: 290, mass: 0.78 },
  /** Faculty underline tab indicator — crisp but smooth. */
  faculty: { damping: 22, stiffness: 340, mass: 0.72 },
} as const

export type SpringPreset = (typeof spring)[keyof typeof spring]
