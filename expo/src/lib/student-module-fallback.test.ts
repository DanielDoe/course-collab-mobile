import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { studentModuleRedirect } from "./student-module-fallback"

describe("studentModuleRedirect", () => {
  it("sends leftover faculty Cora Insights slugs to student Cora", () => {
    assert.equal(studentModuleRedirect("cora-insights"), "/module/ai-tutor")
    assert.equal(studentModuleRedirect("ai-insights"), "/module/ai-tutor")
    assert.equal(studentModuleRedirect("ai-monitoring"), "/module/ai-tutor")
  })

  it("leaves real student modules alone", () => {
    assert.equal(studentModuleRedirect("projects"), null)
    assert.equal(studentModuleRedirect("quizzes"), null)
  })
})
