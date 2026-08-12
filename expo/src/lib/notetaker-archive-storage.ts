import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy"

type ArchiveStore = {
  version: 1
  noteIds: number[]
}

function storePath(studentId: string): string {
  return `${documentDirectory}notetaker-archived-${studentId}.json`
}

async function readStore(studentId: string): Promise<ArchiveStore> {
  try {
    const raw = await readAsStringAsync(storePath(studentId))
    const parsed = JSON.parse(raw) as Partial<ArchiveStore>
    if (parsed.version === 1 && Array.isArray(parsed.noteIds)) {
      return { version: 1, noteIds: parsed.noteIds.filter((id) => Number.isFinite(id)) }
    }
  } catch {
    /* first run */
  }
  return { version: 1, noteIds: [] }
}

async function writeStore(studentId: string, store: ArchiveStore): Promise<void> {
  await writeAsStringAsync(storePath(studentId), JSON.stringify(store))
}

export async function loadArchivedNoteIds(studentId: string): Promise<Set<number>> {
  const store = await readStore(studentId)
  return new Set(store.noteIds)
}

export async function archiveNotetakerNote(studentId: string, noteId: number): Promise<Set<number>> {
  const store = await readStore(studentId)
  if (!store.noteIds.includes(noteId)) {
    store.noteIds.unshift(noteId)
  }
  await writeStore(studentId, store)
  return new Set(store.noteIds)
}

export async function restoreNotetakerNote(studentId: string, noteId: number): Promise<Set<number>> {
  const store = await readStore(studentId)
  store.noteIds = store.noteIds.filter((id) => id !== noteId)
  await writeStore(studentId, store)
  return new Set(store.noteIds)
}

export async function removeArchivedNotetakerNote(studentId: string, noteId: number): Promise<Set<number>> {
  return restoreNotetakerNote(studentId, noteId)
}
