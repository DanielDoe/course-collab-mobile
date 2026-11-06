export type ImageVariant = "thumbnail" | "small" | "medium" | "full"

export const IMAGE_VARIANT_PX: Record<ImageVariant, number> = {
  thumbnail: 64,
  small: 160,
  medium: 640,
  full: 0,
}

function alreadySized(url: string): boolean {
  return /[?&](w|width|w_|twic)=/i.test(url)
}

function supportsWidthHint(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return (
      host.includes("cloudinary") ||
      host.includes("imgix") ||
      host.includes("imagekit") ||
      host.includes("unsplash") ||
      url.includes("/_next/image")
    )
  } catch {
    return false
  }
}

/** Prefer a smaller derivative when the host accepts a width hint. Originals stay available via "full". */
export function displayImageUrl(url: string, variant: ImageVariant = "medium"): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (variant === "full") return trimmed
  if (trimmed.startsWith("data:") || trimmed.startsWith("file:") || trimmed.startsWith("content:")) {
    return trimmed
  }
  if (alreadySized(trimmed)) return trimmed
  if (!/^https?:\/\//i.test(trimmed) || !supportsWidthHint(trimmed)) return trimmed

  const width = IMAGE_VARIANT_PX[variant]
  const join = trimmed.includes("?") ? "&" : "?"
  return `${trimmed}${join}w=${width}`
}
