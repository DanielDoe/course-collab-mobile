import type { DailyChallenge } from "./codebench-api"

let pendingDailyChallenge: DailyChallenge | null = null

export function stashPendingDailyChallenge(challenge: DailyChallenge): void {
  pendingDailyChallenge = challenge
}

/** Returns and clears the stashed daily challenge (one-shot handoff into the IDE). */
export function consumePendingDailyChallenge(): DailyChallenge | null {
  const value = pendingDailyChallenge
  pendingDailyChallenge = null
  return value
}

export function peekPendingDailyChallenge(): DailyChallenge | null {
  return pendingDailyChallenge
}

export function clearPendingDailyChallenge(): void {
  pendingDailyChallenge = null
}
