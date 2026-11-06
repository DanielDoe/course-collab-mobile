import type { PlaygroundCredits } from "./collaboration-api"

export function playgroundCreditsRemaining(credits: PlaygroundCredits | null | undefined): number | "unlimited" {
  if (!credits) return 0
  if (credits.isUnlimited || credits.creditsLimit === "unlimited") return "unlimited"
  return Math.max(0, Number(credits.credits) || 0)
}

export function isPlaygroundOutOfCredits(credits: PlaygroundCredits | null | undefined): boolean {
  const remaining = playgroundCreditsRemaining(credits)
  return remaining !== "unlimited" && remaining <= 0
}

export const PLAYGROUND_OUT_OF_CREDITS_MESSAGE =
  "You've used your weekly playground credits. Upgrade for more sessions or wait until Monday."
