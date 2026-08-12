import { Platform, Share } from "react-native"
import {
  parseCircuitWorkspace,
  workspaceHasContent,
  type CircuitWorkspace,
} from "./circuit-workspace"
import { announcementPlainText } from "./announcement-content"
import type { StudentDigitalNote } from "./digital-notes-api"

export type DigitalNoteExportPayload = {
  version: 1
  kind: "coursecollab_digital_note"
  exportedAt: string
  note: {
    title: string
    bodyText: string
    inkWorkspace: CircuitWorkspace | null
    updatedAt: string
  }
}

export function buildDigitalNoteExportPayload(note: {
  title: string
  bodyText: string
  inkWorkspace?: unknown | null
  updatedAt: string
}): DigitalNoteExportPayload {
  const ink = parseCircuitWorkspace(note.inkWorkspace)
  return {
    version: 1,
    kind: "coursecollab_digital_note",
    exportedAt: new Date().toISOString(),
    note: {
      title: note.title,
      bodyText: note.bodyText,
      inkWorkspace: workspaceHasContent(ink) ? ink : null,
      updatedAt: note.updatedAt,
    },
  }
}

function safeFilename(title: string, ext: string): string {
  const base = title.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "note"
  return `${base}.${ext}`
}

async function shareTextFile(filename: string, contents: string, dialogTitle: string): Promise<void> {
  const { cacheDirectory, writeAsStringAsync, EncodingType } = await import("expo-file-system/legacy")
  if (!cacheDirectory) throw new Error("Could not access file cache on this device.")
  const uri = `${cacheDirectory}${filename}`
  await writeAsStringAsync(uri, contents, { encoding: EncodingType.UTF8 })
  await Share.share({
    url: uri,
    title: dialogTitle,
    message: Platform.OS === "android" ? contents.slice(0, 4000) : undefined,
  })
}

export async function exportDigitalNoteJson(note: StudentDigitalNote): Promise<void> {
  const payload = buildDigitalNoteExportPayload(note)
  await shareTextFile(
    safeFilename(note.title, "json"),
    JSON.stringify(payload, null, 2),
    note.title || "Note export",
  )
}

export async function exportDigitalNotePlainText(note: StudentDigitalNote): Promise<void> {
  const text = announcementPlainText(note.bodyText)
  await shareTextFile(safeFilename(note.title, "txt"), text, note.title || "Note export")
}
