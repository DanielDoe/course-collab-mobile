import * as SecureStore from "expo-secure-store"

function storageKey(instructorId: number): string | null {
  const id = Number(instructorId)
  if (!Number.isFinite(id) || id <= 0) return null
  return `facultyCourse.${Math.trunc(id)}`
}

export async function getStoredFacultyCourseId(instructorId: number): Promise<number | null> {
  const storeKey = storageKey(instructorId)
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
  const storeKey = storageKey(instructorId)
  if (!storeKey || !Number.isFinite(courseId) || courseId <= 0) return
  await SecureStore.setItemAsync(storeKey, String(Math.trunc(courseId)))
}

export async function clearStoredFacultyCourseId(instructorId: number): Promise<void> {
  const storeKey = storageKey(instructorId)
  if (!storeKey) return
  await SecureStore.deleteItemAsync(storeKey)
}
