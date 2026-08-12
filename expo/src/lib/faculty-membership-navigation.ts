import type { Router } from "expo-router"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { RefreshFacultyDataFn } from "./faculty-shell-refresh-types"

export type FacultyMembershipWebFlow = "checkout" | "success" | "manage" | "cancel"

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

function parseFacultyTier(value: string | null | undefined): FacultyMembershipTier | undefined {
  if (value === "Free" || value === "Pro" || value === "Enterprise") return value
  return undefined
}

export function parseFacultyMembershipWebPath(input: string): {
  flow: FacultyMembershipWebFlow
  plan?: FacultyMembershipTier
  sessionId?: string
  cancelled?: boolean
} | null {
  const full = pathFromUrl(input)
  const [pathOnly, queryPart] = full.split("?")
  const path = pathOnly?.toLowerCase() ?? ""
  const params = queryPart ? new URLSearchParams(queryPart) : null

  if (/\/instructor\/membership\/success/i.test(path)) {
    return {
      flow: "success",
      plan: parseFacultyTier(params?.get("plan") ?? undefined),
      sessionId: params?.get("session_id") ?? undefined,
    }
  }

  if (/\/instructor\/membership\/cancel/i.test(path)) {
    return {
      flow: "cancel",
      plan: parseFacultyTier(params?.get("plan") ?? undefined),
    }
  }

  if (/\/instructor\/membership\/manage/i.test(path)) {
    return { flow: "manage" }
  }

  if (/\/instructor\/membership\/checkout/i.test(path)) {
    return {
      flow: "checkout",
      plan: parseFacultyTier(params?.get("plan") ?? undefined),
      cancelled: params?.get("cancelled") === "1",
    }
  }

  return null
}

export function tryHandleFacultyMembershipFlowExitNavigation(
  router: Pick<Router, "replace" | "push">,
  url: string,
  refreshFacultyData?: RefreshFacultyDataFn | null,
): boolean {
  const full = pathFromUrl(url)
  const pathOnly = full.split("?")[0]?.replace(/\/$/, "").toLowerCase() ?? ""

  if (url.includes("checkout.stripe.com") || url.includes("billing.stripe.com")) {
    return false
  }

  if (
    pathOnly === "/instructor/dashboard-v2" ||
    pathOnly === "/instructor/dashboard" ||
    pathOnly === "/dashboard"
  ) {
    void refreshFacultyData?.(undefined, { force: true })
    router.replace("/dashboard" as never)
    return true
  }

  if (
    pathOnly === "/instructor/membership" ||
    pathOnly === "/instructor/dashboard-v2/membership" ||
    pathOnly === "/instructor/membership/plans"
  ) {
    void refreshFacultyData?.(undefined, { force: true })
    router.replace("/membership" as never)
    return true
  }

  if (pathOnly === "/instructor/login") {
    router.replace("/membership" as never)
    return true
  }

  if (/\/instructor\/membership\/cancel/i.test(pathOnly)) {
    const parsed = parseFacultyMembershipWebPath(full)
    router.replace({
      pathname: "/membership/cancel",
      params: parsed?.plan ? { plan: parsed.plan } : {},
    } as never)
    return true
  }

  return false
}

export function tryHandleFacultyMembershipWebNavigation(
  router: Pick<Router, "replace" | "push">,
  url: string,
  refreshFacultyData?: RefreshFacultyDataFn | null,
): boolean {
  const full = pathFromUrl(url)
  const membershipPath = parseFacultyMembershipWebPath(full)

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

  return tryHandleFacultyMembershipFlowExitNavigation(router, url, refreshFacultyData)
}

export function facultyMembershipFlowTitle(flow: FacultyMembershipWebFlow): string {
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
