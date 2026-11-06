/**
 * Run: npx tsx --test expo/src/lib/faculty-summer-camp-utils.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  campDatePayload,
  campDatePickerYears,
  campDateRangeError,
  composeCampIsoDate,
  daysInCalendarMonth,
  normalizeCampIsoDate,
  splitCampIsoDate,
} from "./faculty-summer-camp-utils"

describe("normalizeCampIsoDate", () => {
  it("keeps a valid calendar day", () => {
    assert.equal(normalizeCampIsoDate("2026-06-15"), "2026-06-15")
  })

  it("strips a datetime suffix", () => {
    assert.equal(normalizeCampIsoDate("2026-06-15T00:00:00.000Z"), "2026-06-15")
  })

  it("rejects free-text and impossible days", () => {
    assert.equal(normalizeCampIsoDate("06/15/2026"), "")
    assert.equal(normalizeCampIsoDate("2026-02-31"), "")
    assert.equal(normalizeCampIsoDate(null), "")
  })
})

describe("campDateRangeError", () => {
  it("allows empty dates", () => {
    assert.equal(campDateRangeError("", ""), null)
  })

  it("rejects an inverted range", () => {
    assert.match(campDateRangeError("2026-08-01", "2026-06-01") ?? "", /on or after/)
  })

  it("rejects a non-ISO start date", () => {
    assert.match(campDateRangeError("June 1", "") ?? "", /Start date/)
  })
})

describe("campDatePayload", () => {
  it("omits empty dates", () => {
    assert.deepEqual(campDatePayload("", ""), {})
  })

  it("includes a valid range", () => {
    assert.deepEqual(campDatePayload("2026-06-01", "2026-07-31"), {
      start_date: "2026-06-01",
      end_date: "2026-07-31",
    })
  })

  it("throws on an inverted range", () => {
    assert.throws(() => campDatePayload("2026-08-01", "2026-06-01"), /on or after/)
  })
})

describe("composeCampIsoDate / splitCampIsoDate", () => {
  it("round-trips a complete picker selection", () => {
    const iso = composeCampIsoDate("2026", "6", "1")
    assert.equal(iso, "2026-06-01")
    assert.deepEqual(splitCampIsoDate(iso), { year: "2026", month: "06", day: "01" })
  })

  it("returns empty until year, month, and day are set", () => {
    assert.equal(composeCampIsoDate("2026", "06", ""), "")
  })
})

describe("daysInCalendarMonth", () => {
  it("handles February in a leap year", () => {
    assert.equal(daysInCalendarMonth(2024, 2), 29)
    assert.equal(daysInCalendarMonth(2025, 2), 28)
  })
})

describe("campDatePickerYears", () => {
  it("spans two years before through six after the current year", () => {
    const years = campDatePickerYears(new Date(2026, 5, 1))
    assert.equal(years[0], "2024")
    assert.equal(years[years.length - 1], "2032")
  })

  it("can start at the current year for upcoming deadlines", () => {
    const years = campDatePickerYears(new Date(2026, 5, 1), { pastYears: 0 })
    assert.equal(years[0], "2026")
    assert.equal(years.includes("2024"), false)
    assert.equal(years[years.length - 1], "2032")
  })
})
