import * as SecureStore from "expo-secure-store"
import type { MobileLoginPortal } from "../constants/portals"

const KEY = "rememberedLoginPortal"

const VALID: MobileLoginPortal[] = ["student", "faculty", "guest", "summer"]

export async function readRememberedLoginPortal(): Promise<MobileLoginPortal | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    if (raw && VALID.includes(raw as MobileLoginPortal)) {
      return raw as MobileLoginPortal
    }
    return null
  } catch {
    return null
  }
}

export async function persistRememberedLoginPortal(portal: MobileLoginPortal): Promise<void> {
  await SecureStore.setItemAsync(KEY, portal)
}
