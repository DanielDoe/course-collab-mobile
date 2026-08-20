import * as ExpoSecureStore from "expo-secure-store"

/** Explicit keychain service — avoids TurboModule/keychain crashes on some iOS builds. */
export const SECURE_STORE_OPTIONS: ExpoSecureStore.SecureStoreOptions = {
  keychainService: "com.coursecollab.app",
}

function mergeOptions(options?: ExpoSecureStore.SecureStoreOptions): ExpoSecureStore.SecureStoreOptions {
  return { ...SECURE_STORE_OPTIONS, ...options }
}

export async function getItemAsync(
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions,
): Promise<string | null> {
  return ExpoSecureStore.getItemAsync(key, mergeOptions(options))
}

export async function setItemAsync(
  key: string,
  value: string,
  options?: ExpoSecureStore.SecureStoreOptions,
): Promise<void> {
  await ExpoSecureStore.setItemAsync(key, value, mergeOptions(options))
}

export async function deleteItemAsync(
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions,
): Promise<void> {
  await ExpoSecureStore.deleteItemAsync(key, mergeOptions(options))
}

export async function isAvailableAsync(): Promise<boolean> {
  return ExpoSecureStore.isAvailableAsync()
}

export const AFTER_FIRST_UNLOCK = ExpoSecureStore.AFTER_FIRST_UNLOCK
export const WHEN_UNLOCKED = ExpoSecureStore.WHEN_UNLOCKED
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = ExpoSecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = ExpoSecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
