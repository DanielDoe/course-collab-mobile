import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildGradeCategories } from "./grades-api"

describe("buildGradeCategories weights", () => {
  it("uses 0 when the API omits weights instead of inventing defaults", () => {
    const categories = buildGradeCategories({})
    assert.ok(categories.length > 0)
    for (const category of categories) {
      assert.equal(category.weight, 0)
    }
    const quiz = categories.find((row) => row.key === "quiz")
    assert.equal(quiz?.weight, 0)
    assert.notEqual(quiz?.weight, 10)
  })

  it("keeps only weights the API provided", () => {
    const categories = buildGradeCategories({
      weights: { quiz_weight: 15, homework_weight: 20 },
    })
    assert.equal(categories.find((row) => row.key === "quiz")?.weight, 15)
    assert.equal(categories.find((row) => row.key === "homework")?.weight, 20)
    assert.equal(categories.find((row) => row.key === "final")?.weight, 0)
  })
})
