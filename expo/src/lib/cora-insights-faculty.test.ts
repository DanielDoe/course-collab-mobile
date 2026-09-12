import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  bucketHourHeat,
  buildCoraInsightsQuery,
  formatCoraInsightsDelta,
  formatCoraInsightsKpiValue,
  initialsFromName,
  interventionItems,
  mapCoraInsightsHref,
  unwrapCoraInsights,
  coraInsightsKpiPage,
  studentsNeedingAttention,
  studentsUsingCora,
} from "./cora-insights-faculty"

describe("buildCoraInsightsQuery", () => {
  it("sends tab and range and omits all-value filters", () => {
    assert.equal(
      buildCoraInsightsQuery("overview", {
        range: "7d",
        assessmentId: "all",
        topic: "all",
        studentId: "all",
      }),
      "/api/instructor/cora-insights?tab=overview&range=7d",
    )
  })

  it("includes scoped filters used by the web dashboard", () => {
    assert.equal(
      buildCoraInsightsQuery("gaps", {
        range: "30d",
        assessmentId: "531",
        topic: "Debugging",
        studentId: "12",
        concept: "Variables",
      }),
      "/api/instructor/cora-insights?tab=gaps&range=30d&assessmentId=531&topic=Debugging&studentId=12&concept=Variables",
    )
  })
})

describe("unwrapCoraInsights", () => {
  it("returns data when ok", () => {
    assert.deepEqual(unwrapCoraInsights({ ok: true, data: { sessions: 47 } }), { sessions: 47 })
  })

  it("throws the backend error", () => {
    assert.throws(() => unwrapCoraInsights({ ok: false, error: "Failed" }), /Failed/)
  })
})

describe("kpi formatters", () => {
  it("shows an em dash for missing values", () => {
    assert.equal(formatCoraInsightsKpiValue(null), "—")
  })

  it("formats percent change like the web cards", () => {
    assert.equal(formatCoraInsightsDelta(370, "Last 7 days vs previous"), "↑ 370% · Last 7 days vs previous")
    assert.equal(formatCoraInsightsDelta(-12, "Used Cora in this window"), "↓ 12% · Used Cora in this window")
  })
})

describe("mapCoraInsightsHref", () => {
  it("maps faculty portal links onto mobile modules", () => {
    assert.equal(
      mapCoraInsightsHref("/faculty/dashboard/content/practice?concept=Variables"),
      "/module/practice",
    )
    assert.equal(mapCoraInsightsHref("/faculty/dashboard/management/students/18"), "/module/students")
  })
})

describe("interventionItems", () => {
  it("accepts the raw actions array the interventions tab returns", () => {
    assert.equal(interventionItems([{ title: "Review Variables" }]).length, 1)
  })
})

describe("bucketHourHeat", () => {
  it("rolls hours into 4-hour buckets and finds the peak", () => {
    const { grid, peak } = bucketHourHeat([
      { dow: 2, hour: 13, count: 20 },
      { dow: 2, hour: 14, count: 7 },
      { dow: 3, hour: 16, count: 16 },
    ])
    assert.equal(grid[2][3], 27)
    assert.equal(peak.count, 27)
    assert.equal(peak.dayLabel, "Tue")
    assert.equal(peak.bucketLabel, "12–4p")
  })
})

describe("coraInsightsKpiPage", () => {
  it("maps each overview KPI to a nested page", () => {
    assert.equal(coraInsightsKpiPage("cora_sessions")?.title, "Cora Sessions")
    assert.deepEqual([...coraInsightsKpiPage("cora_sessions")!.sources], ["needs", "live"])
    assert.equal(coraInsightsKpiPage("active_students")?.title, "Active Students")
    assert.equal(coraInsightsKpiPage("unknown"), null)
  })
})

describe("student KPI lists", () => {
  const rows = [
    { id: 1, name: "Daniel Doe", coraSessions: 22, risk: "watch" },
    { id: 2, name: "Idle Student", coraSessions: 0, risk: "low" },
    { id: 3, name: "At Risk", coraSessions: 4, risk: "high" },
  ]

  it("ranks students who used Cora", () => {
    assert.deepEqual(
      studentsUsingCora(rows).map((row) => row.name),
      ["Daniel Doe", "At Risk"],
    )
  })

  it("keeps only multi-signal attention rows", () => {
    assert.deepEqual(
      studentsNeedingAttention(rows).map((row) => row.name),
      ["At Risk"],
    )
  })
})

describe("initialsFromName", () => {
  it("uses the first two name parts", () => {
    assert.equal(initialsFromName("Daniel Doe"), "DD")
    assert.equal(initialsFromName("Grayson Young"), "GY")
  })
})
