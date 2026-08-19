/**
 * Run: npx tsx --test expo/src/lib/faculty-ai-assistant-settings.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  aiAssistantSettingsMatchQuery,
  clampAiAssistantWordLimit,
} from "./faculty-ai-assistant-settings"

describe("clampAiAssistantWordLimit", () => {
  it("snaps to the web 100–1000 word slider", () => {
    assert.equal(clampAiAssistantWordLimit(80), 100)
    assert.equal(clampAiAssistantWordLimit(524), 500)
    assert.equal(clampAiAssistantWordLimit(1200), 1000)
  })
})

describe("aiAssistantSettingsMatchQuery", () => {
  it("matches routing copy the way the web filter does", () => {
    assert.equal(aiAssistantSettingsMatchQuery("reason", ["Allow Advanced Reasoning", "STEM"]), true)
    assert.equal(aiAssistantSettingsMatchQuery("calendar", ["Code Help"]), false)
  })
})
