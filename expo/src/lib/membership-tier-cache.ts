import * as SecureStore from "./secure-store-client"
import { parseMembershipTier } from "./membership-tier"
import type { MembershipTier } from "../types/dashboard"

const CACHE_KEY_PREFIX = "membershipTier."

function cacheKey(studentDatabaseId: string) {
  return `${CACHE_KEY_PREFIX}${studentDatabaseId}`
}

export async function getCachedMembershipTier(
  studentDatabaseId: string,
): Promise<MembershipTier | null> {
  try {
    const raw = await SecureStore.getItemAsync(cacheKey(studentDatabaseId))
    if (!raw) return null
    return parseMembershipTier(raw)
  } catch {
    return null
  }
}

export async function setCachedMembershipTier(
  studentDatabaseId: string,
  tier: MembershipTier,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(cacheKey(studentDatabaseId), tier)
  } catch {
    /* non-fatal */
  }
}

export async function clearCachedMembershipTier(studentDatabaseId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(cacheKey(studentDatabaseId))
  } catch {
    /* non-fatal */
  }
}

/** Persist tier from login / refresh so the shell can hydrate before network calls finish. */
export async function primeMembershipTierCache(
  studentDatabaseId: string,
  tier: string | null | undefined,
): Promise<MembershipTier | null> {
  if (!tier) return null
  const parsed = parseMembershipTier(tier)
  await setCachedMembershipTier(studentDatabaseId, parsed)
  return parsed
}
