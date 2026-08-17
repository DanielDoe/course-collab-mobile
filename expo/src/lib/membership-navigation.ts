import type { Router } from "expo-router"
import type { MembershipTier } from "../types/dashboard"
import type { RefreshStudentDataFn } from "./faculty-shell-refresh-types"

export type MembershipWebFlow = "checkout" | "success" | "manage" | "cancel"

function pathFromUrl(input: string): string {
  const raw = input.trim()
  if (!raw) return ""
  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw)
      return `${url.pathname}${url.search}`
    }
  } catch {
    /* use raw path */
  }
  return raw.startsWith("/") ? raw : `/${raw}`
}

export function parseMembershipWebPath(input: string): {
  flow: MembershipWebFlow
  plan?: MembershipTier
  sessionId?: string
  cancelled?: boolean
} | null {
  const full = pathFromUrl(input)
  const [pathOnly, queryPart] = full.split("?")
  const path = pathOnly?.toLowerCase() ?? ""
  const params = queryPart ? new URLSearchParams(queryPart) : null

  if (/\/student\/(?:dashboard-v2\/)?membership\/success/i.test(path)) {
    return {
      flow: "success",
      plan: (params?.get("plan") as MembershipTier | null) ?? undefined,
      sessionId: params?.get("session_id") ?? undefined,
    }
  }

  if (/\/student\/(?:dashboard-v2\/)?membership\/cancel/i.test(path)) {
    return {
      flow: "cancel",
      plan: (params?.get("plan") as MembershipTier | null) ?? undefined,
    }
  }

  if (/\/student\/(?:dashboard-v2\/)?membership\/manage/i.test(path)) {
    return { flow: "manage" }
  }

  if (/\/student\/(?:dashboard-v2\/)?membership\/checkout/i.test(path)) {
    return {
      flow: "checkout",
      plan: (params?.get("plan") as MembershipTier | null) ?? undefined,
      cancelled: params?.get("cancelled") === "1",
    }
  }

  return null
}

/** Intercept post-checkout navigations (dashboard, plans) without re-routing flow screens. */
export function tryHandleMembershipFlowExitNavigation(
  router: Pick<Router, "replace" | "push">,
  url: string,
  refreshStudentData?: RefreshStudentDataFn | null,
): boolean {
  const full = pathFromUrl(url)
  const pathOnly = full.split("?")[0]?.replace(/\/$/, "").toLowerCase() ?? ""

  if (url.includes("checkout.stripe.com") || url.includes("billing.stripe.com")) {
    return false
  }

  if (
    pathOnly === "/student/dashboard-v2" ||
    pathOnly === "/student/dashboard" ||
    pathOnly === "/dashboard"
  ) {
    void refreshStudentData?.({ force: true })
    router.replace("/dashboard" as never)
    return true
  }

  if (
    pathOnly === "/student/membership" ||
    pathOnly === "/student/dashboard-v2/membership" ||
    pathOnly === "/student/membership/plans"
  ) {
    void refreshStudentData?.({ force: true })
    router.replace("/membership" as never)
    return true
  }

  if (pathOnly === "/student/login") {
    router.replace("/membership" as never)
    return true
  }

  if (/\/student\/(?:dashboard-v2\/)?membership\/cancel/i.test(pathOnly)) {
    return false
  }

  return false
}

export function tryHandleMembershipWebNavigation(
  router: Pick<Router, "replace" | "push">,
  url: string,
  refreshStudentData?: RefreshStudentDataFn | null,
): boolean {
  const full = pathFromUrl(url)
  const membershipPath = parseMembershipWebPath(full)

  if (membershipPath?.flow === "success") {
    router.replace({
      pathname: "/membership/success",
      params: {
        ...(membershipPath.sessionId ? { session_id: membershipPath.sessionId } : {}),
        ...(membershipPath.plan ? { plan: membershipPath.plan } : {}),
      },
    } as never)
    return true
  }

  if (membershipPath?.flow === "manage") {
    router.replace("/membership/manage" as never)
    return true
  }

  if (membershipPath?.flow === "checkout" && membershipPath.plan) {
    router.replace({
      pathname: "/membership/checkout",
      params: { plan: membershipPath.plan },
    } as never)
    return true
  }

  if (membershipPath?.flow === "cancel") {
    router.replace({
      pathname: "/membership/cancel",
      params: membershipPath.plan ? { plan: membershipPath.plan } : {},
    } as never)
    return true
  }

  return tryHandleMembershipFlowExitNavigation(router, url, refreshStudentData)
}

export function membershipFlowTitle(flow: MembershipWebFlow): string {
  switch (flow) {
    case "checkout":
      return "Checkout"
    case "success":
      return "Membership activated"
    case "manage":
      return "Billing & subscription"
    case "cancel":
      return "Payment cancelled"
    default:
      return "Membership"
  }
}
