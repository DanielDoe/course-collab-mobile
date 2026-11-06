export type DrawerEdgeSwipePortal = "student" | "faculty" | "guest" | "summer"

const SHARED_IMMERSIVE_DRAWER_EDGE_OPEN: RegExp[] = [
  /^\/settings(\/|$)/,
  /^\/membership/,
]

/** Routes with mostly vertical UI — safe for a left-edge open gesture. */
const STUDENT_IMMERSIVE_DRAWER_EDGE_OPEN: RegExp[] = [
  ...SHARED_IMMERSIVE_DRAWER_EDGE_OPEN,
  /^\/schedule-adjustment\//,
  /^\/rewards\/classroom-point\//,
  /^\/rewards\/classroom-task\//,
  /\/announcements\/[^/]+\/?$/,
  /^\/practice\//,
  /^\/module\/ai-tutor$/,
  /^\/notes\/[^/]+$/,
  /^\/notetaker\/[^/]+$/,
]

const FACULTY_IMMERSIVE_DRAWER_EDGE_OPEN: RegExp[] = [...SHARED_IMMERSIVE_DRAWER_EDGE_OPEN]

const GUEST_IMMERSIVE_DRAWER_EDGE_OPEN: RegExp[] = [
  ...SHARED_IMMERSIVE_DRAWER_EDGE_OPEN,
  /^\/recommendation\//,
  /^\/guest\/cora-career/,
  /^\/guest\/cora-credits/,
  /^\/module\/cora-/,
]

const SUMMER_IMMERSIVE_DRAWER_EDGE_OPEN: RegExp[] = [
  ...SHARED_IMMERSIVE_DRAWER_EDGE_OPEN,
  /\/summer\/training\/.*\/module\//,
]

const PORTAL_IMMERSIVE_PATTERNS: Record<DrawerEdgeSwipePortal, RegExp[]> = {
  student: STUDENT_IMMERSIVE_DRAWER_EDGE_OPEN,
  faculty: FACULTY_IMMERSIVE_DRAWER_EDGE_OPEN,
  guest: GUEST_IMMERSIVE_DRAWER_EDGE_OPEN,
  summer: SUMMER_IMMERSIVE_DRAWER_EDGE_OPEN,
}

export function immersiveRouteAllowsDrawerEdgeOpen(
  pathname: string,
  portal: DrawerEdgeSwipePortal,
): boolean {
  return PORTAL_IMMERSIVE_PATTERNS[portal].some((pattern) => pattern.test(pathname))
}

/** When the shell shows the drawer control (not stack back), allow a left-edge open gesture. */
export function shouldEnableDrawerEdgeSwipe(opts: {
  immersive: boolean
  drawerOpen: boolean
  stackShowsBack: boolean
  pathname: string
  portal: DrawerEdgeSwipePortal
}): boolean {
  if (opts.drawerOpen) return false
  if (opts.stackShowsBack) return false
  if (immersiveRouteBlocksDrawerEdgeOpen(opts.pathname)) return false
  if (!opts.immersive) return true
  return immersiveRouteAllowsDrawerEdgeOpen(opts.pathname, opts.portal)
}

/** Immersive routes that still block edge-open (horizontal pan UI). */
export function immersiveRouteBlocksDrawerEdgeOpen(pathname: string): boolean {
  if (/^\/lecture\//.test(pathname)) return true
  if (/^\/flashcards\//.test(pathname)) return true
  if (/^\/messages\//.test(pathname)) return true
  if (/^\/assessment\//.test(pathname)) return true
  if (/^\/take\//.test(pathname)) return true
  if (/^\/practice\/quiz/.test(pathname)) return true
  if (/^\/collaboration\//.test(pathname)) return true
  if (pathname.includes("/codebench/ide")) return true
  return false
}
