# Attendance Policies — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** attendance_policy slice + student check-in/leaderboard downstream

---

## Module identification

```
MODULE: Attendance Policies
MOBILE ROUTE: /module/attendance-policies
REGISTRY ENTRY: attendance-policies → FacultyAttendancePoliciesScreen
NAVIGATION GROUP: Administration
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyAttendancePoliciesScreen.tsx
RELATED API ROUTES: GET/PATCH /api/instructor/courses/policies (attendance_policy)
RELATED CORA TOOLS: attendancePolicy.read, attendancePolicy.update
RELATED WEB MODULE: administration/attendance-policies
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
| Low | 1 |

Native three-tab editor (Requirements, Check-In defaults, Excused notes). Course-scoped via `requireInstructorCourse`. Production PATCH **PASS**. Backend merges partial `attendance_policy` server-side. Student enforcement via `getAttendancePolicyForStudent()`.

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | LOW | Mobile student Policies screen does not surface attendance policy detail (web does via `/api/student/course-policies`) | Extend student PoliciesScreen or link to policies hub |

---

## 31. Final Scorecard

**Overall Module Score:** 82/100  
**Final Status:** READY TO SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0
