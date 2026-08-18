# Announcements — Student Mobile Production Audit

```
MODULE: Announcements
STUDENT ROUTE: /announcements (file route expo/app/(app)/announcements.tsx). Detail /announcements/[id]
NAVIGATION GROUP: Course Info. student-nav id announcements, icon megaphone-outline. No minTier.
FACULTY ROUTE: /module/announcements
FACULTY NAVIGATION GROUP: Course. faculty-nav id announcements.
REGISTRY ENTRY: faculty-registry announcements → FacultyAnnouncementsScreen; student registry announcements → AnnouncementsModuleScreen; dedicated file route also mounts AnnouncementsScreen
PRIMARY SCREEN: expo/src/components/faculty/FacultyAnnouncementsScreen.tsx
RELATED SCREENS:
  - FacultyAnnouncementComposer.tsx, FacultyAnnouncementDetailModal.tsx, FacultyAnnouncementCard.tsx
  - Student: AnnouncementsScreen.tsx, AnnouncementDetailScreen.tsx, AnnouncementBodyWebView.tsx
SUBROUTES: /announcements/[id]
API ROUTES (faculty):
  GET/POST /api/announcements
  GET/PUT/DELETE /api/announcements/:id
  POST /api/announcements/upload
  GET /api/announcements/:id/view (stats)
API ROUTES (student):
  GET /api/announcements?studentId=
  GET /api/announcements/:id?studentId=
  POST /api/announcements/:id/view
  POST /api/announcements/:id/react
  GET/POST /api/announcements/:id/comments
SERVICES: instructor-api.ts L1791–1855; student-api.ts L524–567; course-info-api
DATABASE MODELS: announcements, announcement_views, announcement_reactions, announcement_comments
MEMBERSHIP: Unlocked. Intended. student_content_locked redacts body when set.
CORA INTEGRATION: faculty announcement.create/publish (confirm). Student denied create_instructor_announcements. Live Cora UNVERIFIED.
FACULTY DEPENDENCY: Faculty Expo is the publish surface. Create → student feed; pin; delete hides.
ADMIN DEPENDENCY: none
WEB DEPENDENCY: faculty/student dashboard announcements
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Scope is Faculty Expo/mobile plus backend and student feed/detail/react/comment.

Execution: Alex ECE `910000001` / db `722`, Jordan `910000002` / db `723`, ELEG Alex `910100001` / db `734`, faculty `mchen` / `15`, course `16`. Simulator **UNVERIFIED**.

Disposable **146** (header-only create) and **147** (cookie create) titled `AUDIT-DELETE*` — both deleted. Unauth comment **3** on 147 (Alex Rivera) deleted with the row. Accidental unauth view + like on live announcement **1** — like toggled off; view row may remain.

Prior faculty report claimed READY **91**. `audit-announcements-production.mjs` treats header-only as login and **400** missing identity as PASS. **Rejected.** Faculty status set to `REVALIDATION_REQUIRED`.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **51/100**  
Blockers: 0  
Critical: 2  
High: 4  
Medium: 1  
Low: 3

Student **list** is session-bound on production: unauth/header **401**; Alex cookie **200** (13 ECE rows); Jordan cookie + Alex header **403**. ELEG cookie does not see ECE **147**. Faculty cookie create **147** → Alex feed → delete hidden. Student search is already docked.

**Faculty writes and most student detail actions trust headers/body ids.** Header-only `x-instructor-id: 15` listed 12 live announcements and **POST 201 id 146**. Header-only student `GET :id` **200** (full title). Unauth `POST view` on id **1** recorded a view; unauth `POST react` added a like (removed). Unauth `POST comments` on 147 created comment 3 as Alex Rivera; unauth `GET comments` returned that name. Upload without session is 401; header-only upload reached the handler (**500** missing multipart, not 401).

---

## Architecture

Faculty Drawer "Announcements"
→ `/module/announcements`
→ `FacultyAnnouncementsScreen` + `instructorRequest` (cookies)
→ GET/POST/PUT/DELETE `/api/announcements` (server uses header id, not session)

Student Drawer "Announcements"
→ `/announcements`
→ `AnnouncementsScreen` + `studentRequest` (cookies)
→ list: `requireBoundStudentCaller` (live)
→ detail/view/react/comments: header/body `studentId` (live)

---

## Files Inspected

| Area | Path |
|------|------|
| Faculty hub | FacultyAnnouncementsScreen + composer + detail modal |
| Student | AnnouncementsScreen, AnnouncementDetailScreen |
| Client | instructor-api.ts, student-api.ts |
| Backend | `app/api/announcements/**`, `announcement-request-auth.ts` |
| Script | `expo/scripts/audit-announcements-production.mjs` |
| Prior | `expo/docs/audits/faculty-mobile/announcements.md` (not trusted) |

---

## Navigation & Routing

**Status:** PASS

Faculty Course group + student Course Info. Student file route `/announcements` + `/announcements/[id]`. Faculty `/module/announcements`. Missing course empty state on faculty hub.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`  
Development URLs: none  
Mocks: none in faculty utils

---

## Screens

Faculty hub ACTIVE (cookie list 200). Composer/detail ACTIVE (147 E2E). Sim **UNVERIFIED**.  
Student list ACTIVE. Detail ACTIVE (GET 133 + 147). Search dock **PASS**.

---

## Components

| Component | Class |
|-----------|-------|
| Faculty dock `FacultySearchToolbar` | ACTIVE |
| Composer / detail modal | ACTIVE |
| Student `StudentSearchToolbar` default dock | ACTIVE |
| Cora publish | PLACEHOLDER live |

---

## Buttons

| Control | Handler | Actual | Status |
|---------|---------|--------|--------|
| Faculty refresh / search / filter | GET list | header 200; cookie 200; unauth 400 | PARTIAL (header=login) |
| Compose / publish | POST | header **201** 146; cookie **201** 147 | FAIL auth / PASS cookie E2E |
| Pin | PUT | header 147 pinned **200** | FAIL auth |
| Delete | DELETE | cookie 147 **200**; header 146 **200** | FAIL auth / PASS hide |
| Student open row | `/announcements/[id]` | GET :id header 200 | FAIL auth |
| View / react / comment | POST | unauth **200/201** | FAIL |

---

## API Routes

| Method | Route | Actual | Status |
|--------|-------|--------|--------|
| GET | `/api/announcements` unauth | **400** missing id | FAIL as auth (not 401) |
| GET | student list unauth / header | **401** | PASS |
| GET | student list Alex cookie | **200** n=13 | PASS |
| GET | Alex cookie + Jordan header | **403** | PASS |
| GET | Jordan cookie + Alex header | **403** | PASS |
| GET | ELEG cookie list | **200** n=0, no 147 | PASS course |
| GET | faculty header-only course 16 | **200** n=12 live titles | FAIL (AN1) |
| GET | faculty header / cookie course 1 | **403** | PASS ownership |
| GET | faculty cookie, no x-instructor-id | **400** | FAIL (session ignored) |
| POST | unauth | **401** | PASS |
| POST | header-only | **201** id 146 | FAIL (AN1) |
| POST | faculty cookie | **201** id 147 | PASS E2E |
| GET | `:id` unauth | **401** | PASS |
| GET | `:id` header student | **200** | FAIL (AN2) |
| GET | `:id` ELEG cookie/header for 147 | **404** | PASS course |
| PUT/DELETE | unauth | **401** | PASS |
| PUT/DELETE | header-only | **200** / 404 fake | FAIL (AN1) |
| POST | `:id/view` unauth body 722 | **200** recorded | FAIL (AN3) |
| POST | `:id/react` unauth | **200** like | FAIL (AN3) |
| POST | `:id/comments` unauth | **201** id 3 Alex Rivera | FAIL (AN3) |
| GET | `:id/comments` unauth | **200** + name | FAIL (AN4) |
| POST | upload unauth | **401** | PASS |
| POST | upload header-only | **500** handler | FAIL (AN5) |

---

## CRUD

| Op | Executed | Status |
|----|----------|--------|
| Create 146 header / 147 cookie | Yes | FAIL auth / PASS cookie |
| Read faculty + student | Yes | PARTIAL |
| Pin 147 header | Yes | FAIL auth |
| Delete 146/147 | Yes hidden | PASS hide / FAIL auth |
| Comment 3 | Yes then deleted | FAIL auth |

---

## Authentication

Student **list** PASS. Faculty list/write FAIL (header). Student GET :id / view / react / comment FAIL.

---

## Student Authorization

Student cannot faculty-POST without instructor header (401). Student cannot spoof list (403). Student **can** GET :id and write view/react/comment with only a claimed `studentId`.

---

## Cross-Student Isolation

List: **PASS**. GET :id: Jordan+Alex header **200** (same course content; no session). Writes: unauth as 722 **PASS as attack**.

---

## Course / Section Isolation

ELEG does not see ECE 147. Faculty course 1 **403**. PASS for those paths.

---

## Membership

Unlocked. PASS. Locked-content redact **UNVERIFIED** live (no locked row in this run).

---

## Security

Open faculty header CRUD and unauth engagement writes are CRITICAL/HIGH. List student session bind holds.

---

## Assessment Security

N/A.

---

## Cora Security

Faculty publish high-risk, confirm. Live **UNVERIFIED**. PARTIAL.

---

## Database Integrity

147 create → Alex list → delete gone. 146 header create/delete. Comment 3 written unauth. View on id 1 may remain.

---

## Faculty → Student Integration

**Executed.** Cookie publish 147 → Alex saw it → delete hidden. Header publish also reached students (146) — that is the vulnerability.

---

## Tests

`audit-announcements-production.mjs` uses header-only as auth and PASSes 400. `faculty-announcement-utils.test.ts` is filter-only.

---

## Findings

| ID | Sev | Finding | Evidence | Fix |
|----|-----|---------|----------|-----|
| AN1 | CRITICAL | Faculty list/create/update/delete treat `x-instructor-id` as login. No `requireInstructorSession`. | Header list **200** 12 titles; header POST **201** 146; header PUT pin 147; cookie without header **400**. | `requireInstructorCourse` on faculty GET/POST/PUT/DELETE. 401 header-only. |
| AN2 | CRITICAL | GET `:id` accepts header/query student or instructor id with no session. | Unauth 401; header student **200** “Final grades posted”; header faculty 147 **200**. | Student: `requireBoundStudentCaller`. Faculty: `requireInstructorSession` + course access. |
| AN3 | HIGH | view / react / comment POST use body `studentId` only. | Unauth view 1 **200**; react **200**; comment 147 **201** as Alex. | `requireBoundStudentCaller` before write. |
| AN4 | HIGH | GET comments is public. | Unauth GET 147 comments **200** `student_name: Alex Rivera`. | Session + course membership. |
| AN5 | HIGH | Upload `requireInstructorOrTaCourse` is header-only. | Unauth 401; header **500** (handler). | `requireInstructorCourse`. |
| AN6 | HIGH | Production script treats header-only as auth and 400 as PASS. | `audit-announcements-production.mjs` L41–64, L175. | Fail 200/201/400/404 on unauth/header-only. Cookie E2E only. AUDIT-DELETE + finally. |
| AN7 | MEDIUM | Faculty cookie is not identity. | Cookie-only list **400**. | Same as AN1. |
| AN8 | LOW | Cora registry only. | faculty/student registries | Keep confirm; no unauth publish. |
| AN9 | LOW | No auth contract tests. | — | Source contracts. |
| AN10 | LOW | Prior READY 91 invalid. | faculty status | REVALIDATION_REQUIRED. |

---

## Local repairs (source verified — production unpatched)

Parent re-read every changed file. Faculty upload client still sent header-only after the fixer; parent wired `instructorAuthenticatedHeaders` (no JSON Content-Type) so composer upload will not 401 after deploy.

```
cd v0-coursecollabv3 && npx tsx --test lib/announcement-auth.contract.test.ts
→ 5 pass / 0 fail

cd expo && npx tsx --test src/lib/announcement-auth.contract.test.ts
→ 2 pass / 0 fail
```

| ID | Local source | Production |
|----|--------------|------------|
| AN1 | Faculty GET/POST/PUT/DELETE use `requireInstructorCourse`; create uses `scope.instructorId` | Header list/POST still 200/201 |
| AN2 | GET `:id` student `requireBoundStudentCaller`; faculty `requireInstructorSession` | Header GET :id still 200 |
| AN3 | view/react/comment POST bind before SQL | Unauth view/react/comment still 200/201 |
| AN4 | comments GET session + course visibility | Unauth comments GET still 200 |
| AN5 | upload `requireInstructorCourse` + client session headers | Header upload still reaches handler |
| AN6 | Honest script; 400/200 fail | Will FAIL until v0 deploy |
| AN9 | Contract tests as above | n/a |

Student list left as live 401. Residual: `comments/[commentId]` DELETE still header-only (not in measured set). Accidental view on live id **1** may remain.

Do **not** mark READY.

---

## Required Before Ship

1. Deploy v0 announcement session bind (AN1–AN5).
2. Re-probe: header-only faculty list/create and student GET `:id` / view / react / comments must **401**.
3. `audit:announcements-production` must pass without header-only 200.

Student list 401s and the 147 cookie cycle are not enough.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 88 |
| UI | 80 |
| Buttons | 70 |
| API | 38 |
| CRUD | 45 |
| Authentication | 42 |
| Authorization | 40 |
| Student Isolation | 55 |
| Course Isolation | 78 |
| Membership | 88 |
| Production Configuration | 90 |
| Data Integrity | 48 |
| Security | 22 |
| Assessment Security | 80 |
| Cora Security | 55 |
| Error Handling | 72 |
| Mobile UX | 82 |
| Performance | 78 |
| Accessibility | 74 |
| Testing | 22 |

OVERALL SCORE: 51/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE

Audited at: 2026-08-18T04:00:00.000Z  
Commit: `dba7f46`
