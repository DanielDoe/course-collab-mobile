import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldAnimateDrawerClosed } from "./shell-drawer-close"

describe("shouldAnimateDrawerClosed", () => {
  it("always closes a drawer that was fully open, even if a swipe left dragging true", () => {
    assert.equal(
      shouldAnimateDrawerClosed({
        drawerOpen: false,
        dragging: true,
        wasFullyOpen: true,
      }),
      true,
    )
  })

  it("does not fight an in-progress edge-open preview", () => {
    assert.equal(
      shouldAnimateDrawerClosed({
        drawerOpen: false,
        dragging: true,
        wasFullyOpen: false,
      }),
      false,
    )
  })

  it("closes a dismissed preview after the gesture ends", () => {
    assert.equal(
      shouldAnimateDrawerClosed({
        drawerOpen: false,
        dragging: false,
        wasFullyOpen: false,
      }),
      true,
    )
  })

  it("does not close while the drawer is still requested open", () => {
    assert.equal(
      shouldAnimateDrawerClosed({
        drawerOpen: true,
        dragging: false,
        wasFullyOpen: true,
      }),
      false,
    )
  })
})
