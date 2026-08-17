# Course Settings — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile + `/api/instructor/courses` module-settings + student module visibility downstream  
**Module size:** SMALL — single settings form

---

## Module identification

```
MODULE: Course Settings
MOBILE ROUTE: /module/course-settings
REGISTRY ENTRY: course-settings → FacultyCourseSettingsScreen
NAVIGATION GROUP: Administration
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyCourseSettingsScreen.tsx
RELATED SCREENS: FacultyAdminCourseGate, FacultyAdminScreen
RELATED API ROUTES:
  - GET  /api/instructor/courses (client filters module_settings by course)
  - PATCH /api/instructor/courses/module-settings
RELATED SERVER ACTIONS: Not in mobile repo
RELATED SERVICES: expo/src/lib/instructor-admin-api.ts
RELATED DATABASE TABLES/MODELS: course module_settings JSON — UNVERIFIED schema
RELATED CORA TOOLS: courseSettings.read, courseSettings.updateSafe (Cora mutation blocked)
RELATED WEB MODULE: administration/course-settings deep link
```

---

## 1. Executive Summary

**Readiness:** READY WITH MINOR FIXES

**Score:** 78/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 1 |
| Info | 1 |

Native grouped toggle screen for seven module visibility flags (lectures, attendance, practiceHub, codeBench, aiTutor, questionBank, announcements). Production smoke **PASS** via `node scripts/test-admin-modules-api.mjs` — GET module_settings + PATCH round-trip on ECE2202.

**Proven:** Nav → registry → screen; scoped PATCH 401/404 on bad scope; save footer + success toast.  
**Not proven:** Student nav hides disabled modules on device; dedicated scoped GET endpoint.

---

## 28. Findings

| ID | Severity | Area | Finding | Recommended Fix |
|----|----------|------|---------|-----------------|
| F-001 | MEDIUM | API | `getModuleSettings()` loads entire instructor course list to read one course's toggles | Add scoped GET or pass `x-course-id` to narrow endpoint |
| F-002 | LOW | Meta | Module meta promises metadata/enrollment rules; UI is module toggles only | Align meta copy or expand screen |
| F-003 | INFO | Cora | Capabilities listed but module in `FACULTY_CORA_RESTRICTED_MODULE_IDS` | Document intentional restriction |

---

## 31. Final Scorecard

**Overall Module Score:** 78/100  
**Final Status:** READY WITH MINOR FIXES  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0  
**Production audit:** `expo/scripts/test-admin-modules-api.mjs` (Course Settings steps PASS)
