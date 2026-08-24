import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  filterGroupsProjectsForOwnSession,
  isOwnGroupsProjectsSession,
} from "./groups-projects-session-policy"

describe("groups/projects session policy", () => {
  it("recognizes Fall 2026 ELEG section codes", () => {
    assert.equal(isOwnGroupsProjectsSession("ELEG1301P01"), true)
    assert.equal(isOwnGroupsProjectsSession("ELEG1301P02"), true)
    assert.equal(isOwnGroupsProjectsSession("ELEG1304P03"), true)
    assert.equal(isOwnGroupsProjectsSession("ECE2202"), false)
  })

  it("strips groups and projects for own-session destinations", () => {
    const modules = ["syllabus", "groups", "projects", "quizzes"] as const
    const filtered = filterGroupsProjectsForOwnSession([...modules], "ELEG1301P02")
    assert.deepEqual(filtered.modules, ["syllabus", "quizzes"])
    assert.equal(filtered.skippedGroupsProjects, true)
  })
})
