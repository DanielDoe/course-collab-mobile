import { appendNativeQuery } from "../constants/module-web-paths"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { FacultyBillingCadence } from "./faculty-membership-plans"

export function buildFacultyMembershipCheckoutWebPath(
  plan: FacultyMembershipTier,
  cadence: FacultyBillingCadence = "semester",
): string {
  const params = new URLSearchParams({
    plan,
    cadence,
  })
  return appendNativeQuery(`/instructor/dashboard-v2/membership/checkout?${params.toString()}`)
}

export function buildFacultyMembershipSuccessWebPath(options?: {
  sessionId?: string
  plan?: string
}): string {
  const params = new URLSearchParams()
  if (options?.sessionId) params.set("session_id", options.sessionId)
  if (options?.plan) params.set("plan", options.plan)
  const query = params.toString()
  return appendNativeQuery(`/instructor/dashboard-v2/membership/success${query ? `?${query}` : ""}`)
}

export function buildFacultyMembershipManageWebPath(): string {
  return appendNativeQuery("/instructor/dashboard-v2/membership/manage")
}

export function buildFacultyMembershipCancelWebPath(plan?: FacultyMembershipTier): string {
  const params = new URLSearchParams()
  if (plan) params.set("plan", plan)
  params.set("cadence", "semester")
  const query = params.toString()
  return appendNativeQuery(`/instructor/dashboard-v2/membership/cancel${query ? `?${query}` : ""}`)
}

export function openFacultyMembershipCheckout(
  router: { push: (href: never) => void },
  plan: FacultyMembershipTier,
  cadence: FacultyBillingCadence = "semester",
) {
  router.push({
    pathname: "/membership/checkout",
    params: { plan, cadence },
  } as never)
}

export function openFacultyMembershipManage(router: { push: (href: never) => void }) {
  router.push("/membership/manage" as never)
}
