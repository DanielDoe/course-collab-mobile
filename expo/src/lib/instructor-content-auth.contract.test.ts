import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("instructor content client auth contract", () => {
  it("refuses faculty content fetches without session proof", () => {
    const source = readFileSync(join(here, "instructor-content-api.ts"), "utf8")
    assert.match(source, /headersHaveStudentSessionProof/)
    assert.match(source, /mfaTrustRequestHeadersForInstructor/)
  })
})
