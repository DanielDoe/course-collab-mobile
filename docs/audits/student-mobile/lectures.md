# Lectures — Student Mobile Production Audit

```
MODULE: Lectures
STUDENT ROUTE: /module/lectures
NAVIGATION GROUP: Learning Center. student-nav id lectures, label Lectures, icon easel-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS.lectures → LecturesModuleScreen → LecturesScreen
PRIMARY SCREEN: LecturesScreen in expo/src/components/lectures/LecturesScreen.tsx
RELATED SCREENS: StudentLectureViewerScreen, StudentLectureWorkspaceScreen, StudentLectureSamplePracticeScreen, StudentLectureToolsSheet, LectureListCard. Faculty Manage Lectures is downstream only (not this audit’s UI).
SUBROUTES: /lecture/[week] (viewer), /lecture/[week]/workspace, /lecture/[week]/sample-practice. Params: week + lectureId.
API ROUTES:
  GET /api/student/lectures
  GET /api/student/lectures/:id
  GET /api/student/lectures/:id/viewer (bundle: lecture + practice + workspace + signed deckUrl)
  GET /api/student/lectures/:id/deck (signed/expiring PDF proxy)
  GET /api/student/lectures/:id/content
  GET /api/student/lectures/:id/workspace (+ PATCH drafts)
  GET /api/student/lectures/:id/sample-practice (+ POST evaluate)
  GET|POST /api/student/lectures/:id/progress
  POST /api/student/lectures/:id/ai-assistant
  GET /api/instructor/lectures (faculty → student + escalation)
  GET|POST /api/lectures (legacy public catalog)
  GET /api/lectures/by-week/:week
SERVICES: expo/src/lib/student-api.ts (getLectures / getLectureById / content / workspace / progress), student-lecture-api.ts, lecture-deck-url.ts
DATABASE MODELS: UNVERIFIED directly. Inferred: lectures, lecture_slides, lecture_student_progress, lecture_workspace_drafts, lecture_sample_practice_attempts, lecture_session_access
MEMBERSHIP: All tiers. No minTier. Live review student: Scholar
CORA INTEGRATION: none on list/viewer tools. Separate lecture AI-assistant API exists (body studentId, no session)
FACULTY DEPENDENCY: instructor publish / slides / sample practice / workspace. Faculty Expo Manage Lectures is the upstream writer.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: student-nav remaps lectures → /student/dashboard-v2/lectures; workspace client matches web query-id + cookies
```

Size: LARGE (list, viewer, workspace, sample practice, tools, progress, faculty downstream)  
Audited: 2026-08-17  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`  
Manifest: `docs/audits/student-mobile/lectures/manifest.json`

Invocation named **student-mobile-module-audit** / **Lectures**. The “Faculty Expo only” scope line is treated as faculty → student lecture downstream only. This is **not** a faculty Manage Lectures audit.

Execution: production HTTPS probes with review accounts (Alex ECE `910000001` / db `722`, Jordan ECE `910000002`, Alex ELEG `910100001`, faculty `mchen` / instructor `15`, course `16`). Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE** (production still unpatched)  
Score: **38/100** on production · local repairs ready to deploy  
Blockers: 0  
Critical: 5 on production (L1–L5 repaired locally, not re-proved)  
High: 2  
Medium: 3  
Low: 2

The student Lectures module is reachable, points at production HTTPS, and the ECE review roster can list eight published faculty decks. Search docks correctly. Viewer / tools / workspace / sample-practice routes exist.

**Local web + Expo repairs** now require session proof on student lecture APIs, bind progress writes to the caller, strip sample-practice answers from list/detail, lock unauthenticated `GET|POST /api/lectures` and by-week, and refuse faculty header-only lecture CRUD. The lecture client fails closed without cookies / MFA trust / `x-cc-refresh`.

**Production `https://coursecollab.vercel.app` still treats a roster id as a login.** Until the web API is deployed and IDOR is re-proved, this module cannot ship. App Review still shows forged completed progress on lectures 98 (Alex) and 99 (Jordan) until those rows are reset.

---

## Architecture

Student Drawer (`Learning Center` → Lectures)  
→ `/module/lectures`  
→ `registry.tsx` `lectures`  
→ `LecturesScreen`  
→ search dock + filter sheet + `LectureListCard`  
→ `/lecture/[week]?lectureId=`  
→ `StudentLectureViewerScreen` (WebView deck + tools sheet)  
→ workspace / sample-practice full pages  
→ `studentApi` + `student-lecture-api` (session proof required locally; query `studentId` is a claim only)  
→ production lecture tables  
→ local server binds `requireStudentLectureCaller` / instructor session; production still treats roster `studentId` as identity  
→ faculty publish via `/api/instructor/lectures` (local: instructor session; production: header course scope)

---

## Files Inspected

- `expo/src/constants/student-nav.ts`
- `expo/src/modules/registry.tsx`, `native-screens.tsx`
- `expo/src/components/lectures/*`
- `expo/app/(app)/lecture/[week]/{index,workspace,sample-practice}.tsx`
- `expo/src/lib/student-api.ts`, `student-lecture-api.ts`, `lecture-deck-url.ts`
- `v0-coursecollabv3/app/api/student/lectures/**`
- `v0-coursecollabv3/app/api/instructor/lectures/route.ts`
- `v0-coursecollabv3/app/api/lectures/route.ts`, `lectures/by-week/[week]/route.ts`
- `v0-coursecollabv3/lib/student-lecture-access.ts`, `lecture-sample-practice.ts`, `instructor-course-scope.ts`
- `expo/src/config/api.ts`

---

## Navigation & Routing

Drawer label **Lectures**, Learning Center, `/module/lectures`, no membership lock. Registry resolves `LecturesScreen`, not a faculty screen.

Subroutes: `/lecture/[week]`, `/workspace`, `/sample-practice`. Invalid `week` / `lectureId` render an empty grouped view (no error copy). Deep link to a locked card is still an API-accessible lecture if published. System Back on viewer uses `router.back()` (module-deep-test notes in-app Back). Search toolbar default `placement="dock"`.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app` via `resolveApiBaseUrl()` / `PRODUCTION_API_BASE_URL`.  
Development URLs: none in lecture screens/clients.  
Mock dependencies: none observed.  
Deck files: public Vercel Blob HTTPS URLs (no signed expiry).

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| LecturesScreen | List, search, filter, open viewer | ACTIVE |
| StudentLectureViewerScreen | Slides WebView, tools, progress bump | ACTIVE |
| StudentLectureWorkspaceScreen | Workspace questions / web tool | ACTIVE |
| StudentLectureSamplePracticeScreen | Practice drills | ACTIVE |
| StudentLectureToolsSheet | Practice / workspace / download / open | ACTIVE |
| LectureListCard | Row + status | ACTIVE |
| Faculty lecture screens | Upstream only | N/A this audit |

Loading / error / empty exist on list and viewer. Empty filter copy: “No matching lectures” vs “No lectures posted”. Theme / dark mode: **UNVERIFIED** (no simulator this run).

---

## Components

ACTIVE: list card, docked search, filter sheet, slide toolbar, tools sheet, workspace panel, sample-practice panel, WebView, web-tool modal, prepare gate.  
DEAD / PLACEHOLDER: none found (`TODO`/`Coming Soon` not in lecture screens).  
LEGACY: `GET /api/lectures` and `/api/lectures/by-week` still live and public; mobile student client does not call them.

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Lecture row | List | `openLectureViewer` | GET student lectures/:id + content | Open slides | Code-traced; API returns lecture | PASS (code + API) |
| Search / filter | List | local filter | none | Filter list | Client-side only | PASS |
| Tools | Viewer | open sheet | none | Sheet | Code-traced | PASS |
| Sample Practice | Tools | push sample-practice | GET sample-practice | Open drills | Dedicated GET strips answers; list already leaked them | PARTIAL |
| Workspace | Tools | push workspace | GET workspace | Open workspace | 200, enabled, 0 questions on lecture 98 | PASS / empty |
| Download / Open externally | Tools | `Linking.openURL` | public blob | Open PDF | Public URL, header-only deck source | FAIL (auth) |
| Back | Viewer toolbar | `router.back` | none | Pop | Code-traced | UNVERIFIED sim |
| Progress bump | Viewer load | `updateLectureProgress` | POST progress | Save view | Unauth POST forges completion | FAIL |

Rapid tap / simulator Pressable pass: **UNVERIFIED**.

---

## Menus / Action Sheets

Tools sheet: Sample Practice, Workspace, Download slides, Open externally. All wired. No unfinished “Coming Soon” actions.

---

## Modals

Tools sheet (`pageSheet`), filter sheet, web-tool modal. Second-open state reset: **UNVERIFIED** on device. Android back: `onRequestClose` present on tools sheet.

---

## Forms

No create-lecture form on student. Workspace drafts PATCH and sample-practice evaluate take `studentId` in query/body. Server validation of question ids exists; **session identity does not**.

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/student/lectures` | `getLectures` | Query `studentId` only | Course via roster row | none | Yes if id honest | **FAIL auth** |
| GET | `/api/student/lectures/:id` | `getLectureById` | Query `studentId` | `isLectureAccessibleToStudent` | none | ECE vs ELEG 404 | **FAIL auth**; scope OK |
| GET | `.../content` | `getLectureContent` | Query `studentId` | same | none | same | **FAIL auth** |
| GET | `.../workspace` | lecture-api / studentApi | Query `studentId` | same | none | same | **FAIL auth** |
| PATCH | `.../workspace` | drafts | Body `studentId` | same | none | same | **FAIL auth** |
| GET | `.../sample-practice` | studentApi | Query `studentId` | same; strips answers | none | same | **FAIL auth**; strip OK |
| POST | `.../progress` | `updateLectureProgress` | Body `student_id` **no session check** | none | none | none | **FAIL** |
| GET | `/api/instructor/lectures` | faculty client; student can call | `x-instructor-id` + `x-course-id` | instructor owns course | none | course header | **FAIL session** |
| POST/DELETE | `/api/instructor/lectures` | faculty | same headers | same | none | same | **FAIL** (POST 200 created 110) |
| GET | `/api/lectures` | unused by mobile | **none** | none | none | **all published** | **FAIL** |
| POST | `/api/lectures` | unused by mobile | **none** (code) | none | none | none | **FAIL** (not executed) |
| GET | `/api/lectures/by-week/1` | unused by mobile | none | none | none | first match | **FAIL** |

---

## CRUD

Student is read-only for lecture records. Writes: progress, workspace drafts, sample-practice attempts. Progress write is unauthenticated and can set `completed` / 100%. Faculty create/delete is header-only on production.

---

## Authentication

| Probe | Result |
|-------|--------|
| GET list, no studentId | 400 Student ID required |
| GET list, query `studentId=910000001`, no cookie | **200**, 8 ECE lectures |
| GET list, `x-student-id: 722` only | 400 (query required; header ignored) |
| GET detail/content/workspace/SP/progress, query only | **200** |
| POST progress, body `student_id` only | **200**, forged completed |
| Login cookie present | Still accepts **any** query studentId (session ignored) |
| Faculty GET/POST/DELETE, headers only | **200** |

---

## Student Authorization

Student must not publish/edit/delete lectures. Student UI does not. Production **does** allow faculty lecture POST/DELETE with only instructor/course headers — a student (or anyone) can create and delete course lectures. Legacy `POST /api/lectures` has no auth in source (not executed).

---

## Cross-Student Isolation

Alex cookie + Jordan `studentId` list: **200** (same 8 lectures; progress joined to **Jordan’s** roster id).  
Progress GET `studentId=910000002` without Jordan cookie: **200**.  
Progress POST as `910000002` without cookie: **200**, lecture 99 marked completed.  
Workspace GET with Jordan id returns Jordan’s drafts (none).  
List/detail include `sample_practice.correct_answer` and explanations for whoever’s `studentId` is sent.

---

## Course / Section Isolation

ELEG `910100001` list: **200, 8 lectures** after ECE deck copy (ids 111–118). Previously 0.  
ELEG `studentId` on ECE lecture 98: **404 Not found**.  
Course isolation **PASS** when the claimed roster id is honest. Anyone can claim an ECE roster id.

Faculty ECE list (after deleting 110): 8 published lectures, ids 98–105. Student ECE list: same 8. Downstream publish contract **PASS** for this demo course.

---

## Membership Enforcement

No lecture `minTier`. Scholar sees lectures. `?tier=Trailblazer` ignored. Server does not consult membership for lecture read. Intended.

---

## Security

Header/query identity, faculty header CRUD, and public catalog remain on **production**. Local payloads replace blob PDFs with 15-minute signed `/deck` URLs. Student + faculty lecture WebViews no longer use `originWhitelist={["*"]}`. Deck client sends session proof.

---

## Assessment Security

Sample practice is not gradebook, but answers are academic content.

- Dedicated `GET .../sample-practice`: answers **stripped** (no `correct_answer`).
- `GET /api/student/lectures` and `/:id` return `l.*` including `sample_practice.questions[].subquestions[].correct_answer` (**B**) and full `explanation` markdown.
- Public `GET /api/lectures` also contains `correct_answer`.

Client `fetchStudentLectureViewerData` prefers dedicated SP, then falls back to list/detail fields that still have keys.

---

## Cora Security

N/A on this screen. `POST /api/student/lectures/:id/ai-assistant` uses body `studentId` + lecture access helper, no session. Not exercised.

---

## Database Integrity

Progress POST derives `completed` from `current_slide` / slide count and **keeps completed forever** (`previousStatus === "completed"`). Forged 100% persists. Lecture 110 create/delete proved header-only mutation. DB not inspected directly.

---

## Files / Documents

**Production** still returns public Blob PDF URLs. **Local:** student list/detail/content/viewer/catalog replace those with HMAC-signed 15-minute `/api/student/lectures/:id/deck` URLs. The proxy streams the stored asset and never returns the blob URL. Already-leaked public blob URLs stay downloadable until re-upload.

---

## Notifications

`useNotificationModuleRefresh("lectures")` refreshes the list. Push deep-link: **UNVERIFIED**.

---

## Mobile UX

Native list + docked search matches module design. Viewer is WebView-first. Tools use faculty sheet chrome. Simulator safe-area / dark mode: **UNVERIFIED**.

---

## Theme

Tokens via `useThemedNative` / `NATIVE`. Simulator light/dark: **UNVERIFIED**.

---

## Accessibility

List cards have `accessibilityRole="button"` and status in the label. Icon-only tools button: depends on `LectureToolsToolbarButton`. Chart N/A.

---

## Errors / Loading / Empty States

List: spinner, error string, empty titles. Viewer: loading, error empty-state, no-deck CTA. Invalid week/lectureId: `LectureInvalidRoute`. Offline: **UNVERIFIED**.

---

## Performance

**Local:** viewer uses one `GET .../viewer` bundle. If that route 404s (undeployed), it falls back to detail only — no list/content/practice/workspace fan-out. List is one GET. **Production** still fans out until the viewer route ships.

---

## Web / Mobile Integration

Web remap exists. Create-on-web → see-on-mobile this session: **UNVERIFIED**. Workspace client comments claim web query-id parity (no `x-student-id` on one workspace path).

---

## Faculty → Student Integration

Faculty `GET /api/instructor/lectures` (header-only) returned the same eight published ECE 2202 lectures the student list returned (98–105). ELEG student list empty — demo clone for ELEG lectures **UNVERIFIED** / missing. Did not keep a new publish (created 110 then deleted). Unpublished student 404 path **UNVERIFIED** (no unpublished ECE rows).

---

## Tests

No student lecture auth / IDOR / answer-strip tests in Expo. Faculty `audit-lectures-production.mjs` exists but is faculty-oriented. This run: live production probes only.

---

## End-to-End Results

Open Lectures → eight ECE cards → open week 1 API → content PDF URL + 8 sample-practice questions → tools routes exist. Core **read** path works for a known roster id. Isolation, auth, answer protection, and progress integrity fail.

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| No session + victim roster `studentId` | **200** lecture list + answers |
| Header-only `x-student-id` list | 400 (query required) |
| Cookie + other studentId | **200** (session ignored) |
| ELEG id + ECE lecture | 404 |
| Faculty stats as student cookie + faculty headers | **200** faculty lecture list |
| Faculty POST headers only | **200** created lecture 110 (deleted) |
| Faculty DELETE headers only | **200** |
| Unauth progress POST | **200** forged completed |
| Public `GET /api/lectures` | **200**, 32 lectures, answer keys |
| Unauth `GET /api/lectures/by-week/1` | **200** + public PDF |
| Client `tier=Trailblazer` | Ignored |
| Unpublished via student detail | UNVERIFIED (none on ECE demo) |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| L1 | CRITICAL | Auth | Student lecture APIs treat query/body `studentId` as identity on **production**. Local: `requireStudentLectureCaller`. | Unauth GET list 200, 8 ECE rows, 2026-08-17 | `app/api/student/lectures/**` | Deploy + re-prove query-only 401 |
| L2 | CRITICAL | Auth / escalation | Faculty lecture CRUD is header-only on **production**. Local: `requireInstructorSession` is identity. | POST 200 id 110; DELETE 200 | `lib/instructor-course-scope.ts` | Deploy + re-prove header-only 401 |
| L3 | CRITICAL | Isolation | Unauth progress writes any `student_id` on **production**. Local: session + caller db id. Forged 98/99 still completed. | Unauth POST 200 | progress route | Deploy + reset review progress rows |
| L4 | CRITICAL | Assessment | List/detail/`GET /api/lectures` leak answers on **production**. Local: `redactStudentLectureRecord`. | Lecture 98 `correct_answer: B` | list/detail + catalog | Deploy + confirm list JSON has no `correct_answer` |
| L5 | CRITICAL | Files / catalog | Public catalog locked locally. Student list/detail now return **signed 15-minute deck URLs** via `/deck`; raw blob URLs are stripped from student payloads. Already-leaked public blob URLs stay reachable until re-upload. | 32 rows; public PDF | `lecture-deck-signed-url.ts` | Deploy; rotate blobs later |
| L6 | HIGH | Integrity | Forged 100% stays completed. Viewer still POSTs progress on open (now session-bound locally). | Same as L3 | progress route; viewer | Reset 98/99; keep completed sticky for real completions |
| L7 | HIGH | Client | **Repaired locally.** Lecture fetches and deck source use `studentAuthenticatedHeaders` and fail closed without session proof. | Contract test | `student-lecture-api.ts`, `lecture-deck-url.ts` | Keep fail-closed |
| L8 | MEDIUM | Integration | ELEG review student saw 0 lectures. Copied 8 published ECE decks onto ELEG course 15 (session access attached). Re-check list after deploy for session-scoped access. | Copy script 2026-08-17 | `app-store-review-eleg-lectures.ts` | Confirm ELEG list = 8 |
| L9 | MEDIUM | WebView | **Repaired.** Student + faculty lecture WebViews use production + Blob origins, not `*`. | `StudentLectureViewerScreen.tsx` | Same | Keep restricted |
| L10 | MEDIUM | Testing | **Repaired locally.** Query-only 401 + redact + client contract tests. Production IDOR still unverified. | `lib/*lecture*.test.ts` | — | Re-prove on production after deploy |
| L11 | LOW | Routing | **Repaired.** Invalid week/lectureId shows `LectureInvalidRoute`. | `lecture/[week]/*` | Same | Keep empty-state |
| L12 | LOW | Performance | **Repaired locally.** Viewer uses `GET .../viewer` (one bundle). Falls back to detail only if that route is undeployed. | `student-lecture-api.ts` | Same | Deploy viewer route |

---

## Required Before Ship

1. **Local done.** Require a real student session on every student lecture API. Query `studentId` must match the session or be ignored.  
2. **Local done.** Require a real instructor session on faculty lecture APIs. Headers must not be identity.  
3. **Local done.** Strip answer keys from every student-visible lecture payload (list, detail, public catalog).  
4. **Local done.** Authenticate and bind progress writes.  
5. **Local done.** Lock unauthenticated `GET|POST /api/lectures` and unauthenticated by-week.  
6. **Still required.** Deploy web API, then re-prove: query-only → 401; cookie + other id → 403; cookie + own id → 200; list JSON has no `correct_answer`; faculty header-only → 401.  
7. **Still required.** Reset forged review progress on lectures 98 (Alex) and 99 (Jordan) if those rows should stay `not_started` for App Review.
8. **Done on production DB.** Copied 8 ECE decks onto ELEG course 15 (lecture ids 111–118). Query-only ELEG list now returns 8. Re-check after session-auth deploy.
9. **Local done.** Signed/expiring deck URLs + restricted lecture WebView origins + invalid-route empty state + single viewer GET. Re-prove after deploy: list JSON has no `blob.vercel-storage.com`; unauth `/deck` → 401; token `/deck` → PDF.

---

## Future Improvements

Rotate already-leaked public blob decks to private storage. Simulator theme pass.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 82 |
| UI | 76 |
| Buttons | 78 |
| API | 28 |
| CRUD | 32 |
| Authentication | 10 |
| Authorization | 16 |
| Student Isolation | 12 |
| Course Isolation | 74 |
| Membership | 88 |
| Production Configuration | 86 |
| Data Integrity | 24 |
| Security | 10 |
| Assessment Security | 18 |
| Cora Security | N/A |
| Error Handling | 68 |
| Mobile UX | 76 |
| Performance | 62 |
| Accessibility | 70 |
| Testing | 18 |

OVERALL SCORE: **38/100**

FINAL STATUS: **BLOCKED BY SECURITY / DATA ISSUE**

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json`.

Shared dependencies to invalidate this audit: authentication, student-http-cookies, student-api, student-lecture-api, student session, course context, lecture APIs, faculty lecture APIs, student navigation, membership.
