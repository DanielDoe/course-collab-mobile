export const PRODUCTION_PURCHASE_BASE_URL = "https://course-collab.com"

const PURCHASE_CANONICAL_HOSTS = new Set([
  "coursecollab.vercel.app",
  "www.course-collab.com",
  "course-collab.com",
])

/** Map Vercel / www aliases to the primary purchased domain before opening checkout. */
export function canonicalizePurchaseWebUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed

  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase()
    if (!PURCHASE_CANONICAL_HOSTS.has(host)) {
      return trimmed
    }
    const canonical = new URL(PRODUCTION_PURCHASE_BASE_URL)
    parsed.protocol = canonical.protocol
    parsed.hostname = canonical.hostname
    return parsed.toString()
  } catch {
    return trimmed
  }
}

export function buildPurchaseWebUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "")
  const normalized = path.startsWith("/") ? path : `/${path}`
  return canonicalizePurchaseWebUrl(`${base}${normalized}`)
}
