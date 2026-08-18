import { PRODUCTION_API_BASE_URL, normalizeApiBaseUrl, resolveApiBaseUrl } from "../config/api"
import {
  buildTrustedApiHosts,
  isAllowedDeepLinkHost as isAllowedDeepLinkHostCore,
  isAllowedWebViewHost as isAllowedWebViewHostCore,
  isStripeCheckoutHost,
  isTrustedApiHost as isTrustedApiHostCore,
  sanitizeExternalUrl as sanitizeExternalUrlCore,
  sanitizeNativeNavigateRoute,
} from "./trusted-origins-core"

export {
  isSafeHttpUrl,
  isStripeCheckoutHost,
  sanitizeNativeNavigateRoute,
} from "./trusted-origins-core"

/** Hosts the mobile client may open, load in WebViews, or accept as deep-link origins. */
export function getTrustedApiHosts(): string[] {
  return buildTrustedApiHosts(resolveApiBaseUrl())
}

export function isTrustedApiHost(hostname: string): boolean {
  return isTrustedApiHostCore(hostname, getTrustedApiHosts())
}

export function isAllowedDeepLinkHost(hostname: string): boolean {
  return isAllowedDeepLinkHostCore(hostname, getTrustedApiHosts())
}

export function isAllowedWebViewHost(
  hostname: string,
  options?: { membershipFlow?: boolean; lectureDeck?: boolean },
): boolean {
  return isAllowedWebViewHostCore(hostname, getTrustedApiHosts(), options)
}

export function getAllowedWebViewOriginPrefixes(options?: {
  membershipFlow?: boolean
  lectureDeck?: boolean
}): string[] {
  const prefixes = getTrustedApiHosts().map((host) => `https://${host}`)
  if (options?.membershipFlow) {
    prefixes.push("https://checkout.stripe.com", "https://js.stripe.com", "https://hooks.stripe.com")
  }
  if (options?.lectureDeck) {
    prefixes.push("https://*.public.blob.vercel-storage.com", "https://*.blob.vercel-storage.com")
  }
  return prefixes
}

/** Reject javascript:/data:/file: and untrusted hosts before opening a URL. */
export function sanitizeExternalUrl(url: string, options?: { membershipFlow?: boolean }): string | null {
  return sanitizeExternalUrlCore(url, getTrustedApiHosts(), options)
}

export function apiOrigin(): string {
  return normalizeApiBaseUrl(resolveApiBaseUrl())
}

export { PRODUCTION_API_BASE_URL }
