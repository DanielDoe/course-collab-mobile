import * as SecureStore from "./secure-store-client"
import { FACULTY_NAV_GROUPS } from "../constants/faculty-nav"

const KEY_PREFIX = "facultyDrawerExpandedGroup."

export const FACULTY_DRAWER_GROUP_IDS = FACULTY_NAV_GROUPS.map((g) => g.id)

function cacheKey(instructorId: number) {
  return `${KEY_PREFIX}${instructorId}`
}

function isValidGroupId(groupId: string | null | undefined): groupId is string {
  return !!groupId && FACULTY_DRAWER_GROUP_IDS.includes(groupId)
}

export async function getStoredFacultyDrawerExpandedGroup(
  instructorId: number,
): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(cacheKey(instructorId))
    return isValidGroupId(raw) ? raw : null
  } catch {
    return null
  }
}

export async function setStoredFacultyDrawerExpandedGroup(
  instructorId: number,
  groupId: string | null,
): Promise<void> {
  try {
    const key = cacheKey(instructorId)
    if (isValidGroupId(groupId)) {
      await SecureStore.setItemAsync(key, groupId)
      return
    }
    await SecureStore.deleteItemAsync(key)
  } catch {
    /* non-fatal */
  }
}
