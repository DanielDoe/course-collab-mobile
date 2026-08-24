import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { DASHBOARD_STUDENT_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))
const STATS_PATHS = DASHBOARD_STUDENT_API_PATHS.filter((path) => path !== "/api/announcements")

describe("dashboard client auth contract", () => {
  it("loads dashboard stats through studentAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "student-dashboard-stats.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest/)
    assert.doesNotMatch(source, /\bfetchJson\b/)
    assert.match(source, /Promise\.allSettled/)
    assert.match(source, /studentContentPath/)
    assert.match(source, /emptyIfSoftMiss/)
    assert.match(source, /err.status === 500/)
    assert.doesNotMatch(source, /Could not load dashboard data/)
    for (const path of STATS_PATHS) {
      assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
  })

  it("treats empty-term attendance streak and leaderboard 500s as a quiet client miss", () => {
    const source = readFileSync(join(here, "student-api.ts"), "utf8")
    assert.ok(source.includes("/api/attendance/streaks"))
    assert.ok(source.includes("/api/attendance/leaderboard"))
    assert.match(source, /response.status === 404 \|\| response.status === 500/)
  })

  it("loads announcements through studentRequest", () => {
    const source = readFileSync(join(here, "student-api.ts"), "utf8")
    assert.match(source, /getAnnouncements:\s*\(session/)
    assert.match(source, /studentRequest/)
  })

  it("loads notifications through the authenticated student client", () => {
    const source = readFileSync(join(here, "student-notifications.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest/)
    assert.doesNotMatch(source, /["']x-student-id["']/)
  })
})
