import { appendNativeQuery } from "../constants/module-web-paths"
import type { MembershipTier } from "../types/dashboard"

export type MembershipBillingCadence = "semester" | "monthly"

export function buildMembershipCheckoutWebPath(
  plan: MembershipTier,
  cadence: MembershipBillingCadence = "semester",
): string {
  const params = new URLSearchParams({
    plan,
    cadence,
  })
  return appendNativeQuery(`/student/membership/checkout?${params.toString()}`)
}

export function buildMembershipSuccessWebPath(options?: {
  sessionId?: string
  plan?: string
}): string {
  const params = new URLSearchParams()
  if (options?.sessionId) params.set("session_id", options.sessionId)
  if (options?.plan) params.set("plan", options.plan)
  const query = params.toString()
  return appendNativeQuery(`/student/membership/success${query ? `?${query}` : ""}`)
}

export function buildMembershipManageWebPath(): string {
  return appendNativeQuery("/student/membership/manage")
}

export function buildMembershipCancelWebPath(plan?: MembershipTier): string {
  const params = new URLSearchParams()
  if (plan) params.set("plan", plan)
  params.set("cadence", "semester")
  const query = params.toString()
  return appendNativeQuery(`/student/membership/cancel${query ? `?${query}` : ""}`)
}

export function openMembershipCheckout(
  router: { push: (href: never) => void },
  plan: MembershipTier,
) {
  router.push({
    pathname: "/membership/checkout",
    params: { plan },
  } as never)
}

export function openMembershipManage(router: { push: (href: never) => void }) {
  router.push("/membership/manage" as never)
}
