import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildTrustedApiHosts,
  isAllowedDeepLinkHost,
  isAllowedWebViewHost,
  sanitizeExternalUrl,
  sanitizeNativeNavigateRoute,
} from "./trusted-origins-core"

describe("trusted origins", () => {
  const trustedHosts = buildTrustedApiHosts("https://coursecollab.vercel.app")

  it("accepts the production CourseCollab hosts", () => {
    assert.equal(isAllowedDeepLinkHost("coursecollab.vercel.app", trustedHosts), true)
    assert.equal(isAllowedDeepLinkHost("course-collab.com", trustedHosts), true)
    assert.equal(isAllowedWebViewHost("checkout.stripe.com", trustedHosts, { membershipFlow: true }), true)
    assert.equal(isAllowedWebViewHost("checkout.stripe.com", trustedHosts), false)
  })

  it("rejects untrusted hosts and unsafe schemes", () => {
    assert.equal(isAllowedDeepLinkHost("evil.example", trustedHosts), false)
    assert.equal(sanitizeExternalUrl("javascript:alert(1)", trustedHosts), null)
    assert.equal(sanitizeExternalUrl("https://evil.example/legal", trustedHosts), null)
    assert.equal(sanitizeNativeNavigateRoute("https://evil.example"), null)
    assert.equal(sanitizeNativeNavigateRoute("//evil.example"), null)
    assert.equal(sanitizeNativeNavigateRoute("/settings/privacy-security"), "/settings/privacy-security")
  })
})
