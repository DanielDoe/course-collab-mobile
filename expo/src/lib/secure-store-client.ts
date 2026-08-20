import * as ExpoSecureStore from "expo-secure-store"

/** Explicit keychain service — avoids TurboModule/keychain crashes on some iOS builds. */
export const SECURE_STORE_OPTIONS: ExpoSecureStore.SecureStoreOptions = {
  keychainService: "com.coursecollab.app",
}

const SECURE_STORE_TIMEOUT_MS = 2500

function mergeOptions(options?: ExpoSecureStore.SecureStoreOptions): ExpoSecureStore.SecureStoreOptions {
  return { ...SECURE_STORE_OPTIONS, ...options }
}

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(fallback)
    }, SECURE_STORE_TIMEOUT_MS)

    promise
      .then((value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(fallback)
      })
  })
}

export async function getItemAsync(
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions,
): Promise<string | null> {
  return withTimeout(ExpoSecureStore.getItemAsync(key, mergeOptions(options)), null)
}

export async function setItemAsync(
  key: string,
  value: string,
  options?: ExpoSecureStore.SecureStoreOptions,
): Promise<void> {
  await withTimeout(ExpoSecureStore.setItemAsync(key, value, mergeOptions(options)), undefined)
}

export async function deleteItemAsync(
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions,
): Promise<void> {
  await withTimeout(ExpoSecureStore.deleteItemAsync(key, mergeOptions(options)), undefined)
}

export async function isAvailableAsync(): Promise<boolean> {
  return withTimeout(ExpoSecureStore.isAvailableAsync(), false)
}

export const AFTER_FIRST_UNLOCK = ExpoSecureStore.AFTER_FIRST_UNLOCK
export const WHEN_UNLOCKED = ExpoSecureStore.WHEN_UNLOCKED
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = ExpoSecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = ExpoSecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
