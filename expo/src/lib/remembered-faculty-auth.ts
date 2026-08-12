import * as SecureStore from "expo-secure-store"

const CREDENTIALS_KEY = "rememberedFacultyAuth"

export type RememberedFacultyCredentials = {
  username: string
  rememberMe: boolean
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
