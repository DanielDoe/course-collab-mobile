import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  composeProjectTargetPlatform,
  splitProjectTargetPlatform,
} from "./project-target-platforms"

describe("project target platforms", () => {
  it("keeps preset labels as stored values", () => {
    assert.deepEqual(splitProjectTargetPlatform("Mobile app"), { preset: "Mobile app", custom: "" })
    assert.equal(composeProjectTargetPlatform("Game", ""), "Game")
  })

  it("maps unknown values to Other so edits stay intact", () => {
    assert.deepEqual(splitProjectTargetPlatform("Arduino robot"), {
      preset: "Other",
      custom: "Arduino robot",
    })
    assert.equal(composeProjectTargetPlatform("Other", "Arduino robot"), "Arduino robot")
  })
})
