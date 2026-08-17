export const STORAGE_CONFIG = {
  sessionStore: "expo-secure-store",
  uploadProviders: ["vercel-blob", "course-collab-storage"] as const,
} as const

export function validateProductionStorageConfig(): string[] {
  return []
}
