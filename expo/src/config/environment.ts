import Constants from "expo-constants"

export type AppEnvironment = "development" | "test" | "production"

const VALID_ENVIRONMENTS = new Set<AppEnvironment>(["development", "test", "production"])

function readEnvValue(raw: unknown): AppEnvironment | undefined {
  if (typeof raw !== "string") return undefined
  return VALID_ENVIRONMENTS.has(raw as AppEnvironment) ? (raw as AppEnvironment) : undefined
}

function readConfiguredEnvironment(): AppEnvironment | undefined {
  return (
    readEnvValue(process.env.EXPO_PUBLIC_ENVIRONMENT) ??
    readEnvValue(Constants.expoConfig?.extra?.environment)
  )
}

/** Resolved runtime environment for the Expo client. */
export function getAppEnvironment(): AppEnvironment {
  if (process.env.NODE_ENV === "test") return "test"
  const configured = readConfiguredEnvironment()
  if (configured) return configured
  if (typeof __DEV__ !== "undefined" && __DEV__) return "development"
  return "production"
}

export function isProductionEnvironment(): boolean {
  return getAppEnvironment() === "production"
}

export function isDevelopmentEnvironment(): boolean {
  return getAppEnvironment() === "development"
}

export function assertProductionEnvironment(): void {
  if (!isProductionEnvironment()) {
    throw new Error(`Expected production environment, got ${getAppEnvironment()}.`)
  }
}
