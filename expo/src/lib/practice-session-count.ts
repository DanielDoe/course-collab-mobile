import type { MembershipTier } from "../types/dashboard"
import type { PracticeConfigResponse, TopicProgress } from "./practice-api"

/** Scholar: no practice access. Explorer: unlocked pool only. Trailblazer: full topic bank. */
export function resolvePracticeSessionQuestionCount(
  tier: MembershipTier,
  topic: TopicProgress,
  _config: PracticeConfigResponse,
): number {
  if (tier === "Scholar") return 0

  const unlockedPool = topic.unlockedCount ?? topic.questionCount
  const practiced = topic.completed
  const newInTopic = Math.max(0, unlockedPool - practiced)
  const pool = unlockedPool > 0 ? unlockedPool : newInTopic

  return Math.max(1, pool)
}

export function practiceTopicUnlockedCount(topic: TopicProgress): number {
  return topic.unlockedCount ?? topic.questionCount
}

export function isPracticeTopicLocked(topic: TopicProgress, canStartPractice: boolean): boolean {
  if (!canStartPractice) return true
  return practiceTopicUnlockedCount(topic) <= 0
}
