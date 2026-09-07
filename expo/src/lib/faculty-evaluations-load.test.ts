import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { evaluationsLoadKind, isEvaluationsEmptySuccess } from "./faculty-evaluations-load"

describe("evaluations load state", () => {
  it("treats a successful empty list as empty, not error", () => {
    assert.equal(evaluationsLoadKind({ loading: false, error: "", count: 0 }), "empty")
    assert.equal(evaluationsLoadKind({ loading: false, error: "Unable to load evaluations.", count: 0 }), "error")
  })

  it("treats a 404 as no evaluations yet", () => {
    assert.equal(isEvaluationsEmptySuccess({ status: 404, message: "Not found" }), true)
    assert.equal(isEvaluationsEmptySuccess({ status: 500, message: "Server exploded" }), false)
  })
})
