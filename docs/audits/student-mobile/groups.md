# Groups — Student Mobile Production Audit

```
MODULE: Groups
STUDENT ROUTE: /module/groups
NAVIGATION GROUP: Collaboration. student-nav id groups, label Groups, icon people-outline. No minTier / locked.
REGISTRY ENTRY: faculty-registry groups → FacultyGroupsScreen. Student: GroupsScreen / GroupDetailScreen / GroupCreateScreen / GroupsDiscoverScreen
PRIMARY SCREEN (this scope): expo/src/components/faculty/FacultyGroupsScreen.tsx
RELATED SCREENS:
  Faculty: FacultyGroupActionSheet, FacultyGroupCreateModal, FacultyCollabListCards, FacultyCollabCreateMenuSheet
  Student: GroupsScreen, GroupDetailScreen, GroupCreateScreen, GroupsDiscoverScreen
SUBROUTES: /collaboration/groups/[id], /collaboration/groups/create
API ROUTES:
  GET|POST /api/groups
  GET|PATCH|DELETE /api/groups/:id
  POST /api/groups/:id/approve|reject|restore
  POST|DELETE /api/groups/remove-member
  GET /api/groups/requests/discover
  POST /api/groups/requests/join
SERVICES: instructor-api.ts (session-proof), collaboration-api.ts (header-only)
DATABASE MODELS: UNVERIFIED directly. Inferred: groups, group_members, students, sessions
MEMBERSHIP: Unlocked all student tiers. Faculty Free includes groups.
CORA INTEGRATION: faculty group.list/create/assignStudents/autoBalance — no auto-balance UI on mobile
FACULTY DEPENDENCY: Manage Groups is the upstream writer (approve / reject / create-on-behalf / delete)
ADMIN DEPENDENCY: x-admin-id still opens full group SQL scope in resolveGroupProjectCourseScope
WEB DEPENDENCY: /student/dashboard-v2/groups
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: working tree (faculty groups hub + prior F-004–F-009 remediations)  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Groups**. Scope is Faculty Expo Manage Groups plus required backend and student Groups downstream.

Execution: production HTTPS probes + source read. Simulator UI: **UNVERIFIED** this run. Database rows: **UNVERIFIED** except via API responses.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **64/100**  
Blockers: 0  
Critical: 1 (G2 production student header-auth)  
High: 1 (G1 student client)  
Medium: 3 (G3–G4, G6)  
Low: 1 (G5)

Faculty **Manage Groups** is a native five-tab queue with dock search, reject confirms, detail-error banner, and `instructorRequest` session proof. Production now **rejects header-only instructor** (`401 Instructor authentication required`) — stronger than the earlier 403/404 expectation.

Student downstream is not ready. `collaboration-api.ts` still sends only `x-student-id`. Production still returns **200** for header-only `GET /api/groups?session=ECE2202` and `GET /api/groups/requests/discover`. The faculty audit script’s create→student E2E cannot run with headers anymore because `/api/instructor/students` also requires a session.

---

## Architecture

Faculty Drawer (`Course` → Manage Groups)  
→ `/module/groups`  
→ `FacultyGroupsScreen` (Queue / Active / Denied / Trash)  
→ `instructorRequest` (cookies + MFA + refresh; fail-closed)  
→ `/api/groups` + instructor course scope  

Student Drawer (`Collaboration` → Groups)  
→ `/module/groups` → `GroupsScreen`  
→ `collaborationApi.request` (**header-only `x-student-id`**)  
→ same `/api/groups` + `resolveGroupProjectCourseScope`  
→ production still treats a roster id as enough for list/discover  

---

## Files Inspected

- `expo/src/components/faculty/FacultyGroupsScreen.tsx`
- `expo/src/components/faculty/FacultyGroupActionSheet.tsx`
- `expo/src/components/faculty/FacultyGroupCreateModal.tsx`
- `expo/src/lib/instructor-api.ts` (`instructorRequest` L1483–1512, groups L3720–3798)
- `expo/src/lib/collaboration-api.ts` L6–43, L370–441
- `expo/src/components/collaboration/GroupsScreen.tsx`
- `expo/src/components/collaboration/GroupDetailScreen.tsx`
- `expo/src/components/collaboration/GroupCreateScreen.tsx`
- `expo/scripts/audit-groups-production.mjs`
- `v0-coursecollabv3/app/api/groups/route.ts`
- `v0-coursecollabv3/lib/student-course-scope.ts` `resolveGroupProjectCourseScope`
- `v0-coursecollabv3/lib/student-api-auth.ts` `requireBoundStudentCaller` (exists, unused by groups scope)

---

## Production probes (2026-08-18)

| Probe | Result |
|-------|--------|
| `GET /api/groups?session=ECE2202` no headers | **401** |
| `GET /api/groups?session=ECE2202` `x-student-id: 910000001` | **200** `groups: []` |
| `GET /api/groups/requests/discover?session=ECE2202` same header | **200** `{ ok, data }` |
| `GET /api/groups` `x-instructor-id:15` `x-course-id:16` | **401** Instructor authentication required |
| `GET /api/instructor/students?sessionCode=ECE2202` same headers | **401** |
| `npm run audit:groups-production` | **4/6** — IDOR list 401 treated as fail; roster E2E 401 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected file | Required fix |
|----|----------|------|---------|----------|---------------|--------------|
| **G1** | HIGH | Student client | Groups/discover/join/create all go through `request()` that only sets `x-student-id`. No cookies, MFA trust, refresh header, `credentials: "include"`, or HTTPS assert. Faculty `instructorRequest` already fail-closes. | `collaboration-api.ts` L6–43; L371–432 | `expo/src/lib/collaboration-api.ts` | Route `request()` through `studentAuthenticatedRequest` from `student-api.ts`. Do not invent a new client. |
| **G2** | CRITICAL | Backend | Student branch of `resolveGroupProjectCourseScope` resolves identity from `x-student-id` / query `studentId` via `resolveStudentDatabaseIdFromParam` with **no** `requireBoundStudentCaller`. Production header-only list + discover return 200. | `student-course-scope.ts` L237–279; live 200 probes | `v0-coursecollabv3/lib/student-course-scope.ts` | Bind student path with `requireBoundStudentCaller` (already in `student-api-auth.ts` L84–98). Header-only must become 401. |
| **G3** | MEDIUM | Student UX | Mine tab only matches `members[].student_id === session.id`. Detail screen also matches `created_by` / `m.id === databaseId`. Leader-only or members-null rows look empty on Mine. | `GroupsScreen.tsx` L113–119 vs `GroupDetailScreen.tsx` L68–78 | `GroupsScreen.tsx` | Match `created_by`, `leader_student_id`, `member.id`, and `member.student_id`. |
| **G4** | MEDIUM | Student UX | Create-group roster load swallows errors → empty picker, no banner. | `GroupCreateScreen.tsx` L38–42 | `GroupCreateScreen.tsx` | Surface `ApiError` like `GroupsScreen.load()`. |
| **G5** | LOW | Faculty UX | Pull-to-refresh swallows `load()` failures (`try/finally` only). | `FacultyGroupsScreen.tsx` L145–151 | `FacultyGroupsScreen.tsx` | `catch` → `setError` same as initial load. |
| **G6** | MEDIUM | Tests | Script treats instructor **401** as IDOR fail. Create-on-behalf E2E uses header-only roster and dies at 401. Header-only **student 200** is still a real fail (G2) and must stay a fail. | `audit-groups-production.mjs` L94–101, L117–124; run 4/6 | `expo/scripts/audit-groups-production.mjs` | Accept 401 as pass for header-only instructor probes. Do not fake E2E success without cookies. |

Already closed in source (do not re-fix): F-004 reject confirm, F-005 detail banner, F-006 meta “Approve queue”, F-008 POST `{ memberId }`, F-009 project create navigates to `/module/projects`. Faculty client session proof is already in `instructorRequest`.

---

## Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 92 |
| Faculty UI / actions | 88 |
| Faculty API client | 90 |
| Student API client | 28 |
| CRUD (faculty) | 84 |
| Auth (production student) | 35 |
| Course isolation (faculty live) | 88 |
| Testing | 62 |
| Faculty → student E2E | 40 |

**Overall Module Score:** 64/100  

**Final Status:** BLOCKED BY SECURITY / DATA ISSUE  

**Audited at:** 2026-08-18T03:17:00.000Z
