import type { MembershipTier } from "../types/dashboard"
import type { PracticeConfigResponse, TopicProgress } from "./practice-api"

/** Scholar: no practice access. Explorer: unlocked pool only. Trailblazer: full topic bank. */
export function resolvePracticeSessionQuestionCount(
  tier: MembershipTier,
  topic: TopicProgress,
  _config: PracticeConfigResponse,
): number {
  if (tier === "Scholar") return 0

  const unlockedPool = practiceTopicUnlockedCount(topic, tier)
  const practiced = topic.completed
  const newInTopic = Math.max(0, unlockedPool - practiced)
  const pool = unlockedPool > 0 ? unlockedPool : newInTopic

  return Math.max(1, pool)
}

export function practiceTopicUnlockedCount(topic: TopicProgress, tier?: MembershipTier): number {
  if (tier === "Trailblazer") return topic.questionCount
  if (tier === "Explorer") {
    const fromApi = topic.unlockedCount
    if (fromApi != null && fromApi > 0) return fromApi
    if (topic.questionCount > 0) return Math.max(1, Math.ceil(topic.questionCount * 0.5))
    return 0
  }
  return topic.unlockedCount ?? (tier === "Scholar" ? 0 : topic.questionCount)
}

export function isPracticeTopicLocked(
  topic: TopicProgress,
  canStartPractice: boolean,
  tier?: MembershipTier,
): boolean {
  if (!canStartPractice) return true
  return practiceTopicUnlockedCount(topic, tier) <= 0
}
