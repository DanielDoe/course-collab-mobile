import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  canManageCourseSettings,
  courseExchangeDrawerBadgeCount,
  isCourseExchangeImportableStatus,
  parseCourseExchangeTabParam,
} from "./course-exchange-shared"

const here = dirname(fileURLToPath(import.meta.url))

describe("course exchange client auth contract", () => {
  it("routes course exchange requests through instructorRequest with omitCourseId", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    assert.match(source, /getCourseExchangeSummary/)
    assert.match(source, /getCourseExchangeSupplementOptions/)
    assert.match(source, /rejectCourseExchangeRequest.*reason\?: string/s)
    assert.match(source, /omitCourseId: true/)
  })

  it("gates nav access for teaching assistants", () => {
    assert.equal(canManageCourseSettings("owner"), true)
    assert.equal(canManageCourseSettings(undefined), true)
    assert.equal(canManageCourseSettings("ta"), false)
    assert.equal(canManageCourseSettings("teaching_assistant"), false)
  })

  it("allows import retry on approved and failed statuses", () => {
    assert.equal(isCourseExchangeImportableStatus("APPROVED"), true)
    assert.equal(isCourseExchangeImportableStatus("FAILED"), true)
    assert.equal(isCourseExchangeImportableStatus("PENDING"), false)
  })

  it("parses deep-link tab params", () => {
    assert.equal(parseCourseExchangeTabParam("sent"), "sent")
    assert.equal(parseCourseExchangeTabParam(["share-settings"]), "share-settings")
    assert.equal(parseCourseExchangeTabParam("invalid"), "discover")
  })

  it("aggregates drawer badge counts from summary", () => {
    assert.equal(courseExchangeDrawerBadgeCount({ receivedPending: 2, sentActive: 3 }), 5)
    assert.equal(courseExchangeDrawerBadgeCount({ pending: 1, sentActionable: 0 }), 1)
  })
})
