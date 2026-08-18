import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { getFallbackLegalDocument, LEGAL_CONTENT_FALLBACK_VERSION } from "./fallback"
import { isLegalDocumentId } from "./types"

describe("legal content fallback", () => {
  it("validates document ids", () => {
    assert.equal(isLegalDocumentId("privacy"), true)
    assert.equal(isLegalDocumentId("invalid"), false)
  })

  it("ships bundled fallback documents for offline use", () => {
    const privacy = getFallbackLegalDocument("privacy")
    assert.equal(privacy.title, "Privacy Policy")
    assert.ok(privacy.sections.length >= 5)
    assert.equal(LEGAL_CONTENT_FALLBACK_VERSION.length > 0, true)
  })
})
