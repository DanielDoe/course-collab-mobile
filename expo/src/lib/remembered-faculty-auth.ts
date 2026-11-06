import type { UniversityRecord } from "./api"
import * as SecureStore from "./secure-store-client"
import type { UniversityRecord } from "./api"

const CREDENTIALS_KEY = "rememberedFacultyAuth"
const UNIVERSITY_KEY = "rememberedFacultyUniversity"

export type RememberedFacultyCredentials = {
  username: string
  rememberMe: boolean
}

export async function readRememberedFacultyUniversity(): Promise<UniversityRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(UNIVERSITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UniversityRecord
    if (!parsed?.id || !parsed?.short_name) return null
    return parsed
  } catch {
    return null
  }
}

export async function persistRememberedFacultyUniversity(university: UniversityRecord): Promise<void> {
  await SecureStore.setItemAsync(UNIVERSITY_KEY, JSON.stringify(university))
}

export async function clearRememberedFacultyUniversity(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(UNIVERSITY_KEY)
  } catch {
    // ignore
  }
}

export async function readRememberedFacultyCredentials(): Promise<RememberedFacultyCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RememberedFacultyCredentials
    if (typeof parsed.username !== "string") return null
    return {
      username: parsed.username,
      rememberMe: Boolean(parsed.rememberMe),
    }
  } catch {
    return null
  }
}

export async function persistRememberedFacultyCredentials(
  data: RememberedFacultyCredentials,
): Promise<void> {
  if (!data.rememberMe) {
    await clearRememberedFacultyCredentials()
    return
  }
  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify({
      username: data.username.trim(),
      rememberMe: true,
    }),
  )
}

export async function clearRememberedFacultyCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY)
  } catch {
    // ignore
  }
}

export async function readRememberedFacultyUniversity(): Promise<UniversityRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(UNIVERSITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UniversityRecord
    if (!parsed?.id || !parsed?.short_name) return null
    return parsed
  } catch {
    return null
  }
}

export async function persistRememberedFacultyUniversity(
  university: UniversityRecord,
): Promise<void> {
  if (!university?.id || !university.short_name) return
  await SecureStore.setItemAsync(UNIVERSITY_KEY, JSON.stringify(university))
}

export async function clearRememberedFacultyUniversity(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(UNIVERSITY_KEY)
  } catch {
    // ignore
  }
}
