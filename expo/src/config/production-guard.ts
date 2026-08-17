import { validateProductionApiConfig } from "./api"
import { validateProductionAuthConfig } from "./auth"
import { validateProductionAiConfig } from "./ai"
import { validateProductionPaymentsConfig } from "./payments"
import { validateProductionStorageConfig } from "./storage"

export type ProductionGuardResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function runProductionGuard(options?: { warnings?: string[] }): ProductionGuardResult {
  const errors = [
    ...validateProductionApiConfig(),
    ...validateProductionAuthConfig(),
    ...validateProductionPaymentsConfig(),
    ...validateProductionStorageConfig(),
    ...validateProductionAiConfig(),
  ]

  return {
    ok: errors.length === 0,
    errors,
    warnings: options?.warnings ?? [],
  }
}
