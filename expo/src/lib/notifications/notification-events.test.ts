import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  shouldRefetchInboxOnMessageRefresh,
  shouldReloadThreadOnMessageRefresh,
} from "./message-refresh"

describe("shouldReloadThreadOnMessageRefresh", () => {
  it("ignores the open thread marking itself read", () => {
    assert.equal(
      shouldReloadThreadOnMessageRefresh(42, { threadId: 42, cause: "local-read" }),
      false,
    )
  })

  it("ignores other threads", () => {
    assert.equal(shouldReloadThreadOnMessageRefresh(42, { threadId: 7 }), false)
  })

  it("reloads on push or inbox refresh for the open thread", () => {
    assert.equal(shouldReloadThreadOnMessageRefresh(42, { threadId: 42 }), true)
    assert.equal(shouldReloadThreadOnMessageRefresh(42, { threadId: 42, cause: "external" }), true)
    assert.equal(shouldReloadThreadOnMessageRefresh(42, undefined), true)
  })
})

describe("shouldRefetchInboxOnMessageRefresh", () => {
  it("skips a refetch when the open thread only marked itself read", () => {
    assert.equal(shouldRefetchInboxOnMessageRefresh({ threadId: 42, cause: "local-read" }), false)
  })

  it("refetches on push or other conversations", () => {
    assert.equal(shouldRefetchInboxOnMessageRefresh({ threadId: 42 }), true)
    assert.equal(shouldRefetchInboxOnMessageRefresh({ threadId: 42, cause: "external" }), true)
    assert.equal(shouldRefetchInboxOnMessageRefresh(undefined), true)
  })
})
