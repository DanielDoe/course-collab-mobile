import { getAppEnvironment } from "./environment"

export const AUTH_CONFIG = {
  sessionDurationMs: 24 * 60 * 60 * 1000,
  minimumPasswordLength: 8,
  accountDeletionConfirmPhrase: "DELETE",
} as const

export function validateProductionAuthConfig(): string[] {
  const errors: string[] = []
  if (getAppEnvironment() !== "production") return errors

  if (AUTH_CONFIG.minimumPasswordLength < 8) {
    errors.push("Production minimum password length must be at least 8 characters.")
  }

  return errors
}
