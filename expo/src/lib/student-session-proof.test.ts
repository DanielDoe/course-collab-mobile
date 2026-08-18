import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  headersHaveStudentSessionProof,
  flattenRequestHeaders,
} from "./student-session-proof"

describe("student session proof", () => {
  it("rejects header-only x-student-id as identity", () => {
    assert.equal(
      headersHaveStudentSessionProof({
        Accept: "application/json",
        "x-student-id": "722",
      }),
      false,
    )
  })

  it("accepts refresh cookie, refresh header, or MFA device trust", () => {
    assert.equal(
      headersHaveStudentSessionProof({ Cookie: "cc_refresh=token-a" }),
      true,
    )
    assert.equal(
      headersHaveStudentSessionProof({ "x-cc-refresh": "token-b" }),
      true,
    )
    assert.equal(
      headersHaveStudentSessionProof({ "X-CC-MFA-Trust": "trust-c" }),
      true,
    )
    assert.equal(
      headersHaveStudentSessionProof({ cookie: "theme=dark; cc_mfa_trust=trust-d" }),
      true,
    )
  })

  it("flattens HeadersInit for the proof check", () => {
    const headers = flattenRequestHeaders({
      Cookie: "cc_refresh=token-e",
      "x-student-id": "722",
    })
    assert.equal(headersHaveStudentSessionProof(headers), true)
  })
})
