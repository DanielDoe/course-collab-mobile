import type { Router } from "expo-router"
import { isDrawerShellRouteActive, navigateDrawerShellRoute } from "./drawer-shell-navigation"

/** @deprecated Use {@link isDrawerShellRouteActive} */
export const isFacultyDrawerRouteActive = isDrawerShellRouteActive

/** @deprecated Use {@link navigateDrawerShellRoute} */
export function navigateFacultyDrawerRoute(router: Router, pathname: string, route: string) {
  navigateDrawerShellRoute(router, pathname, route)
}
