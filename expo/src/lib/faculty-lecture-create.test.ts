import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { lectureCreateRequestBody, validateLectureCreateFields } from "./faculty-lecture-create"

const here = dirname(fileURLToPath(import.meta.url))

describe("lecture create validation", () => {
  it("requires a selected course", () => {
    const result = validateLectureCreateFields({ title: "Week 1", week: "1" }, null)
    assert.equal(result.ok, false)
  })

  it("requires title and a valid week", () => {
    assert.equal(validateLectureCreateFields({ title: "  ", week: "1" }, 6).ok, false)
    assert.equal(validateLectureCreateFields({ title: "Week 1", week: "x" }, 6).ok, false)
  })

  it("builds a persistable payload", () => {
    const result = validateLectureCreateFields(
      { title: " Intro ", week: "2", description: "Ohm", objectives: ["Read ch 1", ""], is_published: true },
      6,
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.payload, {
        title: "Intro",
        week: 2,
        description: "Ohm",
        objectives: ["Read ch 1"],
        is_published: true,
      })
      assert.deepEqual(lectureCreateRequestBody(result.payload), {
        title: "Intro",
        week: 2,
        is_published: true,
        description: "Ohm",
        objectives: ["Read ch 1"],
      })
    }
  })

  it("omits empty objectives and never puts courseId on the body", () => {
    const result = validateLectureCreateFields({ title: "Week 1", week: "1" }, 6)
    assert.equal(result.ok, true)
    if (result.ok) {
      const body = lectureCreateRequestBody(result.payload)
      assert.equal("objectives" in body, false)
      assert.equal("courseId" in body, false)
    }
  })

  it("createLecture sends the compact body and keeps course on headers", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    const start = source.indexOf("createLecture:")
    assert.ok(start >= 0)
    const block = source.slice(start, start + 900)
    assert.match(block, /lectureCreateRequestBody/)
    assert.doesNotMatch(block, /courseId: scope\.courseId/)
  })

  it("deleteLecture uses the lecture id path", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    const start = source.indexOf("deleteLecture:")
    assert.ok(start >= 0)
    const block = source.slice(start, start + 280)
    assert.match(block, /\/api\/instructor\/lectures\/\$\{lectureId\}/)
    assert.doesNotMatch(block, /lectures\?id=/)
  })
})
