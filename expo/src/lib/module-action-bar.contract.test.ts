/**
 * Run: npx tsx --test src/lib/module-action-bar.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("module action bar", () => {
  it("documents the dock as an intentional CourseCollab pattern", () => {
    const source = readFileSync(join(here, "../context/ModuleSearchDockProvider.tsx"), "utf8")
    assert.match(source, /intentional CourseCollab navigation pattern/)
  })

  it("admin list screens can un-suppress the shared dock", () => {
    const admin = readFileSync(join(here, "../components/faculty/faculty-admin-ui.tsx"), "utf8")
    const tas = readFileSync(
      join(here, "../components/faculty/admin/FacultyTeachingAssistantsScreen.tsx"),
      "utf8",
    )
    assert.match(admin, /suppressSearchDock/)
    assert.match(tas, /suppressSearchDock=\{false\}/)
  })

  it("faculty syllabus persist lives in the shared search dock", () => {
    const screen = readFileSync(
      join(here, "../components/faculty/FacultySyllabusScreen.tsx"),
      "utf8",
    )
    assert.match(screen, /persistRail/)
    assert.doesNotMatch(screen, /styles\.footerBar/)
    assert.match(screen, /shouldShowSyllabusPersistRail/)
  })

  it("student calendar + opens a contextual action sheet", () => {
    const source = readFileSync(join(here, "../components/course-info/CalendarScreen.tsx"), "utf8")
    assert.match(source, /ModuleAddActionSheet/)
    assert.match(source, /Add personal event/)
    assert.match(source, /Request office hours/)
    assert.match(source, /Submit project/)
  })
})
