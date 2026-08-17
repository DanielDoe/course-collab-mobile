# Assessment Governance — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Privilege source + policy notice + student course-assessment-governance downstream

---

## Module identification

```
MODULE: Assessment Governance
MOBILE ROUTE: /module/assessment-governance
REGISTRY ENTRY: assessment-governance → FacultyAssessmentGovernanceScreen
NAVIGATION GROUP: Administration
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyAssessmentGovernanceScreen.tsx
RELATED API ROUTES:
  - GET/PATCH /api/instructor/courses/assessment-governance
  - GET /api/student/course-assessment-governance (downstream)
RELATED CORA TOOLS: governance.read, governance.update (Cora mutation restricted)
RELATED WEB MODULE: administration/assessment-governance
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 82/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 |
| Info | 1 |

Native two-tab editor: `assessment_privilege_source` (instructor_only / membership_enabled / hybrid) and `show_course_policy_notice`. Production GET/PATCH round-trip **PASS** (`membership_enabled` observed on ECE2202). Unauth → 401; IDOR → 404.

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | LOW | Meta lists publish/retake/integrity settings not on this screen | Align module meta |
| F-002 | LOW | API returns `students_impacted` but UI never shows it | Add insight chip or footer stat |
| F-003 | INFO | Cora listed in registry but blocked in data-scope | Document |

---

## 31. Final Scorecard

**Overall Module Score:** 82/100  
**Final Status:** READY TO SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0  
**Production audit:** `test-admin-modules-api.mjs` PASS
