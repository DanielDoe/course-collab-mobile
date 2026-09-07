/**
 * Run: npx tsx --test src/lib/student-nav-course-switcher.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("student course switcher discoverability", () => {
  it("drawer header course chip opens the existing picker without a duplicate card", () => {
    const drawer = readFileSync(join(here, "../components/shell/StudentDrawer.tsx"), "utf8")
    assert.match(drawer, /openCoursePicker/)
    assert.match(drawer, /courseChip/)
    assert.doesNotMatch(drawer, /StudentNavCourseSwitcher/)
  })

  it("header course chip is always a switcher control", () => {
    const source = readFileSync(join(here, "../components/shell/StudentTopBar.tsx"), "utf8")
    assert.match(source, /HeaderCourseChip/)
    assert.match(source, /interactive/)
    assert.doesNotMatch(source, /enrolledCourses\.length/)
  })
})
