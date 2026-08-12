import * as SecureStore from "expo-secure-store"
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

function storageKey(studentId: string): string {
  return `student_cora_ctx_${studentId}`
}

export function getStudentCoraContextFromMemory(studentId: string): StudentCoraContext | null {
  return memoryCache.get(studentId) ?? null
}

export async function loadStudentCoraContext(studentId: string): Promise<StudentCoraContext | null> {
  const cached = memoryCache.get(studentId)
  if (cached) return cached

  try {
    const raw = await SecureStore.getItemAsync(storageKey(studentId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StudentCoraContext
    if (parsed.version !== STUDENT_CORA_CONTEXT_VERSION || !parsed.setupComplete) return null
    memoryCache.set(studentId, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function saveStudentCoraContext(context: StudentCoraContext): Promise<void> {
  memoryCache.set(context.studentId, context)
  await SecureStore.setItemAsync(storageKey(context.studentId), JSON.stringify(context))
}

export async function clearStudentCoraContext(studentId: string): Promise<void> {
  memoryCache.delete(studentId)
  await SecureStore.deleteItemAsync(storageKey(studentId))
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
