import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  extractRefreshTokenFromCookieHeader,
  extractRefreshTokenFromSetCookie,
} from "./refresh-token-parse"

describe("refresh token extraction", () => {
  it("reads cc_refresh from a cookie header", () => {
    assert.equal(
      extractRefreshTokenFromCookieHeader("cc_mfa_trust=abc; cc_refresh=token-1; other=x"),
      "token-1",
    )
  })

  it("reads cc_refresh from Set-Cookie", () => {
    assert.equal(
      extractRefreshTokenFromSetCookie(
        "cc_refresh=token-2; Path=/; HttpOnly; SameSite=Lax, cc_mfa_trust=abc; Path=/",
      ),
      "token-2",
    )
  })
})
