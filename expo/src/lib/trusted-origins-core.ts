const PRODUCTION_API_HOST = "coursecollab.vercel.app"

export const EXTRA_PRODUCTION_HOSTS = new Set([
  PRODUCTION_API_HOST,
  "course-collab.com",
  "www.course-collab.com",
])

export const STRIPE_HOSTS = new Set(["checkout.stripe.com", "js.stripe.com", "hooks.stripe.com"])

export function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function isProductionRuntime(): boolean {
  if (process.env.NODE_ENV === "test") return false
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT
  if (env === "production") return true
  if (env === "development" || env === "test") return false
  return process.env.NODE_ENV === "production"
}

export function buildTrustedApiHosts(configuredApiUrl?: string | null): string[] {
  const hosts = new Set<string>(EXTRA_PRODUCTION_HOSTS)
  const configured = configuredApiUrl ? hostnameFromUrl(configuredApiUrl) : null
  if (configured) hosts.add(configured)
  hosts.add(PRODUCTION_API_HOST)
  return [...hosts]
}

export function isTrustedApiHost(hostname: string, trustedHosts: readonly string[]): boolean {
  const host = hostname.trim().toLowerCase()
  if (!host) return false
  return trustedHosts.includes(host)
}

export function isStripeCheckoutHost(hostname: string): boolean {
  return STRIPE_HOSTS.has(hostname.trim().toLowerCase())
}

export function isAllowedDeepLinkHost(hostname: string, trustedHosts: readonly string[]): boolean {
  return isTrustedApiHost(hostname, trustedHosts)
}

export function isAllowedWebViewHost(
  hostname: string,
  trustedHosts: readonly string[],
  options?: { membershipFlow?: boolean },
): boolean {
  if (isTrustedApiHost(hostname, trustedHosts)) return true
  return Boolean(options?.membershipFlow && isStripeCheckoutHost(hostname))
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") {
      return !isProductionRuntime() && parsed.protocol === "http:"
    }
    return true
  } catch {
    return false
  }
}

export function sanitizeExternalUrl(
  url: string,
  trustedHosts: readonly string[],
  options?: { membershipFlow?: boolean },
): string | null {
  const trimmed = url.trim()
  if (!trimmed || /^(javascript|data|file|blob|vbsscript):/i.test(trimmed)) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && !isProductionRuntime())) {
      return null
    }
    if (!isAllowedWebViewHost(parsed.hostname, trustedHosts, options)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function sanitizeNativeNavigateRoute(route: string): string | null {
  const trimmed = route.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null
  if (/^(javascript|data|file|blob):/i.test(trimmed)) return null
  return trimmed
}
