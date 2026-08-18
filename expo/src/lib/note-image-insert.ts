import { AppAlert } from './app-alert'

import * as ImagePicker from "expo-image-picker"
import { API_BASE_URL } from "../constants"
import type { StudentSession } from "./session"
import { ApiError, studentAuthenticatedHeaders } from "./student-api"
import { persistHttpCookiesFromResponse } from "./student-http-cookies"
import { isMarkdownNoteContent } from "./markdown-note-content"
import { isNoteHtml } from "./digital-note-content"

const MAX_EMBED_BYTES = 1_400_000

export type NoteImagePickSource = "library" | "camera"

export function insertSnippetAtSelection(
  text: string,
  selection: { start: number; end: number },
  snippet: string,
): { text: string; selection: { start: number; end: number } } {
  const start = Math.max(0, Math.min(selection.start, selection.end))
  const end = Math.max(selection.start, selection.end)
  const block = `\n\n${snippet.trim()}\n\n`
  const next = `${text.slice(0, start)}${block}${text.slice(end)}`
  const cursor = start + block.length
  return { text: next, selection: { start: cursor, end: cursor } }
}

function mimeForUri(uri: string, fallback = "image/jpeg"): string {
  const lower = uri.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic"
  return fallback
}

function fileNameFromUri(uri: string): string {
  const segment = uri.split("/").pop()?.split("?")[0]
  return segment?.trim() || `note-photo-${Date.now()}.jpg`
}

function buildImageEmbed(markdownPreferred: boolean, src: string, alt: string): string {
  if (markdownPreferred) {
    return `![${alt}](${src})`
  }
  return `<p><img src="${src}" alt="${alt.replace(/"/g, "&quot;")}" /></p>`
}

async function readDataUrl(uri: string, mimeType: string, base64FromPicker?: string | null): Promise<string> {
  const base64 = base64FromPicker?.trim()
  if (!base64) {
    throw new Error("Could not read the selected photo.")
  }
  if (base64.length * 0.75 > MAX_EMBED_BYTES) {
    throw new Error("That photo is too large to embed. Try a smaller image or crop it first.")
  }
  return `data:${mimeType};base64,${base64}`
}

export async function uploadNoteImage(
  session: StudentSession,
  noteId: number,
  file: { uri: string; name: string; mimeType: string },
): Promise<string | null> {
  const form = new FormData()
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob)
  form.append("studentDatabaseId", session.databaseId)
  form.append("noteId", String(noteId))

  const url = `${API_BASE_URL}/api/student/digital-notes/upload-image`
  const headers = await studentAuthenticatedHeaders(session)
  delete headers["Content-Type"]
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      ...headers,
      Accept: "application/json",
    },
    body: form,
  })
  await persistHttpCookiesFromResponse(url, response.headers)

  if (response.status === 404 || response.status === 405) return null

  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Upload failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }

  const urlFromBody =
    typeof body === "object" && body !== null
      ? (body as { url?: string; mediaUrl?: string; imageUrl?: string }).url ??
        (body as { mediaUrl?: string }).mediaUrl ??
        (body as { imageUrl?: string }).imageUrl
      : undefined

  return urlFromBody?.trim() || null
}

export async function pickNoteImage(source: NoteImagePickSource): Promise<{
  uri: string
  name: string
  mimeType: string
  base64?: string | null
} | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      AppAlert.alert("Camera access needed", "Allow camera access to take a photo for your note.")
      return null
    }
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      AppAlert.alert("Photos access needed", "Allow photo library access to insert an image into your note.")
      return null
    }
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.82, allowsEditing: false, base64: true })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.82,
          allowsEditing: false,
          mediaTypes: ["images"],
          base64: true,
        })

  if (result.canceled || !result.assets[0]?.uri) return null

  const asset = result.assets[0]
  const uri = asset.uri
  const mimeType = asset.mimeType ?? mimeForUri(uri)
  return {
    uri,
    name: asset.fileName ?? fileNameFromUri(uri),
    mimeType,
    base64: asset.base64,
  }
}

export async function buildNoteImageInsertSnippet({
  file,
  session,
  noteId,
  bodyText,
}: {
  file: { uri: string; name: string; mimeType: string; base64?: string | null }
  session?: StudentSession | null
  noteId?: number | null
  bodyText: string
}): Promise<string> {
  const markdownPreferred = isMarkdownNoteContent(bodyText) || !isNoteHtml(bodyText)
  const alt = file.name.replace(/\.[^.]+$/, "") || "Photo"

  if (session && noteId != null && Number.isFinite(noteId)) {
    try {
      const remoteUrl = await uploadNoteImage(session, noteId, file)
      if (remoteUrl) {
        const resolved = remoteUrl.startsWith("http")
          ? remoteUrl
          : `${API_BASE_URL}${remoteUrl.startsWith("/") ? remoteUrl : `/${remoteUrl}`}`
        return buildImageEmbed(markdownPreferred, resolved, alt)
      }
    } catch {
      /* fall back to embedded data URL */
    }
  }

  const dataUrl = await readDataUrl(file.uri, file.mimeType, file.base64)
  return buildImageEmbed(markdownPreferred, dataUrl, alt)
}

export function promptNoteImageSource(onPick: (source: NoteImagePickSource) => void) {
  AppAlert.alert("Insert photo", "Choose where to add a photo from.", [
    { text: "Photo library", onPress: () => onPick("library") },
    { text: "Take photo", onPress: () => onPick("camera") },
    { text: "Cancel", style: "cancel" },
  ])
}
