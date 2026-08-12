import * as SecureStore from "expo-secure-store"
import type { UniversityRecord } from "./api"

const UNIVERSITY_KEY = "rememberedStudentUniversity"
const CREDENTIALS_KEY = "rememberedStudentAuth"

export type RememberedStudentCredentials = {
  identifier: string
  rememberMe: boolean
}

/** @deprecated Combined shape — prefer university + credentials helpers. */
export type RememberedStudentAuth = {
  university: UniversityRecord
  identifier: string
  rememberMe: boolean
}

export async function readRememberedUniversity(): Promise<UniversityRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(UNIVERSITY_KEY)
    if (!raw) {
      // Migrate from older combined key if present
      const legacy = await readLegacyCombined()
      if (legacy?.university) {
        await persistRememberedUniversity(legacy.university)
        return legacy.university
      }
      return null
    }
    const parsed = JSON.parse(raw) as UniversityRecord
    if (!parsed?.id || !parsed?.short_name) return null
    return parsed
  } catch {
    return null
  }
}

export async function persistRememberedUniversity(university: UniversityRecord): Promise<void> {
  await SecureStore.setItemAsync(UNIVERSITY_KEY, JSON.stringify(university))
}

export async function clearRememberedUniversity(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(UNIVERSITY_KEY)
  } catch {
    // ignore
  }
}

export async function readRememberedStudentCredentials(): Promise<RememberedStudentCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY)
    if (!raw) {
      const legacy = await readLegacyCombined()
      if (legacy) {
        return { identifier: legacy.identifier, rememberMe: legacy.rememberMe }
      }
      return null
    }
    const parsed = JSON.parse(raw) as RememberedStudentCredentials & Partial<RememberedStudentAuth>
    if (typeof parsed.identifier !== "string") return null
    return {
      identifier: parsed.identifier,
      rememberMe: Boolean(parsed.rememberMe),
    }
  } catch {
    return null
  }
}

export async function persistRememberedStudentCredentials(
  data: RememberedStudentCredentials,
): Promise<void> {
  if (!data.rememberMe) {
    await clearRememberedStudentCredentials()
    return
  }
  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify({
      identifier: data.identifier.trim(),
      rememberMe: true,
    }),
  )
}

export async function clearRememberedStudentCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY)
  } catch {
    // ignore
  }
}

/** Clears credential remember-me only — keeps selected university. */
export async function clearRememberedStudentAuth(): Promise<void> {
  await clearRememberedStudentCredentials()
}

/** Clears university + credentials (e.g. explicit change-school reset). */
export async function clearAllRememberedStudentLogin(): Promise<void> {
  await Promise.all([clearRememberedUniversity(), clearRememberedStudentCredentials()])
}

async function readLegacyCombined(): Promise<RememberedStudentAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RememberedStudentAuth
    if (!parsed?.university?.id) return null
    return {
      university: parsed.university,
      identifier: typeof parsed.identifier === "string" ? parsed.identifier : "",
      rememberMe: Boolean(parsed.rememberMe),
    }
  } catch {
    return null
  }
}

/** Convenience for login hydration. */
export async function readRememberedStudentAuth(): Promise<RememberedStudentAuth | null> {
  const [university, credentials] = await Promise.all([
    readRememberedUniversity(),
    readRememberedStudentCredentials(),
  ])
  if (!university) return null
  return {
    university,
    identifier: credentials?.identifier ?? "",
    rememberMe: credentials?.rememberMe ?? false,
  }
}

export async function persistRememberedStudentAuth(data: RememberedStudentAuth): Promise<void> {
  await persistRememberedUniversity(data.university)
  await persistRememberedStudentCredentials({
    identifier: data.identifier,
    rememberMe: data.rememberMe,
  })
}
