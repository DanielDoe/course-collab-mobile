import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { FAB_PRESS_SCALE, NAV_GUARD_MS, PRESS_SCALE, motion } from "./motion"
import { spring } from "./springs"
import {
  navigationKeyFromHref,
  resetNavigationGuardForTests,
  shouldAcceptNavigation,
} from "./navigation"

describe("CourseCollab motion tokens", () => {
  it("keeps micro-interactions inside 120–250ms", () => {
    assert.ok(motion.fast >= 120 && motion.fast <= 250)
    assert.ok(motion.normal >= 120 && motion.normal <= 250)
    assert.ok(motion.slow > motion.normal)
    assert.equal(motion.instant, 0)
  })

  it("uses subtle press scales", () => {
    assert.equal(PRESS_SCALE, 0.98)
    assert.equal(FAB_PRESS_SCALE, 0.94)
  })

  it("exposes snappy, standard, and gentle springs", () => {
    assert.ok(spring.snappy.stiffness > spring.standard.stiffness)
    assert.ok(spring.standard.stiffness > spring.gentle.stiffness)
    assert.ok(spring.drawer.stiffness > 200)
  })

  it("collapses duration when reduce motion is on", () => {
    assert.equal(motion.instant, 0)
    assert.equal(motion.fast, 140)
  })

  it("guards duplicate navigation to the same destination", () => {
    resetNavigationGuardForTests()
    assert.equal(shouldAcceptNavigation("/module/practice", NAV_GUARD_MS, 1_000), true)
    assert.equal(shouldAcceptNavigation("/module/practice", NAV_GUARD_MS, 1_100), false)
    assert.equal(shouldAcceptNavigation("/module/notes", NAV_GUARD_MS, 1_120), true)
    assert.equal(shouldAcceptNavigation("/module/practice", NAV_GUARD_MS, 1_500), true)
  })

  it("builds a stable key from href objects", () => {
    assert.equal(
      navigationKeyFromHref({ pathname: "/assessment/[id]", params: { id: "12" } }),
      '/assessment/[id]:{"id":"12"}',
    )
  })
})
