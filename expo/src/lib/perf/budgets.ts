/** Diagnostics only — never used to skip auth, hide errors, or drop writes. */
export const PERF_BUDGETS = {
  apiMs: 300,
  payloadBytes: 80_000,
  imageThumbBytes: 40_000,
  coraTurnMs: 4_000,
} as const
