/** Normalize pasted login credentials before auth requests. */

/** Student ID / email — trim, drop paste spaces, lowercase emails. */
export function normalizeLoginIdentifier(identifier: string): string {
  const trimmed = identifier.trim()
  if (!trimmed) return ""
  if (trimmed.includes("@")) {
    return trimmed.replace(/\s+/g, "").toLowerCase()
  }
  // Numeric roster IDs often get spaces or dashes from paste/autofill (910-000-001).
  // Keep intentional hyphens in alphanumeric IDs (dmdoe-demo-p01).
  if (/^[\d\s-]+$/.test(trimmed)) {
    return trimmed.replace(/[\s-]+/g, "")
  }
  return trimmed.replace(/\s+/g, "")
}

/**
 * Trim accidental leading/trailing spaces from pasted passwords.
 * Does not alter internal spaces (rare, but valid in some passwords).
 */
export function normalizeLoginPassword(password: string): string {
  return password.trim()
}
