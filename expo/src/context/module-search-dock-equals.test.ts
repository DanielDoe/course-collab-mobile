import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  dockEntryEquals,
  patchDockEntryCallbacks,
  pickActiveDockEntry,
} from "./module-search-dock-equals"

describe("dockEntryEquals", () => {
  it("treats inline trailingAction onPress as equal when visuals match", () => {
    const a = {
      kind: "student" as const,
      props: {
        value: "",
        placeholder: "Search",
        onChange: () => {},
        onOpenFilter: () => {},
        trailingAction: { onPress: () => {}, accessibilityLabel: "New message", icon: "add" },
      },
    }
    const b = {
      kind: "student" as const,
      props: {
        value: "",
        placeholder: "Search",
        onChange: () => {},
        onOpenFilter: () => {},
        trailingAction: { onPress: () => {}, accessibilityLabel: "New message", icon: "add" },
      },
    }
    assert.equal(dockEntryEquals(a, b), true)
  })

  it("detects visual trailingAction changes", () => {
    const a = {
      kind: "student" as const,
      props: {
        value: "",
        placeholder: "Search",
        trailingAction: { accessibilityLabel: "New message", icon: "add" },
      },
    }
    const b = {
      kind: "student" as const,
      props: {
        value: "",
        placeholder: "Search",
        trailingAction: { accessibilityLabel: "New message", icon: "add", badgeCount: 2 },
      },
    }
    assert.equal(dockEntryEquals(a, b), false)
  })

  it("detects search text changes", () => {
    const a = { kind: "student" as const, props: { value: "mid", placeholder: "Search" } }
    const b = { kind: "student" as const, props: { value: "midterm", placeholder: "Search" } }
    assert.equal(dockEntryEquals(a, b), false)
  })

  it("patches onPress in place so the dock keeps the latest handler", () => {
    let used = "old"
    const stored = {
      kind: "student" as const,
      props: {
        trailingAction: { onPress: () => { used = "old" }, accessibilityLabel: "New" },
      },
    }
    const incoming = {
      kind: "student" as const,
      props: {
        trailingAction: { onPress: () => { used = "new" }, accessibilityLabel: "New" },
      },
    }
    assert.equal(dockEntryEquals(stored, incoming), true)
    patchDockEntryCallbacks(stored, incoming)
    stored.props.trailingAction?.onPress()
    assert.equal(used, "new")
  })

  it("treats persist rail handler identity as equal when visuals match", () => {
    const a = {
      kind: "faculty-toolbar" as const,
      props: {
        value: "",
        placeholder: "Search",
        persistRail: { statusLabel: "Unsaved", dirty: true, saving: false, onSaveDraft: () => {}, onPublish: () => {} },
      },
    }
    const b = {
      kind: "faculty-toolbar" as const,
      props: {
        value: "",
        placeholder: "Search",
        persistRail: { statusLabel: "Unsaved", dirty: true, saving: false, onSaveDraft: () => {}, onPublish: () => {} },
      },
    }
    assert.equal(dockEntryEquals(a, b), true)
    const published = {
      kind: "faculty-toolbar" as const,
      props: {
        value: "",
        placeholder: "Search",
        persistRail: { statusLabel: "Draft", dirty: false, saving: false, onSaveDraft: () => {}, onPublish: () => {} },
      },
    }
    assert.equal(dockEntryEquals(a, published), false)
  })
})

describe("pickActiveDockEntry", () => {
  it("ignores a kept-alive previous module's dock", () => {
    const entries = [
      { scope: "/module/projects", entry: { id: "projects" } },
      { scope: "/module/calendar", entry: { id: "calendar" } },
    ]
    assert.deepEqual(pickActiveDockEntry(entries, "/module/calendar"), { id: "calendar" })
    assert.equal(pickActiveDockEntry(entries, "/module/homework"), null)
  })

  it("shows the student dock when the shell cannot see [id]", () => {
    const entries = [{ scope: "/module/calendar:calendar", entry: { id: "calendar" } }]
    assert.deepEqual(pickActiveDockEntry(entries, "/module/calendar"), { id: "calendar" })
    assert.deepEqual(pickActiveDockEntry(entries, "/module/calendar:"), { id: "calendar" })
  })
})
