import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildPracticeTopicInsights, buildStudentActivityLog } from "./student-analytics"

describe("buildStudentActivityLog", () => {
  it("builds dated quiz, homework, practice, and CodeBench events newest first", () => {
    const events = buildStudentActivityLog({
      quizzes: [
        {
          quiz_id: 10,
          quiz_title: "Quiz 3",
          attempts: [
            { attempt_id: 201, percentage: 88, completed_at: "2026-09-08T16:00:00.000Z" },
            { attempt_id: 200, percentage: 40, completed_at: null },
          ],
        },
      ],
      homework: [
        {
          id: 4,
          title: "Homework 2",
          attempts: [{ id: 88, percentage: 91, completed_at: "2026-09-09T12:00:00.000Z" }],
        },
      ],
      practice: [{ id: 3, topic: "Pointers", score: 0.7, created_at: "2026-09-07T09:00:00.000Z" }],
      codebench: [{ pointsAwarded: 12, submittedAt: "2026-09-06T18:00:00.000Z" }],
    })

    assert.equal(events[0]?.title, "Homework 2")
    assert.equal(events[0]?.kind, "homework")
    assert.equal(events[0]?.href, "/results/88?type=homework&from=quiz-history")
    assert.equal(events[1]?.title, "Quiz 3")
    assert.equal(events[1]?.href, "/results/201?type=quiz&from=quiz-history")
    assert.equal(events[2]?.kind, "practice")
    assert.match(events[2]?.detail ?? "", /70%/)
    assert.equal(events[3]?.kind, "codebench")
    assert.equal(events.some((row) => row.detail === "Completed" && row.title === "Quiz 3"), false)
  })

  it("skips undated attempts so the log is not padded with empty rows", () => {
    assert.deepEqual(
      buildStudentActivityLog({
        quizzes: [{ quiz_title: "Quiz 1", attempts: [{ attempt_id: 1, percentage: 50 }] }],
        homework: [],
        practice: [],
        codebench: [{ pointsAwarded: 4 }],
      }),
      [],
    )
  })
})

describe("buildPracticeTopicInsights", () => {
  it("uses practiced topics only and picks the weakest as focus", () => {
    const result = buildPracticeTopicInsights([
      { name: "Loops", questionCount: 20, completed: 8, correct: 3, accuracy: 38, lastPracticed: "2026-09-01" },
      { name: "STL", questionCount: 12, completed: 10, correct: 9, accuracy: 90, lastPracticed: "2026-09-02" },
      { name: "Recursion", questionCount: 6, completed: 0, correct: 0, accuracy: 0, lastPracticed: null },
    ])

    assert.deepEqual(
      result.topics.map((row) => row.topic),
      ["Loops", "STL"],
    )
    assert.equal(result.focusTopic, "Loops")
    assert.equal(result.strongestTopic, "STL")
    assert.equal(result.practiceNext, "Loops")
  })
})
