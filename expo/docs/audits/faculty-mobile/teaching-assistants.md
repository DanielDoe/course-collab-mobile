# Teaching Assistants — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** TA CRUD + course assignments + module permissions + Enterprise tier gate

---

## Module identification

```
MODULE: Teaching Assistants
MOBILE ROUTE: /module/teaching-assistants
REGISTRY ENTRY: teaching-assistants → FacultyTeachingAssistantsScreen
NAVIGATION GROUP: Administration
MEMBERSHIP REQUIREMENT: Enterprise (nav locked: true, minTier: "Enterprise")
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyTeachingAssistantsScreen.tsx
RELATED SCREENS: FacultyTeachingAssistantsActionSheet
RELATED API ROUTES:
  - GET/POST /api/instructor/teaching-assistants
  - PATCH/DELETE /api/instructor/teaching-assistants/:id
  - GET/PATCH /api/instructor/ta-permissions
RELATED CORA TOOLS: ta.list, ta.manage (restricted)
RELATED WEB MODULE: administration/teaching-assistants
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP (local; Pro accounts get 403 after v0 deploy)

**Score:** 88/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 1 |
| Info | 1 |

Native full CRUD with Enterprise UI gate. TA list/create/update/delete and ta-permissions now require `teachingAssistantManagement` (Enterprise). My Course shortcut is hidden below Enterprise.

---

## 28. Findings

| ID | Severity | Finding | Evidence | Recommended Fix |
|----|----------|---------|----------|-----------------|
| F-001 | HIGH | **Fixed** — `requireInstructorTaManagement` + ta-permissions feature gate | instructor-ta-api-auth.ts | — |
| F-002 | MEDIUM | **Fixed** — My Course TA row hidden below Enterprise | FacultyMyCourseActionSheet | — |
| F-003 | MEDIUM | Header-only auth (systemic) | No session token on mobile | Long-term JWT |
| F-004 | LOW | Web uses RBAC `manage_tas`; mobile uses Enterprise tier — inconsistent | Both portals | Align billing/RBAC model |
| F-005 | INFO | DELETE is soft-deactivate; UI labels correctly | — | OK |

---

## 29. Required Fixes Before Ship

Ship blocker remediated. Remaining: systemic header auth (F-003) and RBAC/billing alignment (F-004).

---

## 31. Final Scorecard

**Overall Module Score:** 88/100  
**Final Status:** READY TO SHIP  
**Remediated:** 2026-08-17
