/**
 * Run: npx tsx --test src/components/faculty/faculty-summer-camp-date-picker.contract.test.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

describe("FacultySummerCampDatePicker", () => {
  it("is a calendar sheet, not year/month/day NativeSelects", () => {
    const source = readFileSync(join(here, "FacultySummerCampDatePicker.tsx"), "utf8")
    assert.doesNotMatch(source, /NativeSelect/)
    assert.match(source, /buildMonthGrid/)
    assert.match(source, /calendar-outline/)
  })
})
