/**
 * Run: npx tsx --test src/lib/circuit-workspace-viewport.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fitWorkspaceViewport } from "./circuit-workspace-viewport"

describe("fitWorkspaceViewport", () => {
  it("letterboxes a 3:4 page into a tall phone stage", () => {
    const fitted = fitWorkspaceViewport(390, 780, 1200, 1600)
    assert.equal(fitted.width, 390)
    assert.equal(fitted.height, 520)
  })

  it("letterboxes a 3:4 page into a short leftover sheet", () => {
    const fitted = fitWorkspaceViewport(360, 240, 1200, 1600)
    assert.equal(fitted.width, 180)
    assert.equal(fitted.height, 240)
  })

  it("returns zeros for an unmeasured stage", () => {
    assert.deepEqual(fitWorkspaceViewport(0, 400, 1200, 1600), { width: 0, height: 0 })
  })
})
