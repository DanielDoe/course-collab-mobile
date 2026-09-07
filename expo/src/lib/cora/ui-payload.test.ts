import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isRedundantCoraUiPayload } from "./ui-payload"

describe("isRedundantCoraUiPayload", () => {
  it("hides confirmation UI when a signed action card is already present", () => {
    assert.equal(
      isRedundantCoraUiPayload(
        { type: "confirmation", message: "", actionId: "1", preview: {}, actions: [] },
        true,
      ),
      true,
    )
  })

  it("keeps created-resource and error cards even when action cards exist", () => {
    assert.equal(
      isRedundantCoraUiPayload(
        { type: "created_resource", message: "", resource: { type: "note", id: 1 } },
        true,
      ),
      false,
    )
    assert.equal(isRedundantCoraUiPayload({ type: "error", message: "Nope" }, true), false)
  })
})
