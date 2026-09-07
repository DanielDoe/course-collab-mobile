import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_SESSION_MS, REMEMBER_ME_SESSION_MS, resolveSessionDurationMs } from "./session-duration"

describe("session duration", () => {
  it("defaults to a 7-day session", () => {
    assert.equal(resolveSessionDurationMs(), DEFAULT_SESSION_MS)
    assert.equal(resolveSessionDurationMs({ rememberMe: false }), 7 * 24 * 60 * 60 * 1000)
  })

  it("uses 30 days when remember-me is on", () => {
    assert.equal(resolveSessionDurationMs({ rememberMe: true }), REMEMBER_ME_SESSION_MS)
    assert.equal(resolveSessionDurationMs({ rememberMe: true }), 30 * 24 * 60 * 60 * 1000)
  })

  it("prefers the server-issued lifetime", () => {
    assert.equal(
      resolveSessionDurationMs({ rememberMe: false, sessionExpiresIn: 12 * 24 * 60 * 60 * 1000 }),
      12 * 24 * 60 * 60 * 1000,
    )
  })
})
