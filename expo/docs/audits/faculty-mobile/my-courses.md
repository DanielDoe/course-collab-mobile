# My Courses — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Course roster hub + embedded academic terms/sections + active course selection + student activeTerm downstream

---

## Module identification

```
MODULE: My Courses
MOBILE ROUTE: /module/my-courses
REGISTRY ENTRY: my-courses → FacultyMyCoursesScreen
NAVIGATION GROUP: Administration
PRIMARY SCREEN: expo/src/components/faculty/FacultyMyCoursesScreen.tsx
RELATED SCREENS: FacultyMyCourseActionSheet, FacultyCreateCourseSheet, FacultyAcademicTerm* modals
RELATED API ROUTES:
  - GET/POST /api/instructor/courses
  - DELETE /api/instructor/academic-terms/:termId/courses/:courseId
  - Academic terms + sessions CRUD (shared with academic-terms module)
RELATED CORA TOOLS: None (restricted module)
RELATED WEB MODULE: administration/my-courses
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 85/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 1 |
| Info | 2 |

Native course list with dock search, active-term banner, create course sheet, action sheet shortcuts. Production GET courses **PASS** (4 courses). Overlaps dedicated Academic Terms module (audited 89/100). Does not use `FacultyAdminCourseGate` (correct — course picker hub).

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | MEDIUM | `termScope` falls back to `courses[0]` when drawer course unset — term edits may target wrong offering | Require explicit course selection before term banner actions |
| F-002 | LOW | Duplicate entry points with `/module/academic-terms` | Document or consolidate nav |
| F-003 | INFO | Inherits academic-terms pending v0 PUT/DELETE auth deploy | Revalidate after deploy |
| F-004 | INFO | No Cora registry entry | Intentional |

---

## 31. Final Scorecard

**Overall Module Score:** 85/100  
**Final Status:** READY TO SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0  
**Dependencies:** academic-terms audit, instructor-api, faculty-academic-term-utils
