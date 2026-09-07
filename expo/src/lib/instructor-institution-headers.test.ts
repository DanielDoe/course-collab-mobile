import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { instructorInstitutionHeaders } from "./instructor-institution-headers"

const here = dirname(fileURLToPath(import.meta.url))

describe("instructor institution headers", () => {
  it("sends the session institution id under both header names", () => {
    assert.deepEqual(instructorInstitutionHeaders(12), {
      "x-university-id": "12",
      "x-institution-id": "12",
    })
    assert.deepEqual(instructorInstitutionHeaders(null), {})
    assert.deepEqual(instructorInstitutionHeaders(0), {})
  })

  it("instructorAuthenticatedHeaders uses the faculty session institution id", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    const start = source.indexOf("export async function instructorAuthenticatedHeaders")
    assert.ok(start >= 0)
    const block = source.slice(start, start + 2200)
    assert.match(block, /instructorInstitutionHeaders/)
    assert.match(block, /universityId/)
    assert.match(block, /institutionId/)
    assert.doesNotMatch(block, /FacultyCourseContext/)
  })

  it("faculty scope threads institutionId from the session, not a second course context", () => {
    const source = readFileSync(join(here, "../hooks/useFacultyScope.ts"), "utf8")
    assert.match(source, /institutionId: facultySession\.universityId/)
    assert.match(source, /useFacultyShell/)
    assert.doesNotMatch(source, /FacultyCourseContext/)
  })

  it("useCurrentCourse is an alias of useFacultyScope", () => {
    const source = readFileSync(join(here, "../hooks/useCurrentCourse.ts"), "utf8")
    assert.match(source, /useFacultyScope as useCurrentCourse/)
    assert.doesNotMatch(source, /createContext/)
  })
})
