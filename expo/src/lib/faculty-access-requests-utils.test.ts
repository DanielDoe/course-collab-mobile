/**
 * Run: npx tsx --test src/lib/faculty-access-requests-utils.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  ACCESS_REQUESTS_PAGE_SIZE,
  accessRequestPageCount,
  accessRequestPageLabel,
  accountRequestSection,
  filterAccessRequestsBySection,
  mergeAccessRequestRows,
  recommendationGuestAsAccountRequest,
  sliceAccessRequestPage,
  summerCampRequestAsAccountRequest,
} from "./faculty-access-requests-utils"

describe("access request sections", () => {
  it("buckets guest / GUEST / purpose as career members", () => {
    assert.equal(accountRequestSection({ id: 1, full_name: "A", student_id: "g1", status: "pending", created_at: "", request_kind: "guest" }), "career_members")
    assert.equal(accountRequestSection({ id: 2, full_name: "B", student_id: "g2", status: "pending", created_at: "", section: "GUEST" }), "career_members")
    assert.equal(accountRequestSection({ id: 3, full_name: "C", student_id: "g3", status: "pending", created_at: "", guest_purpose: "recommendation_letter" }), "career_members")
  })

  it("buckets summer kinds and camp password resets", () => {
    assert.equal(accountRequestSection({ id: 4, full_name: "D", student_id: "s1", status: "pending", created_at: "", request_kind: "summer_camper" }), "summer_students")
    assert.equal(accountRequestSection({ id: 5, full_name: "E", student_id: "s2", status: "pending", created_at: "", request_kind: "camp_password_reset" }), "summer_students")
    assert.equal(accountRequestSection({ id: 6, full_name: "F", student_id: "s3", status: "pending", created_at: "", section: "SUMMER_CAMP" }), "summer_students")
  })

  it("keeps roster rows on students", () => {
    assert.equal(accountRequestSection({ id: 7, full_name: "G", student_id: "r1", status: "pending", created_at: "", request_kind: "roster", section: "P03" }), "students")
  })
})

describe("access request merge", () => {
  it("dedupes inbox sources and prefers the later payload", () => {
    const merged = mergeAccessRequestRows(
      [{ id: 9, full_name: "Pat", student_id: "p1", status: "pending", created_at: "2026-01-01", request_kind: "guest" }],
      [
        recommendationGuestAsAccountRequest({
          id: 9,
          full_name: "Pat Lee",
          student_id: "p1",
          section: "GUEST",
          email: "pat@pvamu.edu",
          status: "pending",
          guest_purpose: "recommendation_letter",
          organization: "PVAMU",
        }),
      ],
      [
        summerCampRequestAsAccountRequest({
          id: 11,
          full_name: "Cam",
          student_id: "c1",
          status: "pending",
          created_at: "2026-02-01",
          request_kind: "summer_student",
          school_affiliation: "PVAMU STEM",
        }),
      ],
    )
    assert.equal(merged.length, 2)
    const career = merged.find((row) => row.id === 9)
    assert.equal(career?.full_name, "Pat Lee")
    assert.equal(career?.organization, "PVAMU")
    assert.equal(accountRequestSection(career!), "career_members")
    assert.equal(filterAccessRequestsBySection(merged, "summer_students").length, 1)
  })

  it("pages each tab", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      full_name: `Person ${i}`,
      student_id: `id${i}`,
      status: "pending",
      created_at: "",
    }))
    assert.equal(ACCESS_REQUESTS_PAGE_SIZE, 8)
    assert.equal(accessRequestPageCount(rows.length), 2)
    assert.equal(sliceAccessRequestPage(rows, 0).length, 8)
    assert.equal(accessRequestPageLabel("requests", 10, 0), "Showing 1–8 of 10")
  })
})
