# Projects — Student Mobile Production Audit

```
MODULE: Projects
STUDENT ROUTE: /module/projects
NAVIGATION GROUP: Collaboration. student-nav id projects, label Projects, icon folder-open-outline. No minTier / locked.
REGISTRY ENTRY: faculty-registry projects → FacultyProjectsScreen. Student registry projects → ProjectsModuleScreen → ProjectsScreen
PRIMARY SCREEN (this scope): expo/src/components/faculty/FacultyProjectsScreen.tsx
RELATED SCREENS:
  Faculty: FacultyProjectActionSheet, FacultyProjectCreateModal, FacultyProjectsModulePanels, FacultyProjectLeaderboard
  Student: ProjectsScreen, ProjectDetailScreen, ProjectSubmitScreen
SUBROUTES: /collaboration/projects/[id], /collaboration/projects/submit
API ROUTES:
  GET /api/projects/list
  GET|PATCH|DELETE /api/projects/:id
  POST /api/projects/create
  POST /api/projects/:id/approve|reject
  GET|POST /api/projects/:id/reports
  GET|POST /api/projects/vote-stars
  GET /api/projects/leaderboard
  GET|POST|DELETE /api/projects/presentations
  GET|POST /api/projects/presentation-config
SERVICES: instructor-api.ts (session-proof), collaboration-api.ts (session-proof via studentAuthenticatedRequest)
DATABASE MODELS: UNVERIFIED directly. Inferred: projects, groups, group_members, project_scores, project_votes_stars
MEMBERSHIP: Unlocked all student tiers. Leaderboard checks Explorer+ only when studentId query is present.
CORA INTEGRATION: faculty project.create/update/configureDeadlines/configureTeams/configureDeliverables — no auto-run on mobile
FACULTY DEPENDENCY: Manage Projects is the upstream writer (approve / reject / create-on-behalf / scores / slots)
ADMIN DEPENDENCY: raw x-admin-id still grants project read/write helpers
WEB DEPENDENCY: /student/dashboard-v2/projects
```

Size: LARGE (audited as one faculty+downstream run; simulator UI UNVERIFIED)  
Audited: 2026-08-18  
Commit: working tree (faculty projects hub + prior F-001–F-010 remediations)  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Projects**. Scope is Faculty Expo Manage Projects plus required backend and student Projects downstream.

Execution: production HTTPS probes + source read. Simulator UI: **UNVERIFIED** this run. Database rows: **UNVERIFIED** except via API responses. Did not mutate project 87.

Prior faculty audit (`expo/docs/audits/faculty-mobile/projects.md`) claimed READY TO SHIP 88/100. That score is **rejected**. Unauth reads are now 401, but header-only student detail is still a live cross-course leak, and mutation helpers still trust `x-student-id` / `x-instructor-id` / `x-admin-id`.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **51/100**  
Blockers: 0  
Critical: 2 (P1 detail IDOR + admin header, P2 mutation header-as-login)  
High: 2 (P4 vote-stars header voter, P5 leaderboard 500)  
Medium: 3 (P3 production list header-auth, P6 create validates before auth, P7–P8 submit errors + dishonest script)  
Low: 0

Faculty **Manage Projects** is a native seven-tab hub with dock search, reject/action errors, and `instructorRequest` session proof. Production **rejects header-only instructor** on list/approve/presentations (`401 Instructor authentication required`). Approve uses `requireInstructorCourse` → `requireInstructorSession`.

Student downstream is not ready. `GET /api/projects/87` with any **existing** student id header returns the ELEG project **Kola** (group session `ELEG1304P01`, leader 351). Alex Rivera **722** (ECE) and Jordan **723** both read it. `x-admin-id: 1` also reads it. Student list is course-scoped and empty for ECE, so the leak is **detail/read helpers**, not the list query.

`collaboration-api.ts` `request()` already delegates to `studentAuthenticatedRequest` (Groups G1). `resolveGroupProjectCourseScope` already calls `requireBoundStudentCaller` in **source**. Production list still returns **200** for header-only student (G2 undeployed). Do not re-fix those two files.

---

## Architecture

Faculty Drawer (`Course` → Manage Projects)  
→ `/module/projects`  
→ `FacultyProjectsScreen` (Overview / Score / Board / Manage / Slots / Config / Grades)  
→ `instructorRequest` (cookies + MFA + refresh; fail-closed)  
→ `/api/projects/*`  

Student Drawer (`Collaboration` → Projects)  
→ `/module/projects` → `ProjectsScreen`  
→ `collaborationApi.request` → `studentAuthenticatedRequest`  
→ `/api/projects/list` via `resolveGroupProjectCourseScope` (source session-bound; production still header-trust)  
→ detail/vote/create/PATCH via `requireGroupReadAccess` / `requireProjectLeaderOrInstructor` (header identity)

---

## Files Inspected

- `expo/src/components/faculty/FacultyProjectsScreen.tsx`
- `expo/src/lib/instructor-api.ts` (`instructorRequest`, project methods)
- `expo/src/lib/collaboration-api.ts` L5–7, L406–489
- `expo/src/components/collaboration/ProjectsScreen.tsx`
- `expo/src/components/collaboration/ProjectDetailScreen.tsx`
- `expo/src/components/collaboration/ProjectSubmitScreen.tsx`
- `expo/scripts/audit-projects-production.mjs`
- `v0-coursecollabv3/lib/group-request-auth.ts` L6–88
- `v0-coursecollabv3/lib/project-request-auth.ts`
- `v0-coursecollabv3/lib/student-course-scope.ts` `resolveGroupProjectCourseScope` (already bound)
- `v0-coursecollabv3/app/api/projects/list/route.ts`
- `v0-coursecollabv3/app/api/projects/[id]/route.ts`
- `v0-coursecollabv3/app/api/projects/create/route.ts`
- `v0-coursecollabv3/app/api/projects/vote-stars/route.ts`
- `v0-coursecollabv3/app/api/projects/leaderboard/route.ts`

---

## Navigation & Routing

Student nav: Collaboration → Projects → `/module/projects` → `registry.tsx` `projects`. Faculty: Course → Manage Projects → `faculty-registry.tsx`. Subroutes under `/collaboration/projects/*`. **PASS** (code-traced). Simulator deep-link: **UNVERIFIED**.

## Production Configuration

API: `https://coursecollab.vercel.app`. No localhost/ngrok in the projects client path. **PASS**.

## Screens / Components / Buttons

Faculty hub ACTIVE (7 tabs, dock search, action sheet, create menu). Student list/detail/submit ACTIVE. Search dock on student list. Submit load errors swallowed (P7). Simulator tap matrix: **UNVERIFIED**.

## API Routes

| Method | Route | Caller | Authentication | Authorization | Course Scope | Status |
|--------|-------|--------|----------------|---------------|--------------|--------|
| GET | `/api/projects/list` | faculty + student | Faculty live: session. Student live: header. Source student: `requireBoundStudentCaller` | list SQL scoped | Faculty 401 header; student header 200 n=0 | P3 live |
| GET | `/api/projects/:id` | both | header student / admin enough | any existing student | **none** — ECE student read ELEG 87 | **P1** |
| PATCH/DELETE | `/api/projects/:id` | both | header identity | leader or instructor course | header instructor 15 → 403 on ELEG 87 (ACL exists, no session) | **P2** |
| POST | `/api/projects/create` | both | header | leader / instructor group | unauth 400 before auth; header instructor 404 group | **P2/P6** |
| POST | `/api/projects/:id/approve` | faculty | `requireInstructorSession` | course | header 401 | PASS live |
| GET | `/api/projects/:id/reports` | student | header | member | 722 → 403 on 87 | member check works |
| GET/POST | `/api/projects/vote-stars` | both | header | read helper | GET 87 scores 200 for 722 | **P4** |
| GET | `/api/projects/leaderboard` | both | student header accepted | N/A | **500** `gCourseScope` fragment vs `getSQL()` | **P5** |
| GET | presentations / config | faculty | session | course | header 401 | PASS live |

## Authentication

Faculty list/approve/presentations: session required on production. Student detail/list/vote/create/PATCH: header is login. Admin `x-admin-id` is login.

## Student Authorization / Cross-Student / Course Isolation

List for 722 is empty (ECE has no projects). Detail 87 (ELEG) is readable by 722, 723, and `910100001`. Fake ids 1/2/100/999999 → 401 (resolver miss, not session). Reports 403 for non-member 722. PATCH/DELETE 403 for non-leader 722 (role check after header bind).

## Membership

Leaderboard `checkMembershipAccess` only if `studentId` query present. Mobile `getProjectLeaderboard` sends session code only — membership gate skipped. **INFO** / not scored as a new HIGH without a live Explorer/Scholar cookie probe. UNVERIFIED on a real Scholar session.

## Security Attack Results

| Attack | Result |
|--------|--------|
| Unauth list/detail/leaderboard/approve/delete | 401 |
| Header-only instructor list/approve/presentations | 401 |
| Header-only student list | **200** `projects: []` |
| Header-only student GET 87 (ELEG) as ECE 722 / 723 | **200** title Kola |
| `x-admin-id: 1` GET 87 | **200** Kola |
| Header-only student GET vote-stars?projectId=87 | **200** score payload |
| Header-only instructor PATCH 87 | 403 Forbidden (not 401) |
| Header-only instructor POST create groupId=1 | 404 Group not found (auth passed) |
| Header-only student PATCH/DELETE 87 | 403 leader only |
| Header-only student GET 87/reports | 403 Forbidden |
| Student header leaderboard | **500** SQL fragment |

## Mobile UX / Errors

Faculty refresh and partial leaderboard/session failures already set the header banner (prior F-007/F-008). Student list surfaces `ApiError`. Submit screen `load()` catch sets groups to `[]` with no banner. Leaderboard 500 would surface on student Board if that screen called it; faculty Board uses `instructorApi.getProjectLeaderboard` (same route — would 500 after session).

## Tests

`npm run audit:projects-production` still creates via header-only instructor (will 401), treats instructor 401 on foreign-course list as fail, and **does not fail** header-only student GET 200. Prior 12/19 is not an honest gate.

## Faculty → Student Integration

Approve is session-bound, so header-only E2E cannot prove create→approve→student visible. After deploy, student detail must not return foreign-course projects. Simulator faculty→student: **UNVERIFIED**.

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected file | Required fix |
|----|----------|------|---------|----------|---------------|--------------|
| **P1** | CRITICAL | Backend read ACL | `requireGroupReadAccess` treats any resolvable `x-student-id` as enough to read **any** project. No course/enrollment check. `x-admin-id` returns `{ ok: true }` with no session. | `group-request-auth.ts` L68–88; live GET 87 = Kola / ELEG1304P01 for 722, 723, 910100001, and `x-admin-id:1` | `v0-coursecollabv3/lib/group-request-auth.ts` | Student: `requireBoundStudentCaller` then course match (`resolveStudentCourseContextByDbId` vs group `course_id` / session). Instructor: `requireInstructorSession` + existing `instructorCanAccessGroup`. Do **not** accept raw `x-admin-id`. Header-only GET 87 must become 401. |
| **P2** | CRITICAL | Backend mutations | `requireProjectLeaderOrInstructor`, `requireProjectMemberOrInstructor`, `requireInstructorGroupAccess`, and `create/route.ts` bind identity via `instructorIdFromGroupsRequest` / `studentDbIdFromGroupsRequest` (raw headers). | `project-request-auth.ts` L80–166; `group-request-auth.ts` L47–66; `create/route.ts` L54–72; live header create → 404 Group not found; header instructor PATCH 87 → 403 not 401 | those files | Same session bind as P1. Instructor path: `requireInstructorSession`. Student path: `requireBoundStudentCaller`. Keep leader/member/course checks after bind. |
| **P3** | CRITICAL | Production list | Live `GET /api/projects/list?session=ECE2202` with `x-student-id: 722` is **200**. Source already calls `requireBoundStudentCaller` in `resolveGroupProjectCourseScope`. | live 200 n=0; `student-course-scope.ts` L238–246 | production deploy of existing source | **Do not edit** `student-course-scope.ts`. Header-only list must be 401 after v0 deploy. |
| **P4** | HIGH | Backend vote | `vote-stars` POST/GET uses `requireProjectReadAccess` (P1) then compares `voterId` to header helpers. GET scores for project 87 returned 200 for student 722. | `vote-stars/route.ts` L38–49, L143–144; live GET 200 | `v0-coursecollabv3/app/api/projects/vote-stars/route.ts` | After P1, bind `voterId` to `requireBoundStudentCaller` / `requireInstructorSession`. Do not POST a live vote on project 87. |
| **P5** | HIGH | Leaderboard | `requireProjectsListScope` returns a `@/lib/db` `sql` fragment. Leaderboard interpolates it into `getSQL()`, which stringifies the fragment as a boolean. | live 500 `invalid input syntax for type boolean: "{"__unsafe":true,...g.course_id = 16`; `leaderboard/route.ts` L2–8, L68 | `v0-coursecollabv3/app/api/projects/leaderboard/route.ts` | `import { sql } from "@/lib/db"` like `list/route.ts`. Remove `getSQL()`. |
| **P6** | MEDIUM | Create auth order | Unauth POST create without `studentId` is **400** Invalid student ID before any 401. | live 400; `create/route.ts` L26–34 before L54 | `create/route.ts` | Authenticate first; then validate. Student id must come from the bound caller, not the body alone. |
| **P7** | MEDIUM | Student UX | Submit screen `load()` swallows errors → empty group picker, no banner. | `ProjectSubmitScreen.tsx` L69–71 | same file | Surface `ApiError` like `ProjectsScreen.load()`. |
| **P8** | MEDIUM | Tests | Script treats instructor **401** as IDOR fail. F-005 create/approve uses header-only instructor (now 401). Header-only **student GET 200** is not a fail. | `audit-projects-production.mjs` L51–58, L167–172, L201–234 | same file + honesty | Accept 401 as pass for header-only instructor. Fail header-only student list **and** GET `/api/projects/87` if status is 200. Do not fake E2E without cookies. Do not mutate project 87. |

Already closed in source (do not re-fix): F-007/F-008 faculty refresh + partial-load banners; F-009 Maestro; F-010 meta features; faculty `instructorRequest` session proof; student `collaboration-api` `request()` → `studentAuthenticatedRequest`; `resolveGroupProjectCourseScope` → `requireBoundStudentCaller`; approve/reject via `requireInstructorProjectAccess`.

## Local repairs (source only — production unpatched)

Verified by re-reading the files after the fix agent (not from the agent summary):

- P1/P2: `group-request-auth.ts` + `project-request-auth.ts` session-bind; `studentCanAccessGroup`; no `x-admin-id` short-circuit
- P4/P6: `vote-stars` voter bind; `create` authenticates before body `studentId`
- P5: `leaderboard/route.ts` uses `import { sql } from "@/lib/db"`
- P7: `ProjectSubmitScreen` surfaces load errors
- P8: `audit-projects-production.mjs` fails header-only student 200 and header-only instructor create 401
- Contract: `npx tsx --test lib/project-request-auth.contract.test.ts` pass
- P3 not re-edited (`student-course-scope.ts` already bound)

Live `GET /api/projects/87` with `x-student-id: 722` is still **200** until v0 deploy. Status remains BLOCKED.

---

## Required Before Ship

1. P1–P2 session bind on read/mutation helpers (source).
2. P4 vote bind; P5 leaderboard `sql` import.
3. Deploy v0 so P3 list and P1 detail are 401/403 without cookies.
4. Honest `audit:projects-production` (P8).
5. Re-probe production. Do not mark READY until header-only GET 87 is not 200.

## Future Improvements

- Leaderboard membership gate should use the bound caller, not an optional query `studentId`.
- Simulator faculty approve → student list E2E after cookies exist.

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 92 |
| Routing | 88 |
| UI | 84 |
| Buttons | 80 |
| API | 48 |
| CRUD | 68 |
| Authentication | 32 |
| Authorization | 28 |
| Student Isolation | 22 |
| Course Isolation | 38 |
| Membership | 70 |
| Production Configuration | 90 |
| Data Integrity | 72 |
| Security | 24 |
| Assessment Security | n/a |
| Cora Security | n/a |
| Error Handling | 70 |
| Mobile UX | 80 |
| Performance | 78 |
| Accessibility | 70 |
| Testing | 48 |

**Overall Module Score:** 51/100  

**Final Status:** BLOCKED BY SECURITY / DATA ISSUE  

**Audited at:** 2026-08-18T03:50:00.000Z
