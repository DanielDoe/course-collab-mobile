import { cacheDirectory, writeAsStringAsync, EncodingType } from "expo-file-system/legacy"
import { resolveLectureDeckUrl } from "./lecture-deck-url"

export type LectureDeckWebViewSource = {
  uri: string
  headers?: Record<string, string>
}

export type LoadLectureDeckResult =
  | { ok: true; source: LectureDeckWebViewSource }
  | { ok: false; message: string; status?: number }

function parseJsonError(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith("{")) return null
  try {
    const body = JSON.parse(trimmed) as { error?: string; message?: string }
    return body.error?.trim() || body.message?.trim() || null
  } catch {
    return null
  }
}

function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

function isPdfContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false
  const ct = contentType.split(";")[0]?.trim().toLowerCase() ?? ""
  return ct === "application/pdf" || ct === "application/octet-stream"
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (typeof globalThis.btoa === "function") {
    let binary = ""
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return globalThis.btoa(binary)
  }
  const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let result = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    result += table[a >> 2]
    result += table[((a & 3) << 4) | ((b ?? 0) >> 4)]
    result += b === undefined ? "=" : table[(((b ?? 0) & 15) << 2) | ((c ?? 0) >> 6)]
    result += c === undefined ? "=" : table[(c ?? 0) & 63]
  }
  return result
}

async function writePdfCache(fileUri: string, buffer: ArrayBuffer): Promise<void> {
  if (!cacheDirectory) {
    throw new Error("File cache unavailable")
  }
  await writeAsStringAsync(fileUri, arrayBufferToBase64(buffer), {
    encoding: EncodingType.Base64,
  })
}

function cacheFileUri(cacheKey: string): string | null {
  if (!cacheDirectory) return null
  const safeKey = cacheKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96)
  return `${cacheDirectory}lecture-deck-${safeKey}.pdf`
}

/**
 * Download a lecture deck with auth headers, validate PDF bytes, and cache locally
 * for WebView rendering. Avoids showing raw JSON error bodies in the WebView.
 */
export async function loadLectureDeckForWebView(params: {
  url: string
  headers?: Record<string, string>
  cacheKey?: string
}): Promise<LoadLectureDeckResult> {
  const uri = resolveLectureDeckUrl(params.url)
  if (!uri) {
    return { ok: false, message: "No slide deck is attached to this lecture." }
  }

  try {
    const response = await fetch(uri, {
      method: "GET",
      redirect: "follow",
      credentials: "include",
      headers: {
        Accept: "application/pdf, application/octet-stream, */*",
        ...params.headers,
      },
    })

    const contentType = response.headers.get("content-type")
    const responseUrl = response.url || uri

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return {
        ok: false,
        message: parseJsonError(text) || `Could not load slides (${response.status}).`,
        status: response.status,
      }
    }

    if (contentType?.toLowerCase().includes("application/json")) {
      const text = await response.text()
      return {
        ok: false,
        message: parseJsonError(text) || "Slide deck is unavailable right now.",
        status: response.status,
      }
    }

    const buffer = await response.arrayBuffer()
    if (!buffer.byteLength) {
      return { ok: false, message: "Slide deck file is empty." }
    }

    const header = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength))
    if (!isPdfBytes(header) && !isPdfContentType(contentType)) {
      const snippet = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(240, buffer.byteLength)))
      return {
        ok: false,
        message: parseJsonError(snippet) || "Unexpected response when loading slides.",
        status: response.status,
      }
    }

    const cacheKey = params.cacheKey ?? String(responseUrl)
    const fileUri = cacheFileUri(cacheKey)
    if (fileUri) {
      await writePdfCache(fileUri, buffer)
      return { ok: true, source: { uri: fileUri } }
    }

    return { ok: true, source: { uri: responseUrl, headers: params.headers } }
  } catch {
    return {
      ok: false,
      message: "Could not download slide deck. Check your connection and try again.",
    }
  }
}
