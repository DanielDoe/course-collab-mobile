import * as SecureStore from "./secure-store-client"

function courseStorageKey(studentDatabaseId: string): string | null {
  const id = studentDatabaseId.trim()
  if (!id) return null
  return `studentCourse.${id}`
}

function sessionStorageKey(studentDatabaseId: string, courseId: number): string | null {
  const id = studentDatabaseId.trim()
  if (!id || !Number.isFinite(courseId) || courseId <= 0) return null
  return `studentSession.${id}.${Math.trunc(courseId)}`
}

export async function getStoredStudentCourseId(studentDatabaseId: string): Promise<number | null> {
  const storeKey = courseStorageKey(studentDatabaseId)
  if (!storeKey) return null
  try {
    const raw = await SecureStore.getItemAsync(storeKey)
    if (!raw) return null
    const id = Number(raw)
    return Number.isFinite(id) && id > 0 ? Math.trunc(id) : null
  } catch {
    return null
  }
}

export async function setStoredStudentCourseId(studentDatabaseId: string, courseId: number): Promise<void> {
  const storeKey = courseStorageKey(studentDatabaseId)
  if (!storeKey || !Number.isFinite(courseId) || courseId <= 0) return
  await SecureStore.setItemAsync(storeKey, String(Math.trunc(courseId)))
}

export async function clearStoredStudentCourseId(studentDatabaseId: string): Promise<void> {
  const storeKey = courseStorageKey(studentDatabaseId)
  if (!storeKey) return
  await SecureStore.deleteItemAsync(storeKey)
}

export async function getStoredStudentSection(
  studentDatabaseId: string,
  courseId: number,
): Promise<string | null> {
  const storeKey = sessionStorageKey(studentDatabaseId, courseId)
  if (!storeKey) return null
  try {
    const raw = await SecureStore.getItemAsync(storeKey)
    return raw?.trim() ? raw.trim() : null
  } catch {
    return null
  }
}

export async function setStoredStudentSection(
  studentDatabaseId: string,
  courseId: number,
  section: string | null | undefined,
): Promise<void> {
  const storeKey = sessionStorageKey(studentDatabaseId, courseId)
  if (!storeKey) return
  const normalized = section?.trim()
  if (!normalized) {
    await SecureStore.deleteItemAsync(storeKey)
    return
  }
  await SecureStore.setItemAsync(storeKey, normalized)
}

export async function clearStoredStudentSection(studentDatabaseId: string, courseId: number): Promise<void> {
  const storeKey = sessionStorageKey(studentDatabaseId, courseId)
  if (!storeKey) return
  await SecureStore.deleteItemAsync(storeKey)
}

export async function persistStudentCourse(
  studentDatabaseId: string,
  courseId: number,
  section?: string | null,
): Promise<void> {
  if (!Number.isFinite(courseId) || courseId <= 0) return
  await setStoredStudentCourseId(studentDatabaseId, courseId)
  await setStoredStudentSection(studentDatabaseId, courseId, section)
}

export async function getStoredStudentCourse(studentDatabaseId: string): Promise<{
  courseId: number
  section: string | null
} | null> {
  const courseId = await getStoredStudentCourseId(studentDatabaseId)
  if (courseId == null) return null
  const section = await getStoredStudentSection(studentDatabaseId, courseId)
  return { courseId, section }
}
