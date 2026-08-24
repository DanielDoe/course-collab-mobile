import type { DailyChallenge } from "./codebench-api"

/** Markdown shown in the CodeBench practice panel for today's daily challenge. */
export function formatDailyChallengeProblem(challenge: DailyChallenge): string {
  const title = challenge.title.trim()
  const description = challenge.description.trim()
  if (!description) {
    return title ? `# ${title}` : "Daily challenge"
  }
  if (/^#+\s/m.test(description)) {
    return title && !description.toLowerCase().includes(title.toLowerCase())
      ? `# ${title}\n\n${description}`
      : description
  }
  const meta = [
    challenge.difficulty ? `**Difficulty:** ${challenge.difficulty}` : "",
    challenge.xpReward ? `**Reward:** ${challenge.xpReward} XP` : "",
  ].filter(Boolean)
  return [`# ${title || "Daily Challenge"}`, "", description, meta.length ? `\n${meta.join(" · ")}` : ""]
    .filter(Boolean)
    .join("\n")
    .trim()
}
