import * as SecureStore from "./secure-store-client"

function courseStorageKey(instructorId: number): string | null {
  const id = Number(instructorId)
  if (!Number.isFinite(id) || id <= 0) return null
  return `facultyCourse.${Math.trunc(id)}`
}

function sessionStorageKey(instructorId: number, courseId: number): string | null {
  const instructor = Number(instructorId)
  const course = Number(courseId)
  if (!Number.isFinite(instructor) || instructor <= 0 || !Number.isFinite(course) || course <= 0) {
    return null
  }
  return `facultySession.${Math.trunc(instructor)}.${Math.trunc(course)}`
}

export async function getStoredFacultyCourseId(instructorId: number): Promise<number | null> {
  const storeKey = courseStorageKey(instructorId)
  if (!storeKey) return null
  try {
    const raw = await SecureStore.getItemAsync(storeKey)
    if (!raw) return null
    const id = Number(raw)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

export async function setStoredFacultyCourseId(instructorId: number, courseId: number): Promise<void> {
  const storeKey = courseStorageKey(instructorId)
  if (!storeKey || !Number.isFinite(courseId) || courseId <= 0) return
  await SecureStore.setItemAsync(storeKey, String(Math.trunc(courseId)))
}

export async function clearStoredFacultyCourseId(instructorId: number): Promise<void> {
  const storeKey = courseStorageKey(instructorId)
  if (!storeKey) return
  await SecureStore.deleteItemAsync(storeKey)
}

export async function getStoredFacultySessionCode(
  instructorId: number,
  courseId: number,
): Promise<string | null> {
  const storeKey = sessionStorageKey(instructorId, courseId)
  if (!storeKey) return null
  try {
    const raw = await SecureStore.getItemAsync(storeKey)
    return raw?.trim() ? raw.trim() : null
  } catch {
    return null
  }
}

export async function setStoredFacultySessionCode(
  instructorId: number,
  courseId: number,
  sessionCode: string | null | undefined,
): Promise<void> {
  const storeKey = sessionStorageKey(instructorId, courseId)
  if (!storeKey) return
  const normalized = sessionCode?.trim()
  if (!normalized) {
    await SecureStore.deleteItemAsync(storeKey)
    return
  }
  await SecureStore.setItemAsync(storeKey, normalized)
}

export async function clearStoredFacultySessionCode(
  instructorId: number,
  courseId: number,
): Promise<void> {
  const storeKey = sessionStorageKey(instructorId, courseId)
  if (!storeKey) return
  await SecureStore.deleteItemAsync(storeKey)
}
