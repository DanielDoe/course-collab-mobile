import { getApiBaseUrl } from "../constants"

export type StripeClientConfig = {
  publishableKey: string
  merchantDisplayName: string
  merchantCountryCode: string
}

let cachedConfig: StripeClientConfig | null = null

export async function fetchStripeClientConfig(): Promise<StripeClientConfig> {
  if (cachedConfig) return cachedConfig
  const response = await fetch(`${getApiBaseUrl()}/api/stripe/config`)
  const body = (await response.json()) as StripeClientConfig & { error?: string }
  if (!response.ok || !body.publishableKey) {
    throw new Error(body.error ?? "Stripe is not configured.")
  }
  cachedConfig = {
    publishableKey: body.publishableKey,
    merchantDisplayName: body.merchantDisplayName ?? "CourseCollab",
    merchantCountryCode: body.merchantCountryCode ?? "US",
  }
  return cachedConfig
}
