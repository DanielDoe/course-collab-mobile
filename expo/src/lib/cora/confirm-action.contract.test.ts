import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { CORA_STUDENT_CONFIRM_API_PATH } from "../student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("student Cora confirm client auth contract", () => {
  it("sends confirm through studentAuthenticatedRequest, not header-only x-student-id", () => {
    const source = readFileSync(join(here, "confirm-action.ts"), "utf8")
    const fnStart = source.indexOf("export async function confirmStudentCoraAction")
    assert.notEqual(fnStart, -1)
    const nextExport = source.indexOf("\nexport async function", fnStart + 1)
    const fn = source.slice(fnStart, nextExport === -1 ? undefined : nextExport)

    assert.match(fn, /studentAuthenticatedRequest/)
    assert.match(fn, new RegExp(CORA_STUDENT_CONFIRM_API_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.doesNotMatch(fn, /headers:\s*\{/)
    assert.doesNotMatch(fn, /["']x-student-id["']\s*:/)
  })
})
