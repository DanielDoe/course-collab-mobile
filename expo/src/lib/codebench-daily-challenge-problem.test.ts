import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatDailyChallengeProblem } from "./codebench-daily-challenge-problem"

describe("formatDailyChallengeProblem", () => {
  it("uses markdown description as-is when it already has headings", () => {
    const md = formatDailyChallengeProblem({
      id: "1",
      title: "Count Balanced Prefixes",
      description: "## Problem\nYou are given a sequence of integers…",
      difficulty: "Medium",
      xpReward: 12,
      completed: false,
      date: "2026-08-24",
    })
    assert.match(md, /^## Problem/)
    assert.match(md, /Count Balanced Prefixes/)
  })

  it("wraps plain descriptions with a title and meta", () => {
    const md = formatDailyChallengeProblem({
      id: "2",
      title: "Two Sum",
      description: "Return indices of two numbers that add up to target.",
      difficulty: "Easy",
      xpReward: 8,
      completed: false,
      date: "2026-08-24",
    })
    assert.match(md, /^# Two Sum/)
    assert.match(md, /Return indices/)
    assert.match(md, /Easy/)
    assert.match(md, /8 XP/)
  })
})
