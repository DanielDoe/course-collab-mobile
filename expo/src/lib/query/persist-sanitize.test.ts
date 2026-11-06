import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { sanitizePersistedQueryData } from "./persist-sanitize"

describe("persist sanitize", () => {
  it("strips note bodies and ink before persist", () => {
    const sanitized = sanitizePersistedQueryData(["student", "notes", "u1", "10", "A", "mine"], {
      notes: [{ id: 1, title: "Week 1", bodyText: "secret", inkWorkspace: { pages: [] } }],
    }) as { notes: Array<{ id: number; title: string; bodyText?: string }> }
    assert.equal(sanitized.notes[0].title, "Week 1")
    assert.equal(sanitized.notes[0].bodyText, undefined)
    assert.equal("inkWorkspace" in sanitized.notes[0], false)
  })

  it("strips lecture workspace payloads", () => {
    const sanitized = sanitizePersistedQueryData(["student", "lectures", "u1", "10", "A", "list"], {
      lectures: [{ id: 2, title: "Nodal", lecture_workspace: { q: 1 }, sample_practice: { enabled: true } }],
    }) as { lectures: Array<{ title: string; lecture_workspace?: unknown }> }
    assert.equal(sanitized.lectures[0].title, "Nodal")
    assert.equal("lecture_workspace" in sanitized.lectures[0], false)
    assert.equal("sample_practice" in sanitized.lectures[0], false)
  })

  it("leaves announcements intact", () => {
    const data = { announcements: [{ id: 3, title: "Late", content: "5 min" }] }
    assert.deepEqual(
      sanitizePersistedQueryData(["student", "announcements", "u1", "10", "A", "list"], data),
      data,
    )
  })
})
