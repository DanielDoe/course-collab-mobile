/** Image helpers for DM attachments / TipTap HTML — keep free of React Native imports. */

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".zip": "application/zip",
}

const MESSAGE_ATTACHMENT_ALLOWED = new Set(Object.values(EXT_TO_MIME))

export function inferMessageAttachmentMime(
  fileName: string,
  declaredType?: string | null,
  uri?: string | null,
): string {
  const trimmed = declaredType?.trim()
  if (trimmed && trimmed !== "application/octet-stream" && MESSAGE_ATTACHMENT_ALLOWED.has(trimmed)) {
    return trimmed
  }
  const fromName = EXT_TO_MIME[extensionOf(fileName)]
  if (fromName) return fromName
  const fromUri = uri ? EXT_TO_MIME[extensionOf(uri.split("?")[0] ?? "")] : undefined
  if (fromUri) return fromUri
  return trimmed || "application/octet-stream"
}

function extensionOf(value: string): string {
  const match = /\.[a-z0-9]+$/i.exec(value.trim())
  return match ? match[0]!.toLowerCase() : ""
}

/** True when the client received a durable http(s) URL from the upload API. */
export function isPersistedMessageAttachmentUrl(url: string | null | undefined): boolean {
  const trimmed = String(url ?? "").trim()
  return trimmed.startsWith("https://") || trimmed.startsWith("http://")
}

export function extractMessageImageUrls(html: string): string[] {
  if (!html || !/<img\b/i.test(html)) return []
  const urls: string[] = []
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) != null) {
    const src = match[1]?.trim()
    if (src && !urls.includes(src)) urls.push(src)
  }
  return urls
}

export function isImageMimeType(mimeType: string | null | undefined, fileName?: string | null): boolean {
  const mime = String(mimeType ?? "").toLowerCase()
  if (mime.startsWith("image/")) return true
  const name = String(fileName ?? "").toLowerCase()
  return /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(name)
}

export function stripMessageHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}
