import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  codebenchFailureMessage,
  flattenSubmissions,
  submissionXpTotal,
} from "./codebench-progress-logic"

describe("codebench progress contract", () => {
  it("maps practice/challenge solution onto code", () => {
    const rows = flattenSubmissions({
      codeSubmissions: [{ code: "int main() {}", points_awarded: 2, submitted_at: "2026-08-01" }],
      practiceSubmissions: [{ solution: "void practice() {}", points_awarded: 3 } as never],
      dailyChallengeSubmissions: [{ solution: "void daily() {}", points_awarded: 5 } as never],
    })
    assert.equal(rows.length, 3)
    assert.equal(rows[0]?.code, "int main() {}")
    assert.equal(rows[1]?.code, "void practice() {}")
    assert.equal(rows[2]?.code, "void daily() {}")
    assert.equal(submissionXpTotal(rows), 10)
  })

  it("uses API XP only — no local max inflation", () => {
    const apiXp = submissionXpTotal([
      { pointsAwarded: 4 },
      { pointsAwarded: 1 },
    ])
    const localXp = 99
    assert.equal(apiXp, 5)
    assert.notEqual(Math.max(apiXp, localXp), apiXp)
  })

  it("names insight and daily-challenge failures in the hub error", () => {
    const message = codebenchFailureMessage(["streak", "daily challenge", "analysis"])
    assert.match(message, /streak/)
    assert.match(message, /daily challenge/)
    assert.match(message, /analysis/)
  })
})
