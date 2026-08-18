# Classroom Points — Student Mobile Production Audit

```
MODULE: Classroom Points
STUDENT ROUTE: /module/classroom-points
NAVIGATION GROUP: Performance & Rewards. student-nav id classroom-points, label Classroom Points, icon trophy-outline. No minTier / locked.
FACULTY ROUTE: /module/classroom-points
FACULTY NAVIGATION GROUP: Assessments. faculty-nav id classroom-points, icon star-outline, badgeKey pendingPoints. No minTier.
REGISTRY ENTRY: faculty-registry classroom-points → FacultyClassroomPointsScreen; student registry classroom-points → ClassroomPointsModuleScreen → ClassroomPointsScreen
PRIMARY SCREEN: expo/src/components/faculty/FacultyClassroomPointsScreen.tsx
RELATED SCREENS:
  - FacultyClassroomPointsKpiGrid.tsx, FacultyClassroomPointsLeaderboard.tsx
  - FacultyClassroomPointDetailModal.tsx, FacultyClassroomPointAssignmentCreateModal.tsx
  - FacultyClassroomPointAssignmentDetailModal.tsx, FacultyManualAwardModal.tsx
  - Student: ClassroomPointsScreen.tsx, ClassroomPointsTaskScreen.tsx (/rewards/classroom-task/[id])
  - ClassroomPointDetailScreen.tsx (/rewards/classroom-point/[id])
  - Admin Classroom Points Rules is a separate module (out of scope)
SUBROUTES: /rewards/classroom-task/[id], /rewards/classroom-point/[id]
API ROUTES (faculty):
  GET/POST/DELETE /api/classroom-points
  POST/DELETE /api/classroom-points/approve
  GET /api/classroom-points/summary
  GET/POST /api/classroom-points/submissions
  GET/PUT/DELETE /api/classroom-points/submissions/:id
  GET /api/practice-points?status=pending
  POST/DELETE /api/practice-points/approve
  POST /api/classroom-points/validate-code
API ROUTES (student):
  GET /api/classroom-points?studentId=&session=
  GET /api/classroom-points/leaderboard?studentId=&session=
  GET /api/classroom-points/submissions?studentId=&session=
  GET /api/classroom-points/submissions/:id
  POST /api/classroom-points/submit-code
  POST /api/classroom-points/submit-solution
  POST /api/student/classroom-points/solution-upload
SERVICES: instructor-api.ts L1892–2046; rewards-api.ts; faculty-classroom-points-utils.ts; classroom-submission.ts
DATABASE MODELS: Inferred from v0: classroom_points, classroom_point_submissions, codebench_submissions, classroom_solution_submissions, practice_points
MEMBERSHIP: Unlocked (Free / Scholar). Intended.
CORA INTEGRATION: faculty points.createAssignment / reviewPending / award / approve (high). Student denied approve_points; toolHints get_classroom_points. No tool implementations audited live.
FACULTY DEPENDENCY: Faculty Expo Classroom Points is the governance surface. Create assignment → student task list; approve/auto-eval → student history.
ADMIN DEPENDENCY: Classroom Points Rules is a different Expo module.
WEB DEPENDENCY: /student/dashboard-v2/classroom-points
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Classroom Points**. Scope is Faculty Expo/mobile plus required backend and student Rewards downstream.

Execution: production HTTPS with Alex ECE `910000001` / db `722`, Jordan `910000002` / db `723`, faculty `mchen` / instructor `15`, course `16`. Simulator: **UNVERIFIED**. Created disposable assignment **170** `AUDIT-DELETE Classroom Points`, Alex submitted (`print('audit')`), auto-award **7.5** pts (id **3649**), then DELETE revoked 7.5. Did not approveAll or award live students. Did not submit to `STU Test Points` **169**.

Prior faculty report `expo/docs/audits/faculty-mobile/classroom-points.md` claimed READY 88. `audit-classroom-points-production.mjs` treats live **200/400** as PASS (`pending deploy`) and expects header-only instructor reads **200**. Rejected. Faculty status set to `REVALIDATION_REQUIRED`.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **58/100**  
Blockers: 0  
Critical: 1  
High: 4  
Medium: 2  
Low: 3

Faculty Classroom Points is a five-tab hub (overview, pending, board, awards, tasks) with review/award/create modals. Student mobile lists history, tasks, and ranks, then opens a task submit screen.

**Session bind is live on the main classroom-points and practice-points routes.** Unauth and header-only student/faculty GETs and mutations are **401**. Alex cookie + Jordan `x-student-id` is **403**. Faculty cookie + course `1` summary is **403**. Cookie create **170** → student list includes it → submit **200** auto-award → DELETE **200** revoke. Faculty instructor writes are not an open API.

**Ship is blocked by answer-key leakage.** Authenticated student `GET /api/classroom-points/submissions?studentId=722&session=ECE2202` returned **167** rows (**100** with `question_config.expected_answer`, including full solutions such as `Z_L = 1.33 − j4.00 kΩ … P_max = 4.18 mW`). Student `GET /api/classroom-points/submissions/167` **200** with the same key. The mobile UI does not render `expected_answer`; the API still sends it.

Also open: unauth solution-upload reaches the handler (**400/404**, not 401); student list includes **65** `session=NULL` assignments; attempt flags still follow query `studentId` after auth; dishonest production script.

---

## Architecture

Faculty Drawer "Classroom Points"
→ `/module/classroom-points`
→ `FacultyClassroomPointsScreen` + `instructorRequest` (cookies + MFA + refresh)
→ GET pending/approved/summary/assignments/practice-points
→ approve / reject / approveAll / manual award / assignment CRUD

Student Drawer "Classroom Points"
→ `/module/classroom-points`
→ `ClassroomPointsScreen` + `rewardsApi` / `studentAuthenticatedRequest`
→ task `/rewards/classroom-task/[id]` → submit-code / submit-solution / upload

Production
→ Faculty: `requireClassroomPointsInstructor` → `requireInstructorSession`
→ Student reads/writes (except upload): `requireClassroomPointsRead` / `requireClassroomPointsStudent` → `requireBoundStudentCaller`
→ Upload: form `studentId` only (no session helper)

---

## Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyClassroomPointsScreen.tsx` + KPI / leaderboard / four modals |
| Utils | `faculty-classroom-points-utils.ts` (no `__DEV__` fixtures) |
| Student | `ClassroomPointsScreen.tsx`, `ClassroomPointsTaskScreen.tsx`, `ClassroomPointDetailScreen.tsx` |
| API | `instructor-api.ts`, `rewards-api.ts` |
| Backend | `classroom-points-request-auth.ts`, `app/api/classroom-points/**`, `solution-upload/route.ts` |
| Script | `expo/scripts/audit-classroom-points-production.mjs` |
| Prior | `expo/docs/audits/faculty-mobile/classroom-points.md` (not trusted) |

---

## Navigation & Routing

**Status:** PASS

Faculty Assessments group + student Rewards group share `/module/classroom-points` via portal registries. Student task/detail are dedicated file routes. Faculty missing-course empty state present. Deep link mapped.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`  
Development URLs: none in this module’s clients  
Mock dependencies: none in faculty utils

---

## Screens

Faculty hub ACTIVE (code + cookie APIs). Sim **UNVERIFIED**.  
Student list ACTIVE. Task/detail ACTIVE (submit executed on disposable 170). Search is top `CollabSearch`, not dock.

---

## Components

| Component | Class |
|-----------|-------|
| Faculty tabs + dock `FacultySearchToolbar` | ACTIVE |
| Review / award / create / assignment detail / manual award modals | ACTIVE |
| Student `TabbedModuleLayout` + podium | ACTIVE |
| Student `CollabSearch` | ACTIVE (wrong placement) |
| Cora tools | PLACEHOLDER |

---

## Buttons

| Control | Location | Handler | Backend | Actual | Status |
|---------|----------|---------|---------|--------|--------|
| Faculty tabs / search / refresh | Hub | load | GETs | cookie 200; unauth 401 | PASS |
| Approve / reject / approveAll | Pending | instructor POST/DELETE | approve | unauth 401; fake id cookie 404 | PASS (unauth). Live approveAll not run |
| Manual award | Modal | POST points | award | unauth 401 | PASS (unauth). Live award not run |
| Create / edit / delete task | Tasks | POST/PUT/DELETE submissions | CRUD | cookie create 170 / update / delete 200 | PASS |
| Student open task | List | `/rewards/classroom-task/[id]` | list + submit | 170 visible; submit 200 | PASS |
| Student submit code | Task | `submitClassroomCode` | POST submit-code | own cookie 200 on 170; spoof Jordan **403** | PASS auth |
| Student upload | Task | solution-upload | POST | unauth **400/404** | FAIL (CP2) |

---

## Menus / Action Sheets

Faculty review modal + create/award sheets. Confirmations on bulk approve (code-traced). Sim **UNVERIFIED**.

---

## Modals

Create assignment, assignment detail, manual award, review. State reset **UNVERIFIED** on sim. Create/update/delete **executed** on 170.

---

## Forms

| Form | Client | Server | Status |
|------|--------|--------|--------|
| Create assignment | title required | title required; session must belong to course | PASS (170) |
| Manual award | required fields | unauth 401; cookie missing fields 400 | PARTIAL |
| Student code submit | code required | session bind; assignment must exist | PASS on 170 |

---

## API Routes

| Method | Route | Caller | Auth | Status |
|--------|-------|--------|------|--------|
| GET | `/api/classroom-points` unauth / header-only | both | **401** | PASS |
| GET | same + Alex cookie | student | **200** n=0 | PASS |
| GET | Alex cookie + Jordan header | student | **403** | PASS |
| GET | faculty cookie pending | faculty | **200** n=0 | PASS |
| GET | `/api/classroom-points/summary` unauth / header | faculty | **401** | PASS |
| GET | summary cookie + course 16 | faculty | **200** n=12 | PASS |
| GET | summary cookie + course 1 | faculty | **403** | PASS |
| GET | summary student cookie + faculty headers | student | **401** | PASS |
| GET | leaderboard unauth / header | student | **401** | PASS |
| GET | leaderboard Alex cookie | student | **200** n=46 `privacyMode=true` (names stripped) | PASS privacy |
| GET | submissions unauth / header | student | **401** | PASS |
| GET | submissions + Alex cookie | student | **200** **167** rows, **100 expected_answer** | FAIL (CP1, CP3) |
| GET | submissions/:id unauth / header | both | **401** | PASS |
| GET | submissions/167 Alex cookie | student | **200** + expected_answer | FAIL (CP1) |
| GET | submissions?manage=1 cookie | faculty | **200** n=101 ECE only | PASS |
| GET | practice-points unauth / header | faculty | **401** | PASS |
| POST | approve / award / create / validate unauth / header | faculty | **401** | PASS |
| POST | submit-code unauth / header | student | **401** | PASS |
| POST | submit-code Alex as Jordan | student | **403** | PASS |
| POST | solution-upload unauth | student | **400/404** handler | FAIL (CP2) |
| POST | submissions create cookie | faculty | **200** id 170 | PASS |
| DELETE | submissions/170 cookie | faculty | **200** revoked 7.5 | PASS |

---

## CRUD

| Operation | Executed? | Status |
|-----------|-----------|--------|
| Create assignment 170 | Yes | PASS |
| Read faculty list / student list | Yes | PARTIAL (student list leaks keys + NULL session) |
| Update 170 title | Yes 200 | PASS |
| Delete 170 | Yes 200 revoke | PASS |
| Student submit 170 | Yes 200 auto-award 3649 | PASS |
| Faculty approveAll | No | UNVERIFIED E2E (unauth 401) |

---

## Authentication

**Status:** PASS on main routes. FAIL on solution-upload.

`requireClassroomPointsRead` / `requireClassroomPointsInstructor` are live. Cookie is identity. Header-only is 401. Upload is not session-bound.

---

## Student Authorization

Student cannot call faculty summary (**401**). Student cannot submit as another id (**403**). Student cannot instructor-approve (**401**). Student **can** read expected answers on published solution tasks (CP1).

---

## Cross-Student Isolation

Points list: Jordan cookie + Alex header **403**. Submit spoof **403**. Leaderboard names blurred for students.

Submissions GET still applies query `studentId` to attempt/pending flags after a valid session (`submissions/route.ts` L179–192). Jordan + own header + Alex query **200** (same catalog). Isolation of attempt state is **UNVERIFIED** as a live differential; code is FAIL (CP4).

---

## Course / Section Isolation

Faculty manage list is course-scoped (101 ECE). Student list uses `session = ECE2202 OR session IS NULL` → **65** NULL-session rows plus 102 ECE. Course isolation **FAIL** (CP3).

---

## Membership Enforcement

Unlocked. PASS (intended). No client tier override observed.

---

## Security

Main faculty/student session bind **PASS**. **CRITICAL** expected_answer on student GETs (CP1). Upload unauth handler (CP2). NULL-session catalog leak (CP3).

---

## Assessment Security

Classroom solution tasks are graded work. **100** `expected_answer` fields on the student submissions payload. GET-by-id 167 repeats the key. Mobile does not display the field. API leak is enough. **FAIL**.

---

## Cora Security

Student denied `approve_points`. Faculty approve/award risk high. Live Cora **UNVERIFIED**. PARTIAL.

---

## Database Integrity

Create 170 → submit created point **3649** and awarded **7.5** (auto-eval). DELETE revoked 1 submission and 7.5 points. GET 170 after delete **404**. Integrity of that cycle **PASS**. ApproveAll **UNVERIFIED**.

---

## Files / Documents

Solution upload exists. Unauth reached assignment lookup. File type allowlist exists locally. Live successful upload **UNVERIFIED** (169 is code; 167 treated expired by upload SQL).

---

## Notifications

`useNotificationModuleRefresh("classroom-points")` on faculty and student. Push **UNVERIFIED**.

---

## Mobile UX

Faculty dock search **PASS** (code). Student `CollabSearch` stacked in chrome **FAIL** (CP6). Sim **UNVERIFIED**.

---

## Theme

`NATIVE` + classroom-points / rewards themes. Status uses icon + label. Sim **UNVERIFIED**.

---

## Accessibility

Faculty search labeled. Student cards are pressable titles. Sim **UNVERIFIED**.

---

## Errors / Loading / Empty States

Faculty/student error banners and empty copies present. Upload unauth returns assignment errors instead of 401.

---

## Performance

Student payload **167** assignments with full `question_config`. Faculty manage **101**. MEDIUM.

---

## Web / Mobile Integration

Shared APIs. Web editor stores `expected_answer`. Mobile consumes the same list. Parity of UI **UNVERIFIED**. Contract of keys **FAIL**.

---

## Faculty → Student Integration

**Executed.** Create 170 → Alex list includes 170 → submit 200 “Code evaluated — points awarded!” → faculty pending empty (auto-approved) → DELETE revoked 7.5. Downstream works. Keys still leak on the same list.

---

## Tests

`audit-classroom-points-production.mjs` false-PASSes 200/400 and expects header-only instructor **200**. No Expo unit tests for this module.

---

## End-to-End Results

| Step | Result |
|------|--------|
| Unauth / header-only main routes | 401 |
| Faculty cookie list/summary/tasks | 200 |
| Faculty foreign course | 403 |
| Create 170 → student sees → submit → delete | 200 / revoked |
| Student expected_answer on list + GET 167 | 200 leak |
| Unauth upload | 400/404 |
| Simulator | UNVERIFIED |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Missing session main routes | 401 |
| Header-only student/faculty | 401 |
| Cookie + foreign student header | 403 |
| Faculty foreign course | 403 |
| Student → faculty summary | 401 |
| Submit as other student | 403 |
| Read expected_answer | **200** |
| Unauth upload | **400/404** |
| Student list NULL session | **200** 65 rows |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| CP1 | CRITICAL | Assessment / privacy | Student submissions list and GET-by-id return `question_config.expected_answer` (100 keys). | Prod Alex cookie list n=167 withExpected=100; GET 167 **200** `Z_L = 1.33 − j4.00 kΩ … P_max = 4.18 mW`. | `app/api/classroom-points/submissions/route.ts`, `submissions/[id]/route.ts` | Redact `expected_answer` (and instructor-only solution fields) when `requireClassroomPointsRead` role is student. Do not rely on UI hiding. |
| CP2 | HIGH | Auth | `POST /api/student/classroom-points/solution-upload` has no session helper. Unauth reaches assignment lookup. | Prod unauth upload 169 **400** “Not a solution assignment”; 167 **404** expired. Local route L39–72 only requires form `studentId`. | `app/api/student/classroom-points/solution-upload/route.ts` | `requireBoundStudentCaller(request, rawStudent)` first. 401 without session. |
| CP3 | HIGH | Course isolation | Student list is `session = ECE2202 OR session IS NULL` (65 NULL-session tasks). Faculty manage is course-scoped (101 ECE). | Prod Alex list sessions `{ECE2202:102, NULL:65}`. | `submissions/route.ts` L140 | Scope student catalog to the caller’s course/section. Do not include NULL session from other courses. |
| CP4 | HIGH | Isolation | After session auth, attempt/pending flags still use query `studentId`. | Local L179–192 `resolveStudentDatabaseIdFromParam(studentId)`. Jordan+Alex header 403; Jordan header + Alex query 200. | `submissions/route.ts` | For student role, use `access.studentDbId` only. |
| CP5 | HIGH | Tests | Production script treats 200/400 as PASS and expects header-only instructor 200. | `audit-classroom-points-production.mjs` L46–56, L135–137, L170. | `expo/scripts/audit-classroom-points-production.mjs` | Fail on 200/400/404 for unauth/header-only. Cookie E2E only. Never 404-as-auth. |
| CP6 | MEDIUM | Mobile UX | Student search is top `CollabSearch`. | `ClassroomPointsScreen.tsx` L277. | same | `StudentSearchToolbar` `placement="dock"`. |
| CP7 | MEDIUM | Performance | `missingSubmissions` / `allAssignments` (L205–232) have **no** `is_active` filter, so expired tasks (e.g. 167) ship with full `question_config`. List “active” SQL matches `CLASSROOM_SUBMISSION_IS_ACTIVE_SQL`; the missing dump does not. | Prod n=167 including expired 167 (upload 404 expired). | `submissions/route.ts` | Apply the same active SQL to missing/pending catalogs. After CP3 the NULL-session dump shrinks. |
| CP8 | LOW | Cora | Registry only. | faculty/student registries | — | Keep deny approve; do not add award tools without confirm. |
| CP9 | LOW | Testing | No module contract test for expected_answer redact or upload session. | Local: 6/6 v0 + 2/2 Expo `tsx --test` after repair. | expo + v0 tests | Source/contract tests added. Production still unpatched. |
| CP10 | LOW | Docs | Prior faculty READY 88 invalid. | faculty audit + dishonest script | faculty-mobile status | REVALIDATION_REQUIRED until CP1–CP5 re-probed on production. |

---

## Local repairs (source verified — production unpatched)

Parent re-read every changed file. Did not take the fixer at its word. Tests re-run by parent:

```
cd v0-coursecollabv3 && npx tsx --test lib/classroom-points-student-question-config.test.ts lib/classroom-points-auth.contract.test.ts
→ 6 pass / 0 fail

cd expo && npx tsx --test src/lib/classroom-points-auth.contract.test.ts
→ 2 pass / 0 fail
```

| ID | Local source | Production |
|----|--------------|------------|
| CP1 | `redactClassroomPointsStudentQuestionConfig` strips `expected_answer` / `solution` / `reference_answer` / `answer_key`. Student list + GET-by-id call it. Instructor manage/GET keep the key. Student GET-by-id also `submissionBelongsToCourse`. | Still leaked on 2026-08-18 probes. |
| CP2 | `requireBoundStudentCaller(request, rawStudent)` before assignment lookup. Identity is `access.studentDbId`. | Unauth upload still 400/404 until v0 deploy. |
| CP3 | Student loader uses `sqlSubmissionCourseScope` + `sqlSubmissionSessionFilter(session, courseId)` (alias `cps`). Student function has no `OR session IS NULL`. | Live list still `{ECE2202:102, NULL:65}`. |
| CP4 | Student loader flags use `opts.studentDbId` only. | Live still query-id flags. |
| CP5 | `expectAuthRejected` fails 200/201/404/500. No `pending deploy`. No `approveAll`. | Script now honest; live will FAIL until deploy. |
| CP6 | `StudentSearchToolbar` default dock; `CollabSearch` gone. | Client-only; ships with the Expo build. |
| CP7 | Missing/pending derived from the same active+scoped `submissions` query. | Live missing dump still includes expired 167. |
| CP9 | Contract + redact unit tests as above. | n/a |

Do **not** mark READY. Deploy v0, then re-run `npm run audit:classroom-points-production`. Residual (not probed): authenticated upload still looks up assignment by id without a course membership check.

---

## Required Before Ship

1. Deploy v0 Classroom Points patches (CP1–CP4, CP2 upload bind).
2. Re-probe production: student submissions must have **zero** `expected_answer`; unauth/header-only upload must **401**; student list must not include foreign `session IS NULL` rows.
3. `audit:classroom-points-production` must pass without treating 200 as deploy-pending.

Faculty 401s and the 170 create/submit/delete cycle are not enough while live keys still leak.

---

## Future Improvements

FlashList; Cora confirm; hide expired tasks consistently between list and upload SQL.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 88 |
| UI | 78 |
| Buttons | 80 |
| API | 52 |
| CRUD | 82 |
| Authentication | 74 |
| Authorization | 62 |
| Student Isolation | 58 |
| Course Isolation | 38 |
| Membership | 88 |
| Production Configuration | 90 |
| Data Integrity | 78 |
| Security | 28 |
| Assessment Security | 18 |
| Cora Security | 55 |
| Error Handling | 72 |
| Mobile UX | 70 |
| Performance | 52 |
| Accessibility | 76 |
| Testing | 28 |

OVERALL SCORE: 58/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE

Audited at: 2026-08-18T03:40:00.000Z

Commit: `dba7f46`

Dependencies recorded: instructor-api, rewards-api, FacultyClassroomPointsScreen, ClassroomPointsScreen, classroom-points-request-auth, requireBoundStudentCaller, api/classroom-points*, solution-upload
