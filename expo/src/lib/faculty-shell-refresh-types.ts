import type { InstructorCourse } from "./instructor-api"

export type ShellRefreshOptions = {
  /** Bypass TTL throttle — use after user actions (pull-to-refresh, mutations). */
  force?: boolean
}

/** Minimum interval between background shell refreshes (focus, foreground). */
export const SHELL_REFRESH_TTL_MS = 45_000

export type RefreshFacultyDataOptions = ShellRefreshOptions

export type RefreshFacultyDataFn = (
  courseOverride?: InstructorCourse | null,
  options?: RefreshFacultyDataOptions,
) => Promise<void>

/** @deprecated Use {@link SHELL_REFRESH_TTL_MS} */
export const FACULTY_SHELL_REFRESH_TTL_MS = SHELL_REFRESH_TTL_MS

export type RefreshStudentDataOptions = ShellRefreshOptions

export type RefreshStudentDataFn = (options?: RefreshStudentDataOptions) => Promise<void>
