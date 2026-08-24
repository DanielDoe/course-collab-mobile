import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  FALL_2026_ELEG_SESSION_CODES,
  isFall2026ElegOffering,
  isFall2026ElegSession,
} from "./fall-2026-eleg-sessions"

describe("Fall 2026 ELEG sessions", () => {
  it("covers P01, P02, and P03", () => {
    assert.deepEqual([...FALL_2026_ELEG_SESSION_CODES], ["ELEG1301P01", "ELEG1301P02", "ELEG1304P03"])
    assert.equal(isFall2026ElegSession("eleg1301p02"), true)
    assert.equal(isFall2026ElegSession("ELEG1304P03"), true)
    assert.equal(isFall2026ElegSession("ELEG1304P01"), false)
  })

  it("treats ALL as Fall 2026 only when every course session is one of those sections", () => {
    assert.equal(isFall2026ElegOffering("ALL", ["ELEG1301P01", "ELEG1301P02"]), true)
    assert.equal(isFall2026ElegOffering("ALL", ["ELEG1301P01", "ECE2202"]), false)
    assert.equal(isFall2026ElegOffering("ELEG1301P02", ["ECE2202"]), true)
  })
})
