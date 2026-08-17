# Classroom Points Rules — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** rewards_policy + bulk AI backfill + classroom-points student downstream

---

## Module identification

```
MODULE: Classroom Points Rules
MOBILE ROUTE: /module/classroom-points-rules
REGISTRY ENTRY: classroom-points-rules → FacultyClassroomPointsRulesScreen
NAVIGATION GROUP: Administration
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyClassroomPointsRulesScreen.tsx
RELATED API ROUTES:
  - GET/PATCH /api/instructor/courses/policies (rewards_policy) — scoped ✅
  - POST /api/instructor/classroom-points/bulk-ai-evaluate — requireInstructorCourse ✅
RELATED CORA TOOLS: pointsRules.read, pointsRules.update
RELATED WEB MODULE: administration/classroom-points-rules
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP (local; live spoof 200 until v0 deploy)

**Score:** 88/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

Native three-tab editor plus AI backfill. Backfill now requires a valid instructor + course via `requireInstructorCourse`. Mobile confirms before running the 25-row backfill.

---

## 28. Findings

| ID | Severity | Finding | Evidence | Recommended Fix |
|----|----------|---------|----------|-----------------|
| F-001 | **CRITICAL** | **Fixed** — `requireInstructorCourse` (missing/invalid course → 400/401/403) | bulk-ai-evaluate/route.ts | — |
| F-002 | LOW | **Fixed** — confirm dialog before backfill | FacultyClassroomPointsRulesScreen | — |

---

## 29. Required Fixes Before Ship

Ship blockers remediated. Live spoof probe stays 200 until `v0-coursecollabv3` deploys.

---

## 31. Final Scorecard

**Overall Module Score:** 88/100  
**Final Status:** READY TO SHIP  
**Remediated:** 2026-08-17
