import * as SecureStore from "./secure-store-client"

const SIGNED_OUT_KEY = "ccExplicitSignOut"

export async function markExplicitSignOut(): Promise<void> {
  try {
    await SecureStore.setItemAsync(SIGNED_OUT_KEY, "1")
  } catch {
    /* ignore */
  }
}

export async function hasExplicitSignOut(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(SIGNED_OUT_KEY)
    return value === "1"
  } catch {
    return false
  }
}

export async function clearExplicitSignOut(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SIGNED_OUT_KEY)
  } catch {
    /* ignore */
  }
}
