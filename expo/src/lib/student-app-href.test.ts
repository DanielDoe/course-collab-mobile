import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { studentAppHref } from "./student-app-href"

describe("studentAppHref", () => {
  it("maps module slugs onto the dynamic module route", () => {
    assert.deepEqual(studentAppHref("/module/attendance"), {
      pathname: "/(app)/module/[id]",
      params: { id: "attendance" },
    })
  })

  it("keeps focus params on grades", () => {
    assert.deepEqual(studentAppHref("/module/grades?focus=engagement"), {
      pathname: "/(app)/module/[id]",
      params: { id: "grades", focus: "engagement" },
    })
  })

  it("leaves non-module routes alone", () => {
    assert.deepEqual(studentAppHref("/announcements"), { pathname: "/announcements" })
  })
})
