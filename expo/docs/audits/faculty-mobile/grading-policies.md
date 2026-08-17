# Grading Policies — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T21:30:00.000Z  
**Audit mode:** Production Readiness (remediation)  
**Scope:** Grading automation + grade weights + student grade calculation downstream

---

## Module identification

```
MODULE: Grading Policies
MOBILE ROUTE: /module/grading-policies
REGISTRY ENTRY: grading-policies → FacultyGradingPoliciesScreen
NAVIGATION GROUP: Administration
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyGradingPoliciesScreen.tsx
RELATED API ROUTES:
  - GET/PATCH /api/instructor/courses/grading-policy (scoped ✅)
  - GET /api/grades/weights (requireInstructorCourse + course-scoped row)
  - POST /api/grades/adjust-weight (requireInstructorCourse + 100% total)
RELATED CORA TOOLS: gradingPolicy.analyze, gradingPolicy.update
RELATED WEB MODULE: administration/grading-policies
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP (local; live 401 after v0 deploy)

**Score:** 84/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |

Native three-tab screen (Automation, Deadlines & Uploads, Weights). Grade weight GET/POST now require `requireInstructorCourse`. Writes store `course:{id}` session keys so students resolve course-scoped weights before the legacy ALL fallback. Save is rejected unless weights total 100%.

---

## 28. Findings

| ID | Severity | Finding | Evidence | Recommended Fix |
|----|----------|---------|----------|-----------------|
| F-001 | **CRITICAL** | **Fixed** — GET/POST require `requireInstructorCourse` | weights/route.ts, adjust-weight/route.ts | — |
| F-002 | **CRITICAL** | **Fixed** — instructor writes `course:{id}`; `getGradeWeights` prefers course row | lib/grades.ts | — |
| F-003 | MEDIUM | **Fixed** — meta now describes weights / auto-finalize / grace | faculty-module-meta.ts | — |
| F-004 | MEDIUM | **Fixed** — mobile blocks save; server rejects total ≠ 100 | FacultyGradingPoliciesScreen, adjust-weight | — |
| F-005 | LOW | No per-section weight selector (web has it) | FacultyGradingPoliciesScreen | Optional follow-up |

---

## 29. Required Fixes Before Ship

Ship blockers remediated. Remaining: optional per-section picker (F-005). Live probes stay 200 until `v0-coursecollabv3` deploys.

---

## 31. Final Scorecard

**Overall Module Score:** 84/100  
**Final Status:** READY TO SHIP  
**Remediated:** 2026-08-17
