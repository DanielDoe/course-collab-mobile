const SHELL_ROOTS = new Set(["/", "/dashboard"])

/** Drawer hamburger on dashboard; back chevron after a dashboard (or other) stack push. */
export function shellShowsBack(pathname: string, canGoBack: boolean): boolean {
  if (!canGoBack) return false
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/"
  return !SHELL_ROOTS.has(path)
}

export const studentShellShowsBack = shellShowsBack
export const facultyShellShowsBack = shellShowsBack
