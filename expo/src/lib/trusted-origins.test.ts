import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildTrustedApiHosts,
  isAllowedDeepLinkHost,
  isAllowedWebViewHost,
  isVercelBlobHost,
  sanitizeExternalUrl,
  sanitizeNativeNavigateRoute,
} from "./trusted-origins-core"

describe("trusted origins", () => {
  const trustedHosts = buildTrustedApiHosts("https://course-collab.com")

  it("accepts the production CourseCollab hosts", () => {
    assert.equal(isAllowedDeepLinkHost("course-collab.com", trustedHosts), true)
    assert.equal(isAllowedDeepLinkHost("www.course-collab.com", trustedHosts), true)
    assert.equal(isAllowedDeepLinkHost("coursecollab.vercel.app", trustedHosts), true)
    assert.equal(isAllowedWebViewHost("checkout.stripe.com", trustedHosts, { membershipFlow: true }), true)
    assert.equal(isAllowedWebViewHost("checkout.stripe.com", trustedHosts), false)
    assert.equal(isVercelBlobHost("abc.public.blob.vercel-storage.com"), true)
    assert.equal(
      isAllowedWebViewHost("abc.public.blob.vercel-storage.com", trustedHosts, {
        lectureDeck: true,
      }),
      true,
    )
    assert.equal(isAllowedWebViewHost("abc.public.blob.vercel-storage.com", trustedHosts), false)
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
