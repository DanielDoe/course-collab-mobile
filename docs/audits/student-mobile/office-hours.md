# Office Hours — Student Mobile Production Audit

```
MODULE: Office Hours
STUDENT ROUTE: /module/office-hours
NAVIGATION GROUP: Course Info. student-nav id office-hours, label Office Hours, icon cafe-outline. No minTier.
FACULTY ROUTE: /module/office-hours
FACULTY NAVIGATION GROUP: Students. faculty-nav id office-hours, badgeKey officeHours.
REGISTRY ENTRY: faculty-registry office-hours → FacultyOfficeHoursScreen; student registry office-hours → OfficeHoursModuleScreen → OfficeHoursScreen
PRIMARY SCREEN: expo/src/components/faculty/FacultyOfficeHoursScreen.tsx
RELATED SCREENS:
  - FacultyOfficeHoursListCards.tsx
  - FacultyOfficeHoursActionSheet.tsx
  - FacultyOfficeHourCreateModal.tsx
  - FacultyRegularOfficeHoursSheet.tsx
  - Student: course-info/OfficeHoursScreen.tsx
SUBROUTES: none
API ROUTES (faculty):
  GET/POST /api/instructor/office-hours
  PATCH /api/instructor/office-hours/:id
  GET/POST /api/instructor/office-hours/regular
API ROUTES (student):
  GET/POST /api/student/office-hours
  PATCH/DELETE /api/student/office-hours/:id
SERVICES: instructor-api.ts createOfficeHourOnBehalf / getOfficeHours / updateOfficeHourRequest / regular hours; student-api.ts getOfficeHours / createOfficeHours; course-info-api
DATABASE MODELS: office_hour_requests, office_hour_attachments, office_hour_preferred_dates, regular_office_hours
MEMBERSHIP: Unlocked. Intended.
CORA INTEGRATION: faculty officeHours.manageAvailability/approve/decline/createMeeting (notes: stay in UI). Student book/cancel confirm. Live Cora UNVERIFIED.
FACULTY DEPENDENCY: Faculty Expo is the inbox + regular hours + create-on-behalf. Student create lands in faculty list; faculty approve/decline updates student status.
ADMIN DEPENDENCY: none for the mobile module. /api/setup/office-hours is adjacent DDL (GET 405).
WEB DEPENDENCY: /student/dashboard-v2/office-hours
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `9ea5c31`  
Production API: `https://coursecollab.vercel.app`

Scope is Faculty Expo/mobile plus backend and student request create/list.

Execution: Alex ECE `910000001` / db `722`, Jordan `910000002` / db `723`, ELEG Alex `910100001` / db `734`, faculty `mchen` / `15`, course `16`. Simulator **UNVERIFIED**.

Disposable **7** (Alex cookie create) and **8** (faculty cookie on-behalf) titled `AUDIT-DELETE*`. Unauth DELETE removed **7**. Cookie DELETE removed **8**. Did **not** POST regular hours with slots (would replace the weekly schedule). Did **not** PATCH live non-AUDIT ids. Did **not** POST `/api/setup/office-hours`.

Prior faculty report claimed READY **86** and F-001–F-007/F-009 **Fixed**. `audit-office-hours-production.mjs` treats 200/400/405/500 as `pending deploy` PASS and treats header-only faculty IDOR as 403 without a session. **Rejected.** Faculty status set to `REVALIDATION_REQUIRED`.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **58/100**  
Blockers: 0  
Critical: 1  
High: 1  
Medium: 1  
Low: 3

Student GET/POST/PATCH and all faculty office-hours routes are **session-bound on production**: unauth and header-only **401**. Alex cookie list **200** n=0 then saw create **7**. Alex cookie + Jordan header **403**. Faculty cookie course **16** **200**; course **1** **403**. Faculty cookie create-on-behalf **8** → Alex list; ELEG student on ECE **403**; course 1 POST **403**. Faculty PATCH approve on **8** **200**. Faculty search already docks (`FacultySearchToolbar` default `placement="dock"`).

**Student DELETE is an open write.** Unauth `DELETE /api/student/office-hours/7?studentId=722` returned **200** `{success:true}` and removed the live AUDIT row. Unauth DELETE without `studentId` is **400**; unauth DELETE of a fake id is **404**. The handler never calls `requireBoundStudentCaller` (unlike PATCH in the same file). Anyone who knows a request id and a student db/roster id can cancel that student’s request.

---

## Architecture

Faculty Drawer "Office Hours"
→ `/module/office-hours`
→ `FacultyOfficeHoursScreen` + `instructorRequest` (cookies)
→ GET/POST `/api/instructor/office-hours` (`requireInstructorCourse` live)
→ PATCH `/api/instructor/office-hours/:id` (session + course scope live)
→ GET/POST `/api/instructor/office-hours/regular` (session live)

Student Drawer "Office Hours"
→ `/module/office-hours`
→ `OfficeHoursScreen` + `studentRequest` (cookies)
→ GET/POST: `requireBoundStudentCaller` (live)
→ PATCH: `requireBoundStudentCaller` (live)
→ DELETE: query `studentId` only (live **200** on id 7)

---

## Files Inspected

| Area | Path |
|------|------|
| Faculty hub | FacultyOfficeHoursScreen + create modal + action sheet + regular hours sheet |
| Student | OfficeHoursScreen |
| Client | instructor-api.ts, student-api.ts, course-info-api.ts |
| Backend | `app/api/student/office-hours/route.ts`, `[id]/route.ts`, `app/api/instructor/office-hours/**` |
| Script | `expo/scripts/audit-office-hours-production.mjs` |
| Prior | `expo/docs/audits/faculty-mobile/office-hours.md` (not trusted) |

---

## Navigation & Routing

**Status:** PASS

Faculty Students group + student Course Info. Both use `/module/office-hours`. Faculty `FACULTY_MODULE_META["office-hours"]` present. Badge `officeHours`.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`  
Development URLs: none  
Mocks: none in faculty/student office-hours clients

---

## Screens

Faculty hub ACTIVE (cookie list 200; create 8; approve 8). Regular hours GET cookie **200** n=0. Sim **UNVERIFIED**.  
Student form + list ACTIVE (cookie create 7, list saw 7). No cancel control in Expo. Search: faculty dock **PASS**; student has no search (N/A).

---

## Components

| Component | Class |
|-----------|-------|
| Faculty dock `FacultySearchToolbar` | ACTIVE |
| Create-on-behalf modal | ACTIVE (cookie POST 8) |
| Regular hours sheet | ACTIVE read; write not executed (would replace slots) |
| Approve/decline sheet | ACTIVE (PATCH 8) |
| Student request form | ACTIVE |
| Cora approve / book | PLACEHOLDER live |

---

## Buttons

| Control | Handler | Actual | Status |
|---------|---------|--------|--------|
| Faculty refresh / search | GET list + regular | unauth/header **401**; cookie 16 **200**; course 1 **403** | PASS |
| Create on behalf | POST instructor | unauth/header **401**; cookie **200** id 8 | PASS |
| Approve | PATCH | cookie **200** on 8 only | PASS E2E |
| Save regular hours | POST regular | unauth/header empty slots **401**; cookie write **not run** | PASS auth / write UNVERIFIED |
| Student submit | POST | unauth/header **401**; cookie **200** id 7 | PASS |
| Student cancel | no Expo control | API unauth DELETE **200** on 7 | FAIL (OH1) |

---

## API Routes

| Method | Route | Actual | Status |
|--------|-------|--------|--------|
| GET | student unauth / header 722 / header roster | **401** | PASS |
| POST | student unauth / header | **401** | PASS |
| PATCH | student unauth fake 999991 | **401** | PASS |
| DELETE | student unauth no studentId | **400** studentId required | FAIL (OH1) |
| DELETE | student unauth fake 999991 + 722 | **404** | FAIL (OH1) |
| DELETE | student unauth id **7** + 722 | **200** `{success:true}` | FAIL (OH1) |
| GET | student Alex cookie | **200** n=0 then saw 7 | PASS |
| GET | Alex cookie + Jordan header | **403** | PASS |
| GET | Jordan / ELEG cookie | **200** n=0 | PASS |
| GET | Jordan cookie + Alex studentId | **403** | PASS |
| GET | faculty unauth / header 16 / header 1 | **401** | PASS |
| POST | faculty unauth / header | **401** | PASS |
| PATCH | faculty unauth / header id 1 | **401** | PASS |
| GET/POST | faculty regular unauth / header | **401** | PASS |
| GET | faculty cookie 16 | **200** n=0 then saw 7 | PASS |
| GET | faculty cookie course 1 | **403** | PASS |
| GET | faculty cookie, no x-course-id | **400** missing course | PARTIAL (session present; course header required) |
| POST | faculty cookie on-behalf 722 | **200** id 8 | PASS E2E |
| POST | faculty cookie course 1 | **403** | PASS |
| POST | faculty cookie ELEG 734 on ECE | **403** Student is not in this course | PASS |
| PATCH | faculty cookie id 8 approve | **200** | PASS E2E |
| GET | `/api/setup/office-hours` | **405** | INFO (POST not run) |

---

## CRUD

| Op | Executed | Status |
|----|----------|--------|
| Student create 7 | Yes cookie | PASS |
| Faculty create-on-behalf 8 | Yes cookie | PASS |
| Faculty list sees 7 | Yes | PASS |
| Student list sees 7 and 8 | Yes | PASS |
| Faculty approve 8 | Yes | PASS |
| Unauth delete 7 | Yes | FAIL auth |
| Cookie delete 8 | Yes | PASS cleanup / API exists |

---

## Authentication

Student GET/POST/PATCH **PASS**. Faculty list/create/PATCH/regular **PASS**. Student DELETE **FAIL**.

---

## Student Authorization

Student cannot faculty-POST without instructor session (**401**). Student cannot spoof list (**403**). Unauthenticated caller **can** DELETE another student’s request when `studentId` matches the row owner.

---

## Cross-Student Isolation

List: **PASS**. Create-on-behalf of ELEG on ECE: **403**. DELETE: **FAIL** (no session).

---

## Course / Section Isolation

Faculty course 1 GET/POST **403**. Student ELEG list does not see ECE 7/8 (ELEG listed before create was n=0; Jordan claiming Alex **403**). PASS for session paths.

---

## Membership

Unlocked. PASS.

---

## Security

Open student DELETE is CRITICAL. Other office-hours routes are closed on production. Dishonest audit script would green-light the hole.

---

## Assessment Security

N/A.

---

## Cora Security

Faculty capabilities listed; notes say stay in UI. Student book/cancel confirm. Live **UNVERIFIED**. PARTIAL.

---

## Database Integrity

7 created then unauth-deleted. 8 created, approved, cookie-deleted. No leftover AUDIT rows from this run.

---

## Faculty → Student Integration

**Executed.** Alex cookie create 7 → faculty cookie list contained 7. Faculty cookie on-behalf 8 → Alex list contained 8 → approve **200**.

---

## Tests

`audit-office-hours-production.mjs` `expectDenied` PASSes 200/400/405/500 as pending deploy. No office-hours contract tests.

---

## Findings

| ID | Sev | Finding | Evidence | Fix |
|----|-----|---------|----------|-----|
| OH1 | CRITICAL | Student DELETE uses query `studentId` only. No session helper. | Unauth DELETE **7** `?studentId=722` **200**. Unauth no id **400**. Unauth fake **404**. Source `[id]/route.ts` DELETE L95–117. PATCH in the same file already binds. | `requireBoundStudentCaller` before lookup. Use `bound.studentDbId`. Unauth/header-only **401**. Mismatched claim **403**. |
| OH2 | HIGH | Production script treats 200/400/500 as PASS. | `audit-office-hours-production.mjs` L37–46 `pending deploy`. Header-only faculty IDOR expected 403 without a cookie. | `expectAuthRejected` fail 200/201/400/404/500. Cookie E2E only. AUDIT-DELETE + finally. Probe DELETE. |
| OH3 | MEDIUM | No auth contract tests. | No `office-hours-auth.contract.test.ts` in v0 or Expo. | Source contracts: DELETE binds before SQL; script has `expectAuthRejected` and no `pending deploy`. |
| OH4 | LOW | Cora registry only. | faculty/student registries | Keep confirm; no unauth approve. |
| OH5 | LOW | Student Expo has no cancel. | OfficeHoursScreen list is read-only | Optional after OH1. Not a substitute for API bind. |
| OH6 | LOW | Prior READY 86 invalid. | faculty status + dishonest script | REVALIDATION_REQUIRED. |

Not findings (measured closed — do not “fix”):

- Student GET/POST/PATCH live **401** without session.
- Faculty GET/POST/PATCH/regular live **401** without session; cookie course 1 **403**.
- Faculty search already docks.
- Regular hours cookie write not executed; do not POST slots.

---

## Local repairs (source verified — production unpatched)

Parent re-read every changed file. Student GET/POST, PATCH, and all faculty office-hours handlers were left unchanged. Honest script run 2026-08-18: **26/31**. Unauth DELETE still **400/404**; cookie create **9** then unauth DELETE **200**; cookie `finally` deleted **9**.

```
cd v0-coursecollabv3 && npx tsx --test lib/office-hours-auth.contract.test.ts
→ 2 pass / 0 fail

cd expo && npx tsx --test src/lib/office-hours-auth.contract.test.ts
→ 3 pass / 0 fail
```

| ID | Local source | Production |
|----|--------------|------------|
| OH1 | DELETE calls `requireBoundStudentCaller` then owner 404; uses `bound.studentDbId` | Unauth DELETE fake **400/404**; unauth DELETE **9** **200** |
| OH2 | `expectAuthRejected` fails 200/400/404; AUDIT-DELETE + finally | Script now **fails** those cases (26/31) |
| OH3 | v0 + Expo contract tests | n/a |

OH4–OH6 left as documented. Do **not** mark READY.

---

## Required Before Ship

1. Bind student DELETE (OH1) and deploy v0.
2. Re-probe: unauth/header-only DELETE of a fake id and of a new AUDIT row must **401**, not 200/400/404.
3. `audit:office-hours-production` must fail those cases until deploy, then pass without treating 200 as PASS.

Cookie create/approve on 7/8 is not enough while DELETE is open.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 92 |
| Routing | 90 |
| UI | 78 |
| Buttons | 80 |
| API | 62 |
| CRUD | 70 |
| Authentication | 48 |
| Authorization | 72 |
| Student Isolation | 40 |
| Course Isolation | 88 |
| Membership | 90 |
| Production Configuration | 92 |
| Data Integrity | 62 |
| Security | 28 |
| Assessment Security | 80 |
| Cora Security | 55 |
| Error Handling | 76 |
| Mobile UX | 80 |
| Performance | 80 |
| Accessibility | 74 |
| Testing | 24 |

OVERALL SCORE: 58/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE

Audited at: 2026-08-18T04:10:00.000Z  
Commit: `9ea5c31`
