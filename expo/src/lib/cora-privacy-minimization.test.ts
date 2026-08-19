import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  minimizeStudentContextForExternalAi,
  redactProfileForExternalAi,
  resolveExternalAiContextLevel,
} from "./cora-privacy-minimization"
import type { StudentContextPayload } from "./student-context-api"

const sampleContext: StudentContextPayload = {
  profile: {
    email: "student@university.edu",
    phone: "555-0100",
    preferredLanguage: "en",
  },
  account: {
    studentDbId: 42,
    studentCode: "S12345",
    fullName: "Alex Student",
    section: "001",
    courseCode: "EECE 250",
    courseTitle: "Circuits I",
  },
  membership: { tier: "Explorer", aiTutorCredits: 120 },
  strugglingTopics: ["Kirchhoff's Laws"],
  strengths: ["Ohm's Law"],
  grades: [{ session: "001", totalScore: 88, quizScore: 90 }],
  knowledgeGraph: {
    updatedAt: "2026-08-18T00:00:00.000Z",
    topics: [],
    assessments: [],
    calendar: [],
    lectures: [],
    notifications: [{ id: 1, title: "Hi", isRead: false, createdAt: "2026-08-18T00:00:00.000Z" }],
    summary: "test",
  },
  syncedAt: "2026-08-18T00:00:00.000Z",
}

describe("cora privacy minimization", () => {
  it("removes direct identifiers from student context", () => {
    const minimized = minimizeStudentContextForExternalAi(sampleContext, "learning", {
      personalizedLearning: true,
      useLearningContext: true,
    })
    assert.ok(minimized)
    assert.equal(Object.hasOwn(minimized.account ?? {}, "fullName"), false)
    assert.equal(Object.hasOwn(minimized.account ?? {}, "studentCode"), false)
    assert.equal(Object.hasOwn(minimized.account ?? {}, "studentDbId"), false)
    assert.equal(minimized.account?.courseCode, "EECE 250")
    assert.deepEqual(minimized.strugglingTopics, ["Kirchhoff's Laws"])
    assert.equal((minimized.profile as Record<string, unknown>).email, undefined)
    assert.deepEqual(minimized.knowledgeGraph?.notifications, [])
  })

  it("returns null when context level is none", () => {
    assert.equal(minimizeStudentContextForExternalAi(sampleContext, "none"), null)
  })

  it("honors useLearningContext off", () => {
    const minimized = minimizeStudentContextForExternalAi(sampleContext, "learning", {
      personalizedLearning: false,
      useLearningContext: false,
    })
    assert.ok(minimized)
    assert.equal(minimized.strugglingTopics, undefined)
    assert.equal(minimized.grades, undefined)
  })

  it("redacts known PII profile keys", () => {
    const profile = redactProfileForExternalAi({
      email: "a@b.com",
      studentId: "99",
      settings: { theme: "dark", phoneNumber: "555" },
    })
    assert.deepEqual(profile, { settings: { theme: "dark" } })
  })

  it("maps privacy controls to context levels", () => {
    assert.equal(
      resolveExternalAiContextLevel({ personalizedLearning: true, useLearningContext: true }),
      "learning",
    )
    assert.equal(
      resolveExternalAiContextLevel({ personalizedLearning: true, useLearningContext: false }),
      "none",
    )
  })
})
