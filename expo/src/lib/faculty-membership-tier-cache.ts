import * as SecureStore from "expo-secure-store"
import { parseFacultyMembershipTier } from "./faculty-membership-tier"
import type { FacultyMembershipTier } from "../types/dashboard"

const CACHE_KEY_PREFIX = "facultyMembershipTier."

function cacheKey(instructorId: number) {
  return `${CACHE_KEY_PREFIX}${instructorId}`
}

export async function getCachedFacultyMembershipTier(
  instructorId: number,
): Promise<FacultyMembershipTier | null> {
  try {
    const raw = await SecureStore.getItemAsync(cacheKey(instructorId))
    if (!raw) return null
    return parseFacultyMembershipTier(raw)
  } catch {
    return null
  }
}

export async function setCachedFacultyMembershipTier(
  instructorId: number,
  tier: FacultyMembershipTier,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(cacheKey(instructorId), tier)
  } catch {
    /* non-fatal */
  }
}

export async function primeFacultyMembershipTierCache(
  instructorId: number,
  tier: string | null | undefined,
): Promise<FacultyMembershipTier | null> {
  if (!tier) return null
  const parsed = parseFacultyMembershipTier(tier)
  await setCachedFacultyMembershipTier(instructorId, parsed)
  return parsed
}
