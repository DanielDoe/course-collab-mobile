const SHELL_ROOTS = new Set(["/", "/dashboard"])

/** Drawer hamburger on dashboard; back chevron after a dashboard (or other) stack push. */
export function shellShowsBack(pathname: string, canGoBack: boolean): boolean {
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/"
  if (SHELL_ROOTS.has(path)) return false
  if (path === "/assessment" || path.startsWith("/assessment/")) return true
  if (path === "/take" || path.startsWith("/take/")) return true
  if (path === "/results" || path.startsWith("/results/")) return true
  if (path.startsWith("/collaboration/forum/")) return true
  return canGoBack
}

export const studentShellShowsBack = shellShowsBack
export const facultyShellShowsBack = shellShowsBack
