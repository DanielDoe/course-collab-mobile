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
import {
  authFlowCenterSlack,
  authFlowContentGap,
  authFlowIsTallPhone,
  authFlowOnboardingContentMaxWidth,
  authFlowOnboardingHorizontalPadding,
  authFlowShouldCenterVertically,
  authFlowTypeScale,
} from "./auth-flow-layout"

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

describe("auth flow layout", () => {
  it("treats Pro Max height as a tall phone and 17 Pro as standard", () => {
    assert.equal(authFlowIsTallPhone(402, 874), false)
    assert.equal(authFlowIsTallPhone(440, 956), true)
    assert.equal(authFlowIsTallPhone(1024, 1366), false)
  })

  it("scales type and gaps up on Pro Max without changing 17 Pro", () => {
    assert.equal(authFlowTypeScale(402, 874), 1)
    assert.equal(authFlowTypeScale(440, 956), 1.04)
    assert.equal(authFlowContentGap(402, 874), 16)
    assert.equal(authFlowContentGap(440, 956), 20)
  })

  it("centers when the viewport is taller than the auth stack", () => {
    assert.equal(authFlowShouldCenterVertically(874, false, false), true)
    assert.equal(authFlowShouldCenterVertically(956, false, false), true)
    assert.equal(
      authFlowCenterSlack({
        viewportH: 956,
        contentH: 620,
        padTop: 91,
        padBottom: 66,
        shouldCenter: true,
      }),
      90,
    )
    assert.equal(
      authFlowCenterSlack({
        viewportH: 874,
        contentH: 620,
        padTop: 91,
        padBottom: 66,
        shouldCenter: true,
      }),
      49,
    )
  })

  it("does not add slack when the keyboard is up or content overflows", () => {
    assert.equal(authFlowShouldCenterVertically(956, true, false), false)
    assert.equal(
      authFlowCenterSlack({
        viewportH: 956,
        contentH: 620,
        padTop: 91,
        padBottom: 66,
        shouldCenter: false,
      }),
      0,
    )
    assert.equal(
      authFlowCenterSlack({
        viewportH: 700,
        contentH: 640,
        padTop: 40,
        padBottom: 40,
        shouldCenter: true,
      }),
      0,
    )
  })

  it("uses wider onboarding gutters on phones than login forms", () => {
    assert.equal(authFlowOnboardingHorizontalPadding(390), 14)
    assert.equal(authFlowOnboardingHorizontalPadding(COMPACT_PHONE_MAX_WIDTH), 12)
    assert.equal(authFlowOnboardingContentMaxWidth(390), 366)
  })
})
