import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("student notetaker client auth contract", () => {
  it("uses session-proof headers and credentials on API calls", () => {
    const source = readFileSync(join(here, "notetaker-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedHeaders/)
    assert.match(source, /credentials:\s*"include"/)
    assert.match(source, /assertProductionHttpsUrl/)
    assert.match(source, /createApiAbortSignal/)
    assert.match(source, /NOTETAKER_AUDIO_TIMEOUT_MS/)
    assert.match(source, /live-caption-chat/)
    assert.doesNotMatch(source, /"x-student-database-id":\s*session\.databaseId/)
  })

  it("builds authenticated audio playback source with headers", () => {
    const source = readFileSync(join(here, "notetaker-api.ts"), "utf8")
    assert.match(source, /buildNotetakerAuthenticatedAudioSource/)
    const detail = readFileSync(
      join(here, "../components/notetaker/NotetakerNoteDetailScreen.tsx"),
      "utf8",
    )
    assert.match(detail, /buildNotetakerAuthenticatedAudioSource/)
  })
})
