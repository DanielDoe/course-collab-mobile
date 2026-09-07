import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shellOverlaySheetCanPresent } from "./shell-overlay-sheet"

describe("shellOverlaySheetCanPresent", () => {
  it("presents from the header when no other shell modal is up", () => {
    assert.equal(
      shellOverlaySheetCanPresent({
        requested: true,
        drawerModalVisible: false,
        profileOpen: false,
        notificationsOpen: false,
      }),
      true,
    )
  })

  it("waits while the drawer modal is still dismissing", () => {
    assert.equal(
      shellOverlaySheetCanPresent({
        requested: true,
        drawerModalVisible: true,
        profileOpen: false,
        notificationsOpen: false,
      }),
      false,
    )
  })

  it("waits while the profile or notifications sheet is open", () => {
    assert.equal(
      shellOverlaySheetCanPresent({
        requested: true,
        drawerModalVisible: false,
        profileOpen: true,
        notificationsOpen: false,
      }),
      false,
    )
    assert.equal(
      shellOverlaySheetCanPresent({
        requested: true,
        drawerModalVisible: false,
        profileOpen: false,
        notificationsOpen: true,
      }),
      false,
    )
  })

  it("stays closed when the picker was not requested", () => {
    assert.equal(
      shellOverlaySheetCanPresent({
        requested: false,
        drawerModalVisible: false,
        profileOpen: false,
        notificationsOpen: false,
      }),
      false,
    )
  })
})
