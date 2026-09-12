import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  looksLikePastedAnswer,
  parseAssessmentAntiCheatConfig,
  recordTextChange,
} from "./assessment-anti-cheat"

describe("assessment anti-cheat", () => {
  it("parses quiz antiCheatConfig", () => {
    const config = parseAssessmentAntiCheatConfig({
      antiCheatConfig: {
        block_copy_paste: true,
        keystroke_playback_enforced: true,
        max_tab_switches: 5,
      },
    })
    assert.equal(config.blockCopyPaste, true)
    assert.equal(config.keystrokePlaybackEnforced, true)
    assert.equal(config.maxTabSwitches, 5)
  })

  it("flags a single large insert as paste", () => {
    const startedAt = Date.now() - 20
    const event = recordTextChange("", "Thevenin equivalent resistance", startedAt)
    assert.equal(looksLikePastedAnswer([event], "Thevenin equivalent resistance"), true)
  })

  it("accepts typed character-by-character answers", () => {
    const startedAt = Date.now() - 200
    const events = ["r", "rm", "rms"].map((next, index, all) =>
      recordTextChange(index === 0 ? "" : all[index - 1], next, startedAt),
    )
    assert.equal(looksLikePastedAnswer(events, "rms"), false)
  })
})
