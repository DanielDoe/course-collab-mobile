import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { CODEBENCH_ANALYTICS_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("analytics-more client auth contract", () => {
  it("sends session proof on CodeBench analytics requests", () => {
    const source = readFileSync(join(here, "codebench-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest|studentAuthenticatedHeaders/)
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
    for (const path of CODEBENCH_ANALYTICS_API_PATHS) {
      assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
  })

  it("does not inflate XP from local SecureStore", () => {
    const source = readFileSync(join(here, "codebench-progress.ts"), "utf8")
    assert.doesNotMatch(source, /Math\.max\(apiXp,\s*localXp\)/)
    assert.match(source, /failed\.push\("daily challenge"\)/)
    assert.match(source, /failed\.push\("analysis"\)/)
    assert.match(source, /codebench-progress-logic/)
    const logic = readFileSync(join(here, "codebench-progress-logic.ts"), "utf8")
    assert.match(logic, /raw\.code \?\? raw\.solution/)
  })
})
