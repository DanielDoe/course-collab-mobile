import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  COMPACT_PHONE_MAX_WIDTH,
  KPI_GRID_SINGLE_COLUMN_MAX_WIDTH,
  LARGE_TABLET_MIN_WIDTH,
  TABLET_MIN_WIDTH,
} from "./responsive-layout-breakpoints"
import {
  modulePageCardPadding,
  modulePageHorizontalPadding,
  modulePageLayout,
  modulePageStackGap,
} from "./module-page-layout"

describe("module page layout", () => {
  it("widens gutters on modern phones and tablets", () => {
    assert.equal(modulePageHorizontalPadding(COMPACT_PHONE_MAX_WIDTH), 16)
    assert.equal(modulePageHorizontalPadding(390), 20)
    assert.equal(modulePageHorizontalPadding(430), 20)
    assert.equal(modulePageHorizontalPadding(TABLET_MIN_WIDTH), 24)
    assert.equal(modulePageHorizontalPadding(LARGE_TABLET_MIN_WIDTH), 32)
  })

  it("stacks stats on narrow canvases and places join actions side by side on wide phones", () => {
    const compact = modulePageLayout(KPI_GRID_SINGLE_COLUMN_MAX_WIDTH - 1, 720)
    assert.equal(compact.stackStats, true)
    assert.equal(compact.joinActionsHorizontal, false)
    assert.equal(modulePageCardPadding(360), 14)
    assert.equal(modulePageStackGap(390), 14)

    const pro = modulePageLayout(430, 932)
    assert.equal(pro.stackStats, false)
    assert.equal(pro.joinActionsHorizontal, true)
    assert.equal(pro.horizontalPadding, 20)
    assert.equal(pro.cardPadding, 18)
  })
})
