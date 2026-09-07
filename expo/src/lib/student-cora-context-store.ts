import * as SecureStore from "./secure-store-client"
import {
  STUDENT_CORA_CONTEXT_VERSION,
  type StudentCoraContext,
} from "./student-cora-context"
import {
  STUDENT_CORA_CAPABILITIES,
  studentCoraCapability,
  type StudentCoraCapability,
  type StudentCoraCapabilityId,
} from "./student-cora-config"
import { tailorStudentCoraCapabilities } from "./student-cora-context"

const memoryCache = new Map<string, StudentCoraContext>()

function storageKey(studentId: string, courseId?: number | null): string {
  if (courseId != null && Number.isFinite(courseId) && courseId > 0) {
    return `student_cora_ctx_${studentId}_${Math.trunc(courseId)}`
  }
  return `student_cora_ctx_${studentId}`
}

function cacheKey(studentId: string, courseId?: number | null): string {
  return storageKey(studentId, courseId)
}

export function getStudentCoraContextFromMemory(
  studentId: string,
  courseId?: number | null,
): StudentCoraContext | null {
  return memoryCache.get(cacheKey(studentId, courseId)) ?? null
}

export async function loadStudentCoraContext(
  studentId: string,
  courseId?: number | null,
): Promise<StudentCoraContext | null> {
  const key = cacheKey(studentId, courseId)
  const cached = memoryCache.get(key)
  if (cached) return cached

  try {
    const raw = await SecureStore.getItemAsync(storageKey(studentId, courseId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StudentCoraContext
    if (parsed.version !== STUDENT_CORA_CONTEXT_VERSION || !parsed.setupComplete) return null
    if (courseId != null && parsed.courseId != null && parsed.courseId !== courseId) return null
    memoryCache.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function saveStudentCoraContext(context: StudentCoraContext): Promise<void> {
  const key = cacheKey(context.studentId, context.courseId)
  memoryCache.set(key, context)
  await SecureStore.setItemAsync(storageKey(context.studentId, context.courseId), JSON.stringify(context))
}

export async function clearStudentCoraContext(studentId: string, courseId?: number | null): Promise<void> {
  const key = cacheKey(studentId, courseId)
  memoryCache.delete(key)
  await SecureStore.deleteItemAsync(storageKey(studentId, courseId))
  if (courseId != null) {
    memoryCache.delete(storageKey(studentId))
    await SecureStore.deleteItemAsync(storageKey(studentId))
  }
}

export function resolveStudentCoraCapabilities(context: StudentCoraContext | null): StudentCoraCapability[] {
  if (context?.payload && context.setupComplete) {
    return tailorStudentCoraCapabilities(context.payload)
  }
  return STUDENT_CORA_CAPABILITIES
}

export function resolveStudentCoraCapability(
  id: StudentCoraCapabilityId,
  context: StudentCoraContext | null,
): StudentCoraCapability {
  const capabilities = resolveStudentCoraCapabilities(context)
  return capabilities.find((capability) => capability.id === id) ?? studentCoraCapability(id)
}
