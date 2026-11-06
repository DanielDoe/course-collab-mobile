import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  buildSyllabusSavePayload,
  persistedSyllabusId,
  shouldShowSyllabusPersistRail,
  syllabusEditorFingerprint,
  syllabusRemoteBody,
} from "./faculty-syllabus-save"

const here = dirname(fileURLToPath(import.meta.url))
import type { InstructorSyllabus } from "./instructor-api"

const syllabus: InstructorSyllabus = {
  id: 9,
  courseId: 6,
  title: "ELEG 1301",
  term: "Fall 2026",
  status: "draft",
  contentMode: "structured",
  sections: [],
}

describe("syllabus save payload", () => {
  it("includes persisted id and courseId", () => {
    const built = buildSyllabusSavePayload({
      courseId: 6,
      syllabus,
      sections: [],
      action: "publish",
    })
    assert.equal(built.ok, true)
    if (built.ok) {
      assert.equal(built.payload.id, 9)
      assert.equal(built.payload.courseId, 6)
      assert.equal(built.payload.action, "publish")
      assert.equal(built.payload.contentMode, "structured")
    }
  })

  it("rejects a missing course", () => {
    const built = buildSyllabusSavePayload({
      courseId: null,
      syllabus: { ...syllabus, courseId: undefined },
      sections: [],
      action: "publish",
    })
    assert.equal(built.ok, false)
  })

  it("treats id 0 as not yet persisted", () => {
    assert.equal(persistedSyllabusId({ id: 0 }), null)
    assert.equal(persistedSyllabusId({ id: 4 }), 4)
  })

  it("keeps courseId off the remote body so the API cannot read course.id from a number", () => {
    const built = buildSyllabusSavePayload({
      courseId: 6,
      syllabus,
      sections: [],
      action: "publish",
    })
    assert.equal(built.ok, true)
    if (built.ok) {
      const body = syllabusRemoteBody(built.payload)
      assert.equal(body.id, 9)
      assert.equal(body.action, "publish")
      assert.equal("courseId" in body, false)
      assert.equal("course" in body, false)
    }
  })

  it("fingerprints section edits and hides persist after a clean publish", () => {
    assert.equal(syllabusEditorFingerprint(syllabus), syllabusEditorFingerprint({ ...syllabus }))
    assert.notEqual(
      syllabusEditorFingerprint(syllabus),
      syllabusEditorFingerprint({
        ...syllabus,
        sections: [
          {
            sectionId: "custom-1",
            title: "Lab",
            order: 1,
            type: "text",
            content: { markdown: "" },
            isRequired: false,
            isVisible: true,
            isEditable: true,
          },
        ],
      }),
    )
    assert.equal(shouldShowSyllabusPersistRail({ canEdit: true, status: "draft", dirty: false }), true)
    assert.equal(shouldShowSyllabusPersistRail({ canEdit: true, status: "published", dirty: false }), false)
    assert.equal(shouldShowSyllabusPersistRail({ canEdit: true, status: "published", dirty: true }), true)
    assert.equal(shouldShowSyllabusPersistRail({ canEdit: false, status: "draft", dirty: true }), false)
  })

  it("saveSyllabus PUTs the compact remote body", () => {
    const source = readFileSync(join(here, "instructor-api.ts"), "utf8")
    const start = source.indexOf("saveSyllabus:")
    assert.ok(start >= 0)
    const block = source.slice(start, start + 700)
    assert.match(block, /syllabusRemoteBody/)
    assert.doesNotMatch(block, /courseId: payload\.courseId \?\? scope\.courseId,/)
  })
})
