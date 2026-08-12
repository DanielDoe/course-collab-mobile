import type { LoginPortal } from "../constants/portals"
import { portalMeta } from "../constants/portals"
import { getSummerNavLabel } from "../constants/summer-nav"
import type { AdminSession, AppSession, GuestSession, SummerSession } from "./session"

export type PortalSession = GuestSession | SummerSession | AdminSession

export function isPortalSession(session: AppSession): session is PortalSession {
  return session.portal === "admin" || session.portal === "guest" || session.portal === "summer"
}

export function getPortalScreenTitle(pathname: string, portal: LoginPortal): string {
  if (portal === "summer") return getSummerNavLabel(pathname)
  if (pathname.includes("/settings")) return "Settings"
  if (pathname.includes("/dashboard")) return "Dashboard"
  return portalMeta(portal).label
}

export function portalSessionMeta(session: PortalSession): string {
  if (session.portal === "guest") {
    return session.guestAccessPurpose === "recommendation_letter"
      ? "Guest · Recommendation letters"
      : "Guest access"
  }
  if (session.portal === "summer") {
    return session.studentProgramRole
      ? `Summer · ${session.studentProgramRole.replace(/_/g, " ")}`
      : "Summer program"
  }
  return session.platformRole ?? session.username
}
