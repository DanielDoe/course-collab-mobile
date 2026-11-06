/**
 * Run: npx tsx --test src/lib/module-list-pager.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveModuleListPageSize } from "./module-list-pager"

describe("resolveModuleListPageSize", () => {
  it("returns more rows on taller phones", () => {
    const compact = resolveModuleListPageSize({
      windowHeight: 667,
      topInset: 115,
      bottomInset: 90,
      preset: "standard",
    })
    const tall = resolveModuleListPageSize({
      windowHeight: 956,
      topInset: 115,
      bottomInset: 90,
      preset: "standard",
    })

    assert.ok(tall > compact)
    assert.ok(compact >= 4)
    assert.ok(tall <= 12)
  })

  it("uses compact preset for shorter rows", () => {
    const compactPreset = resolveModuleListPageSize({
      windowHeight: 852,
      topInset: 115,
      bottomInset: 90,
      preset: "compact",
    })
    const standard = resolveModuleListPageSize({
      windowHeight: 852,
      topInset: 115,
      bottomInset: 90,
      preset: "standard",
    })

    assert.ok(compactPreset >= standard)
  })

  it("reserves extra space for dual pagers", () => {
    const single = resolveModuleListPageSize({
      windowHeight: 852,
      topInset: 115,
      bottomInset: 90,
      preset: "standard",
      pagerHeight: 40,
    })
    const dual = resolveModuleListPageSize({
      windowHeight: 852,
      topInset: 115,
      bottomInset: 90,
      preset: "standard",
      pagerHeight: 88,
    })

    assert.ok(single > dual)
  })

  it("lecture preset caps at seven rows so courses still paginate", () => {
    const size = resolveModuleListPageSize({
      windowHeight: 1400,
      topInset: 80,
      bottomInset: 80,
      preset: "lecture",
    })
    assert.equal(size, 7)
    assert.ok(Math.ceil(10 / size) >= 2)
  })

  it("clamps to preset min and max", () => {
    assert.equal(
      resolveModuleListPageSize({
        windowHeight: 320,
        topInset: 200,
        bottomInset: 200,
        preset: "standard",
      }),
      4,
    )

    assert.equal(
      resolveModuleListPageSize({
        windowHeight: 1400,
        topInset: 80,
        bottomInset: 80,
        preset: "standard",
        viewportBuffer: 4,
      }),
      12,
    )
  })
})
