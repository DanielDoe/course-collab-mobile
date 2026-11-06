export const WORKSPACE_UPLOAD_MAX_BYTES = 15 * 1024 * 1024

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "application/pdf",
])

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "pdf"])

export function formatUploadBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return ""
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function workspaceUploadError(input: {
  name?: string | null
  mime?: string | null
  size?: number | null
}): string | null {
  const mime = (input.mime ?? "").toLowerCase()
  const ext = (input.name ?? "").split(".").pop()?.toLowerCase() ?? ""
  const typeOk = (mime && ALLOWED_MIME.has(mime)) || ALLOWED_EXT.has(ext)
  if (!typeOk) return "Use a JPEG, PNG, WEBP, HEIC, or PDF file."
  if (input.size != null && input.size > WORKSPACE_UPLOAD_MAX_BYTES) {
    return `Files must be ${formatUploadBytes(WORKSPACE_UPLOAD_MAX_BYTES)} or smaller.`
  }
  return null
}
