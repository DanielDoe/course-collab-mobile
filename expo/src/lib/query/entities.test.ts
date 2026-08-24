import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createTempId,
  createTempNumericId,
  isTempId,
  replaceTempWithAuthoritative,
  removeById,
  upsertById,
} from "./entities"

describe("optimistic entities", () => {
  it("marks temp ids", () => {
    assert.equal(isTempId(createTempId()), true)
    assert.equal(isTempId(createTempNumericId()), true)
    assert.equal(isTempId(8372), false)
  })

  it("replaces a temp record without duplicating the server entity", () => {
    const next = replaceTempWithAuthoritative(
      [{ id: -1, title: "Untitled" }, { id: 2, title: "Other" }],
      -1,
      { id: 8372, title: "Untitled" },
    )
    assert.deepEqual(next.map((row) => row.id), [8372, 2])
  })

  it("upserts and removes by id", () => {
    const upserted = upsertById([{ id: 1, title: "A" }], { id: 1, title: "B" })
    assert.equal(upserted[0]?.title, "B")
    assert.deepEqual(removeById(upserted, 1), [])
  })
})
