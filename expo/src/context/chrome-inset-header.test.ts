/**
 * Run: npx tsx --test src/context/chrome-inset-header.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { moduleHeaderContentTop } from "../lib/chrome-inset-layout"

const here = dirname(fileURLToPath(import.meta.url))

describe("moduleHeaderContentTop", () => {
  it("matches list, tab, and dashboard clearance under floating chrome", () => {
    assert.equal(moduleHeaderContentTop(100), 112)
    assert.equal(moduleHeaderContentTop(0), 12)
  })
})

describe("module header inset is shared", () => {
  it("tabbed, faculty sticky, messages, and dashboards use the shared helper", () => {
    const tabbed = readFileSync(join(here, "../components/theme/TabbedModuleLayout.tsx"), "utf8")
    const faculty = readFileSync(join(here, "../components/faculty/faculty-module-shell.tsx"), "utf8")
    const messages = readFileSync(join(here, "../components/messages/MessagesInboxScreen.tsx"), "utf8")
    const dashboard = readFileSync(join(here, "../../app/(app)/dashboard.tsx"), "utf8")
    assert.match(tabbed, /useModuleHeaderContentTop/)
    assert.doesNotMatch(tabbed, /chromeTop \+ 4/)
    assert.match(faculty, /useModuleHeaderContentTop/)
    assert.doesNotMatch(faculty, /stickyTopGap/)
    assert.match(messages, /useModuleHeaderContentTop/)
    assert.match(dashboard, /useModuleHeaderContentTop/)
  })
})
