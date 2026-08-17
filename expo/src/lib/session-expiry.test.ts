import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldInvalidateSessionForStatus } from "./session-expiry"

describe("session expiry", () => {
  it("invalidates authenticated API 401s", () => {
    assert.equal(shouldInvalidateSessionForStatus("/api/student/profile", 401), true)
    assert.equal(shouldInvalidateSessionForStatus("/api/instructor/courses", 401), true)
  })

  it("does not treat login or logout 401s as session expiry", () => {
    assert.equal(shouldInvalidateSessionForStatus("/api/auth/student/login", 401), false)
    assert.equal(shouldInvalidateSessionForStatus("/api/auth/logout", 401), false)
    assert.equal(shouldInvalidateSessionForStatus("/api/instructor/login", 401), false)
    assert.equal(shouldInvalidateSessionForStatus("/api/student/profile", 403), false)
  })
})
