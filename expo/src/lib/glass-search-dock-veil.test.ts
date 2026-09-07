/**
 * Run: npx tsx --test src/lib/glass-search-dock-veil.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  searchDockGutterColor,
  searchDockReadableWash,
  searchDockVeilColors,
} from "./glass-search-dock-veil"

describe("search dock reading veil", () => {
  it("fades a theme canvas from clear to nearly opaque", () => {
    const [top, mid, bottom] = searchDockVeilColors("#F2F2F7")
    assert.match(top, /0\)$/)
    assert.match(mid, /0\.58\)$/)
    assert.match(bottom, /0\.94\)$/)
  })

  it("uses a denser wash than the default 48% frost", () => {
    assert.equal(searchDockReadableWash(false), "rgba(255, 255, 255, 0.84)")
    assert.equal(searchDockReadableWash(true), "rgba(28, 28, 30, 0.78)")
  })

  it("softens the side gutters without going fully opaque", () => {
    assert.equal(searchDockGutterColor("#F2F2F7"), "rgba(242,242,247,0.88)")
  })
})
