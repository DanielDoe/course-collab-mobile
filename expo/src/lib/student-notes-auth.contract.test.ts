import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { NOTES_STUDENT_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("student notes client auth contract", () => {
  it("builds digital-notes through session-proof helpers", () => {
    const source = readFileSync(join(here, "digital-notes-api.ts"), "utf8")
    assert.match(
      source,
      /studentAuthenticatedHeaders|studentAuthenticatedRequest|headersHaveStudentSessionProof/,
    )
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
    for (const path of NOTES_STUDENT_API_PATHS) {
      assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
  })

  it("sends session proof on note image upload", () => {
    const source = readFileSync(join(here, "note-image-insert.ts"), "utf8")
    assert.match(source, /studentAuthenticatedHeaders|headersHaveStudentSessionProof/)
    const uploadFn = source.slice(source.indexOf("export async function uploadNoteImage"))
    assert.match(uploadFn, /studentAuthenticatedHeaders|headersHaveStudentSessionProof/)
    assert.doesNotMatch(uploadFn, /"x-student-id":\s*session\.databaseId/)
  })
})
