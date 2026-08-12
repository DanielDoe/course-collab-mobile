import * as SecureStore from "expo-secure-store"
import type { InstructorScope } from "./instructor-content-api"
import {
  FACULTY_CORA_CONTEXT_VERSION,
  type FacultyCoraInstructorContext,
} from "./faculty-cora-instructor-context"
import { FACULTY_CORA_CAPABILITIES, facultyCoraCapability, type FacultyCoraCapabilityId } from "./faculty-cora-config"

const memoryCache = new Map<string, FacultyCoraInstructorContext>()

function storageKey(instructorId: number, courseId: number): string {
  return `faculty_cora_ctx_${instructorId}_${courseId}`
}

function cacheKey(instructorId: number, courseId: number): string {
  return `${instructorId}:${courseId}`
}

export function getFacultyCoraContextFromMemory(scope: InstructorScope): FacultyCoraInstructorContext | null {
  if (scope.courseId == null) return null
  return memoryCache.get(cacheKey(scope.instructorId, scope.courseId)) ?? null
}

export async function loadFacultyCoraInstructorContext(
  scope: InstructorScope,
): Promise<FacultyCoraInstructorContext | null> {
  if (scope.courseId == null) return null
  const key = cacheKey(scope.instructorId, scope.courseId)
  const cached = memoryCache.get(key)
  if (cached) return cached

  try {
    const raw = await SecureStore.getItemAsync(storageKey(scope.instructorId, scope.courseId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as FacultyCoraInstructorContext
    if (parsed.version !== FACULTY_CORA_CONTEXT_VERSION || !parsed.setupComplete) return null
    memoryCache.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function saveFacultyCoraInstructorContext(
  context: FacultyCoraInstructorContext,
): Promise<void> {
  const key = cacheKey(context.instructorId, context.activeCourseId)
  memoryCache.set(key, context)
  await SecureStore.setItemAsync(
    storageKey(context.instructorId, context.activeCourseId),
    JSON.stringify(context),
  )
}

export async function clearFacultyCoraInstructorContext(
  instructorId: number,
  courseId: number,
): Promise<void> {
  memoryCache.delete(cacheKey(instructorId, courseId))
  await SecureStore.deleteItemAsync(storageKey(instructorId, courseId))
}

export function resolveFacultyCoraCapabilities(context: FacultyCoraInstructorContext | null) {
  return context?.tailoredCapabilities ?? FACULTY_CORA_CAPABILITIES
}

export function resolveFacultyCoraCapability(id: FacultyCoraCapabilityId, context: FacultyCoraInstructorContext | null) {
  const capabilities = resolveFacultyCoraCapabilities(context)
  const found = capabilities.find((capability) => capability.id === id)
  return found ?? facultyCoraCapability(id)
}
