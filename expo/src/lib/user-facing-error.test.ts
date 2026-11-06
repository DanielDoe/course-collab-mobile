import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isRawRuntimeErrorMessage, sanitizeUserFacingError } from "./user-facing-error"

describe("sanitizeUserFacingError", () => {
  it("keeps actionable API copy", () => {
    assert.equal(sanitizeUserFacingError("Title is required."), "Title is required.")
  })

  it("hides raw runtime failures", () => {
    assert.equal(
      sanitizeUserFacingError("Cannot read properties of undefined (reading 'id')", "Unable to publish this syllabus. Please try again."),
      "Unable to publish this syllabus. Please try again.",
    )
    assert.equal(isRawRuntimeErrorMessage("undefined is not an object"), true)
  })
})
