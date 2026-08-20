import * as SecureStore from "./secure-store-client"
import { STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP } from "../constants/student-nav"

const KEY_PREFIX = "drawerExpandedGroup."

export const STUDENT_DRAWER_GROUP_IDS = [...STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP].map(
  (group) => group.id,
)

function cacheKey(studentDatabaseId: string) {
  return `${KEY_PREFIX}${studentDatabaseId}`
}

function isValidGroupId(groupId: string | null | undefined): groupId is string {
  return !!groupId && STUDENT_DRAWER_GROUP_IDS.includes(groupId)
}

export async function getStoredDrawerExpandedGroup(
  studentDatabaseId: string,
): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(cacheKey(studentDatabaseId))
    return isValidGroupId(raw) ? raw : null
  } catch {
    return null
  }
}

export async function setStoredDrawerExpandedGroup(
  studentDatabaseId: string,
  groupId: string | null,
): Promise<void> {
  try {
    const key = cacheKey(studentDatabaseId)
    if (isValidGroupId(groupId)) {
      await SecureStore.setItemAsync(key, groupId)
      return
    }
    await SecureStore.deleteItemAsync(key)
  } catch {
    /* non-fatal */
  }
}
