import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isStaleMutation, nextMutationVersion, resetMutationVersions } from "./versioning"

describe("mutation versioning", () => {
  it("ignores an older mutation after a newer one", () => {
    resetMutationVersions()
    const first = nextMutationVersion("note:1")
    const second = nextMutationVersion("note:1")
    assert.equal(isStaleMutation("note:1", first), true)
    assert.equal(isStaleMutation("note:1", second), false)
  })
})
