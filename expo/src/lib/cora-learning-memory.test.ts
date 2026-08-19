import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  learningMemoryForApi,
  normalizeCoraLocalStorage,
} from "./cora-learning-memory"
import { deriveVisibleMemoryFacts } from "./cora-memory-facts"
import {
  redactPiiFromText,
  sanitizeMessagesForExternalAi,
} from "./cora-privacy-minimization"

describe("cora learning memory", () => {
  it("migrates legacy camelCase storage", () => {
    const migrated = normalizeCoraLocalStorage({
      rememberGaps: false,
      detectConfusion: true,
      localLearningMemory: true,
    })
    assert.equal(migrated.memory["remember-gaps"], false)
    assert.equal(migrated.memory["detect-confusion"], true)
    assert.equal(migrated.memory["remember-strengths"], true)
  })

  it("disables all memory flags when master toggle is off", () => {
    const api = learningMemoryForApi({
      localLearningMemory: false,
      memory: {
        "remember-gaps": true,
        "detect-confusion": true,
        "remember-strengths": true,
        "use-course-progress": true,
        "remember-preferences": true,
      },
      clearedMemoryIds: [],
    })
    assert.equal(api["remember-gaps"], false)
    assert.equal(api["use-course-progress"], false)
  })

  it("derives visible memory facts from context", () => {
    const facts = deriveVisibleMemoryFacts(
      {
        localLearningMemory: true,
        memory: {
          "remember-gaps": true,
          "detect-confusion": false,
          "remember-strengths": true,
          "use-course-progress": true,
          "remember-preferences": false,
        },
        clearedMemoryIds: [],
      },
      {
        strugglingTopics: ["RC circuits"],
        strengths: ["Ohm's law"],
        account: { studentDbId: 1, courseCode: "EECE 250" },
      },
    )
    assert.ok(facts.some((f) => f.label.includes("RC circuits")))
    assert.ok(facts.some((f) => f.label.includes("Ohm's law")))
    assert.ok(facts.some((f) => f.label.includes("EECE 250")))
  })
})

describe("cora message sanitization", () => {
  it("redacts emails from text", () => {
    const out = redactPiiFromText("Email me at test@example.com")
    assert.match(out, /\[redacted-email\]/)
  })

  it("sanitizes message arrays", () => {
    const out = sanitizeMessagesForExternalAi([{ role: "user", content: "student_id=570 test@example.com" }])
    assert.match(out[0].content, /\[redacted-email\]/)
    assert.match(out[0].content, /\[redacted-id\]/)
  })
})
