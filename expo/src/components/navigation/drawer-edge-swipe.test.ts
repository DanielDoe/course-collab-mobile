import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  immersiveRouteAllowsDrawerEdgeOpen,
  immersiveRouteBlocksDrawerEdgeOpen,
  shouldEnableDrawerEdgeSwipe,
} from "./drawer-edge-swipe"

describe("shouldEnableDrawerEdgeSwipe", () => {
  it("opens on root screens without stack history", () => {
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: false,
        drawerOpen: false,
        stackShowsBack: false,
        pathname: "/module/lectures",
        portal: "student",
      }),
      true,
    )
  })

  it("opens on dashboard even when auth stack history exists", () => {
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: false,
        drawerOpen: false,
        stackShowsBack: false,
        pathname: "/dashboard",
        portal: "student",
      }),
      true,
    )
  })

  it("defers to native stack back when the shell shows back", () => {
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: false,
        drawerOpen: false,
        stackShowsBack: true,
        pathname: "/lecture/1",
        portal: "student",
      }),
      false,
    )
  })

  it("stays off while the drawer is already open", () => {
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: false,
        drawerOpen: true,
        stackShowsBack: false,
        pathname: "/module/lectures",
        portal: "student",
      }),
      false,
    )
  })

  it("stays off while the drawer modal is still mounted during close animation", () => {
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: false,
        drawerOpen: true,
        stackShowsBack: false,
        pathname: "/dashboard",
        portal: "student",
      }),
      false,
    )
  })

  it("stays off on immersive routes with horizontal pan UI", () => {
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: true,
        drawerOpen: false,
        stackShowsBack: false,
        pathname: "/lecture/3",
        portal: "student",
      }),
      false,
    )
  })

  it("allows edge-open on safe immersive routes", () => {
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: true,
        drawerOpen: false,
        stackShowsBack: false,
        pathname: "/settings",
        portal: "student",
      }),
      true,
    )
    assert.equal(
      shouldEnableDrawerEdgeSwipe({
        immersive: true,
        drawerOpen: false,
        stackShowsBack: false,
        pathname: "/schedule-adjustment/12",
        portal: "student",
      }),
      true,
    )
  })
})

describe("immersiveRouteAllowsDrawerEdgeOpen", () => {
  it("whitelists settings and membership across portals", () => {
    assert.equal(immersiveRouteAllowsDrawerEdgeOpen("/settings/profile", "faculty"), true)
    assert.equal(immersiveRouteAllowsDrawerEdgeOpen("/membership", "guest"), true)
  })

  it("blocks lecture and flashcard immersive routes", () => {
    assert.equal(immersiveRouteAllowsDrawerEdgeOpen("/lecture/3", "student"), false)
    assert.equal(immersiveRouteBlocksDrawerEdgeOpen("/flashcards/deck/1"), true)
    assert.equal(immersiveRouteBlocksDrawerEdgeOpen("/messages/thread/1"), true)
  })
})
