export type LoginPortal = "student" | "guest" | "summer" | "faculty" | "admin"

/** Portals exposed on mobile sign-in (admin is web-only). */
export type MobileLoginPortal = Exclude<LoginPortal, "admin">

export type PortalMeta = {
  id: MobileLoginPortal
  label: string
  shortLabel: string
  icon: "school-outline" | "person-outline" | "briefcase-outline" | "sunny-outline" | "people-outline"
  accent: string
  headline: string
  description: string
}

export type PortalDisplayMeta = {
  id: LoginPortal
  label: string
  shortLabel: string
  icon:
    | "school-outline"
    | "person-outline"
    | "briefcase-outline"
    | "sunny-outline"
    | "people-outline"
    | "shield-outline"
  accent: string
  headline: string
  description: string
}

/** Mobile login portals — admin intentionally omitted (web app only). */
export const MOBILE_LOGIN_PORTALS: PortalMeta[] = [
  {
    id: "student",
    label: "Student",
    shortLabel: "Student",
    icon: "school-outline",
    accent: "#582c83",
    headline: "Student sign in",
    description: "Sign in with your university Student ID or email.",
  },
  {
    id: "guest",
    label: "Career Member",
    shortLabel: "Career",
    icon: "briefcase-outline",
    accent: "#7a4eba",
    headline: "Career Member sign in",
    description: "Résumé AI, cover letters, applications, and recommendation letters.",
  },
  {
    id: "summer",
    label: "Summer",
    shortLabel: "Camp",
    icon: "sunny-outline",
    accent: "#eaaa00",
    headline: "Summer Camp",
    description: "Coming soon — training tracks, projects, and camp sign-in.",
  },
  {
    id: "faculty",
    label: "Faculty",
    shortLabel: "Faculty",
    icon: "people-outline",
    accent: "#582c83",
    headline: "Faculty sign in",
    description: "Instructors, TAs, graders, and observers.",
  },
]

const ADMIN_PORTAL_DISPLAY: PortalDisplayMeta = {
  id: "admin",
  label: "Admin",
  shortLabel: "Admin",
  icon: "shield-outline",
  accent: "#3d1f5c",
  headline: "Admin",
  description: "CourseCollab administration",
}

/** @deprecated Use MOBILE_LOGIN_PORTALS on mobile; web may include admin. */
export const LOGIN_PORTALS = MOBILE_LOGIN_PORTALS

export function portalMeta(id: MobileLoginPortal): PortalMeta
export function portalMeta(id: LoginPortal): PortalDisplayMeta
export function portalMeta(id: LoginPortal): PortalMeta | PortalDisplayMeta {
  if (id === "admin") return ADMIN_PORTAL_DISPLAY
  return MOBILE_LOGIN_PORTALS.find((p) => p.id === id) ?? MOBILE_LOGIN_PORTALS[0]
}

export function isMobileLoginPortal(id: LoginPortal): id is MobileLoginPortal {
  return id !== "admin"
}
