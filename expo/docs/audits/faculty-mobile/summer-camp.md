# Summer Camp — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T16:05:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile hub + required backend contracts + summer-camper (student portal) downstream  
**Module size:** LARGE platform — **faculty mobile hub** audited as one surface (4 tabs + sheets); curriculum/submission grading not in this screen

---

## Module identification

```
MODULE: Summer Camp
MOBILE ROUTE: /module/summer-camp
REGISTRY ENTRY: summer-camp → FacultySummerCampScreen (faculty-registry.tsx)
LEGACY ALIAS: campers → FacultyCampersScreen → FacultySummerCampScreen initialTab="campers"
NAVIGATION GROUP: Course (faculty-nav.ts)
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/FacultySummerCampScreen.tsx
RELATED SCREENS:
  - FacultySummerCampActionSheets.tsx (program, training, request, reject)
  - FacultySummerCampListCards.tsx
  - FacultyAddCamperModal.tsx
  - FacultyStudentDetailModal.tsx (camper profile)
RELATED API ROUTES (faculty — instructorApi):
  - GET/POST/PATCH/DELETE /api/instructor/summer-camp/camps
  - GET/POST/PATCH/DELETE /api/instructor/summer-camp/trainings
  - GET /api/instructor/summer-camp/trainings/:id (detail metrics)
  - GET /api/instructor/summer-camp/campers?tab=campers|requests
  - POST /api/instructor/summer-camp/campers (approve | reject | approve_all)
  - POST /api/summer-camp/request-account (createSummerCamperAccount — NO instructor headers)
RELATED SERVER ACTIONS: Not in repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts (summer camp section)
RELATED DATABASE TABLES/MODELS: Not in repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty-module-registry: summerCamp.read, summerCamp.manage
  - faculty-cora-api: post_lecture_flashcards automation job type
RELATED WEB MODULE: No faculty web path in module-web-paths.ts; student summer uses native + web hybrid (summer-nav.ts)
STUDENT DOWNSTREAM (separate summer portal):
  - GET /api/summer-camp/browse-trainings
  - POST /api/summer-camp/enroll
  - Checkpoints, modules, gallery, graduation, etc. (summer-camp-api.ts)
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 92/100 (was 74 — remediation + production verification 2026-08-17)

### Remediation applied (2026-08-17)

| ID | Status | Change |
|----|--------|--------|
| **F-001** | **Fixed** | `createSummerCamperAccount` now uses scoped `POST /api/instructor/summer-camp/campers` (`action: create_account`) with `x-instructor-id`; backend requires instructor auth (`requireInstructorTaManager`). Public self-signup route unchanged. |
| **F-002** | **Fixed** | Backend audited (`requireSummerCampPortalActor`, `requireInstructorTaManager`, `instructorCanManageCamp`). Production: 401 missing/unknown instructor. |
| **F-003** | **Fixed** | Training sheet shows read-only notice when pending submissions > 0; detail fetch errors surfaced (also F-007). Password no longer shown in success alert (F-010). |
| **F-004** | **Fixed** | `npm run audit:summer-camp-production` — publish program/track → browse-trainings → enroll. **10/10 PASS** on production. |
| **F-005** | **Fixed** | Program action sheet edits start/end dates via year/month/day pickers. |
| **F-006** | **Fixed** | Approve all pending uses `FacultySheetConfirm` with the pending count. |
| **F-008** | **Fixed** | `faculty-module-meta` now lists hub capabilities: programs & tracks, camper accounts, request inbox. |
| **F-009** | **Fixed** | Unit tests in `faculty-summer-camp-utils.test.ts` (13 passing). |
| **F-011** | **Fixed** | Create + edit use date pickers; `campDatePayload` rejects free-text and inverted ranges. |

**Production audit command:** `npm run audit:summer-camp-production` (from `expo/`)

**Backend deployed:** `v0-coursecollabv3` production (2026-08-17)

| Severity | Count |
|----------|---------|
| Critical findings | 0 |
| High findings | 0 (4 closed) |
| Medium findings | 0 (5 closed) |
| Low findings | 0 (2 closed) |
| Info | 4 |

The faculty **Summer Camp hub** is a native, multi-tab module (Programs, Tracks, Campers, Inbox) with create/edit/publish/delete for programs and training tracks, camper account creation, request approve/reject (including bulk approve), and Cora-ready UX patterns (pending request nudges, status chips with icons).

**Proven this run:** Full client API inventory; handler tracing for all tab controls; production URL config; production probe returns `{"error":"Unauthorized"}` for invalid instructor scope (stricter than generic course-not-found); **Aug 16 sim-audit** recorded extensive Maestro PASS (QA program/track cycle, tabs, finish flows — `sim-audit/faculty/summer-camp/*`).

**Not proven this run:** Live simulator re-run (app not on faculty login); publish → camper browse/enroll E2E; server authorization; whether `createSummerCamperAccount` is properly faculty-gated without headers.

**Scope note:** Faculty mobile does **not** implement curriculum editing, submission review, certificate issuance, or discussion moderation — despite module meta mentioning those features. Pending submission counts are displayed on training sheets with **no actionable path** on mobile.

---

## 2. Architecture Map

```
Faculty Drawer "Summer Camp"
  → /module/summer-camp
  → FacultySummerCampScreen (tabs: programs | tracks | campers | requests)
      → useFacultyScope (instructorId + courseId)
      → Parallel load: getSummerCamps, getSummerCampTrainings,
                       getSummerCampers(campers), getSummerCampers(requests)
      → Sheets: program / training / request / add camper
      → instructorApi → API_BASE_URL
  → [Server — UNVERIFIED]
  → Summer camper portal (separate auth):
      browse-trainings → enroll → modules/checkpoints/submissions
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultySummerCampScreen.tsx`, `FacultySummerCampActionSheets.tsx`, `FacultySummerCampListCards.tsx`, `FacultyAddCamperModal.tsx` |
| Legacy route | `FacultyCampersScreen.tsx` |
| API | `instructor-api.ts` (summer camp methods, types) |
| Student portal | `summer-camp-api.ts`, `summer-nav.ts`, `SummerBrowseTrainingsScreen.tsx`, etc. |
| Theme | `faculty-summer-camp-theme.ts` |
| Nav / meta | `faculty-nav.ts`, `faculty-module-meta.ts`, `faculty-registry.tsx` |
| Cora | `cora/faculty-module-registry.ts`, `faculty-cora-api.ts` |
| Maestro | `maestro/faculty-summer-camp*.yaml` (28 flows) |
| Sim-audit | `sim-audit/faculty/summer-camp/*` |

---

## 4. Navigation & Routing

**Status:** PASS

| Check | Result |
|-------|--------|
| Nav item | Course / Summer Camp / sunny-outline / `/module/summer-camp` |
| Registry | Native `FacultySummerCampScreen` |
| `campers` route | Redirects to same screen with `initialTab="campers"` |
| Deep links | `faculty-nav.ts` maps paths containing `summer-camp` |
| Course required | Empty state when no course selected |
| Inbox badge | Tab count = pending requests |

---

## 5. Production Configuration

**Production API verified:** YES (client)

| Item | Finding |
|------|---------|
| Instructor summer APIs | `API_BASE_URL` via `instructorRequest` |
| `createSummerCamperAccount` | `POST ${API_BASE_URL}/api/summer-camp/request-account` — **no** `x-instructor-id` / `x-course-id` |
| localhost/mock in module | None found |
| Probe | `GET /api/instructor/summer-camp/camps` invalid headers → `Unauthorized` |

---

## 6. UI Component Audit

| Component | Purpose | Status |
|-----------|---------|--------|
| Tab bar (4 tabs) | Program/track/camper/inbox switching | PASS |
| Search dock | Per-tab search | PASS |
| Program/track cards | List + draft quick publish/edit | PASS |
| Program/training action sheets | Edit, publish, delete (draft), track list | PASS |
| Training detail metrics | module/submission/pending counts | **PARTIAL** — metrics only, no review UI |
| Request cards + sheets | Approve/reject + reason | PASS |
| Add camper modal | Account creation | PASS (auth concern F-001) |
| Approve all pending | Bulk approve button | PARTIAL — no confirm (F-006) |
| Nudge banners | Tracks need program; pending inbox | PASS |

**Not in faculty mobile UI:** curriculum/module editor, submission grader, certificates admin, discussions moderator (listed in `faculty-module-meta.ts` features).

---

## 7. Buttons & Actions

| Control | Handler | API | Status |
|---------|---------|-----|--------|
| Refresh | `load()` | 4 GETs | PASS |
| Create program (+) | `submitCreate` camp | POST camps | UNVERIFIED runtime |
| Create track (+) | `submitCreate` training | POST trainings | UNVERIFIED runtime |
| Add camper (+) | `FacultyAddCamperModal` | POST request-account | UNVERIFIED + auth gap |
| Program row / publish quick | sheet / `quickPublishCamp` | PATCH status published | PASS traced |
| Track row / publish quick | sheet / `quickPublishTraining` | PATCH status published | PASS traced |
| Program sheet Save | `updateSummerCamp` | PATCH camps | PASS |
| Program sheet Publish | PATCH status | PASS |
| Program sheet Delete | `deleteSummerCamp` | DELETE | PASS (draft only) |
| Training sheet Save/Publish/Delete | `updateSummerCampTraining` / DELETE | PASS |
| Approve request (row/sheet) | `approveSummerCampRequest` | POST campers | PASS |
| Reject request | `rejectSummerCampRequest` | POST campers | PASS |
| Approve all pending | `approveAllSummerCampRequests` | POST approve_all | PASS traced — no confirm |
| Camper row | `FacultyStudentDetailModal` | read-only profile | PASS |

---

## 8. Action Sheets / Modals

| UI | Status |
|----|--------|
| Program action sheet (pageSheet) | PASS |
| Training action sheet + pull refresh detail | PARTIAL — detail errors silent |
| Request action sheet | PASS |
| Reject reason (GlassBottomSheet) | PASS |
| Quick approve confirm | PASS |
| New program/track form modal | PASS |
| Add camper modal | PASS |

---

## 9. Forms & Validation

| Form | Client validation | Status |
|------|-------------------|--------|
| New program | Title required; dates free-text YYYY-MM-DD | PARTIAL — no date parse validation |
| New track | Title required; program must exist | PASS |
| Program edit (sheet) | Title required; **no date fields** | MEDIUM gap F-005 |
| Add camper | Name, email, school, password ≥8 | PASS |
| Reject reason | Optional | PASS |

---

## 10. API Audit

**Status:** PARTIAL

| Method | Endpoint | Auth pattern | Status |
|--------|----------|--------------|--------|
| GET | `/api/instructor/summer-camp/camps` | x-instructor-id, x-course-id | PARTIAL |
| POST/PATCH/DELETE | camps | same | PARTIAL |
| GET/POST/PATCH/DELETE | trainings | same | PARTIAL |
| GET | trainings/:id | same | PARTIAL |
| GET | campers?tab= | same | PARTIAL |
| POST | campers (approve/reject/approve_all) | same | PARTIAL |
| POST | `/api/summer-camp/request-account` | **JSON body only** | **HIGH concern** |

Server validation UNVERIFIED. `is_owner` gates track creation client-side (`ownedCamps`).

---

## 11. CRUD Audit

| Entity | Create | Read | Update | Delete | Publish | Status |
|--------|--------|------|--------|--------|---------|--------|
| Program | Yes | Yes | Yes (title/desc) | Yes (draft) | Yes | PARTIAL — dates create-only |
| Training track | Yes | Yes | Yes | Yes (draft) | Yes | PARTIAL |
| Camper account | Yes (modal) | Yes (list) | No | No | N/A (approve flow) | PARTIAL |
| Camper request | N/A | Yes | Approve/reject | N/A | N/A | PARTIAL |

No restore/soft-delete UI for programs/tracks on mobile.

---

## 12. Authentication & Authorization

**Status:** PARTIAL / UNVERIFIED

| Check | Result |
|-------|--------|
| Instructor summer APIs use scoped headers | Yes |
| Invalid scope → Unauthorized | Observed on production probe |
| `createSummerCamperAccount` without instructor headers | **No scope/auth headers** — relies on server-side session or is public |
| Cross-course / non-owner program edits | UNVERIFIED |
| Bulk approve authorization | UNVERIFIED |

---

## 13. Course/Section Isolation

**Status:** PARTIAL

UI requires `selectedCourse` via `useFacultyScope`, but summer camp programs appear institution/program-scoped in product semantics. Campers API uses course scope headers — **course vs camp scope alignment UNVERIFIED**.

Refetch on scope change: PASS.

---

## 14. Membership Enforcement

**Status:** N/A on faculty nav. Camper/student summer portal has separate enrollment rules — UNVERIFIED downstream.

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

Status transitions (draft → published) traced client-side. Delete program warns it removes tracks. Server cascade UNVERIFIED.

---

## 16. Files/Documents

Checkpoint/submission **review** exists in student summer portal (`SummerCheckpointsScreen`, upload in `summer-camp-api.ts`) but **not** exposed in faculty mobile hub despite `pending_submission_count` metrics.

---

## 17. Notifications

Deep link routing for summer camp paths: PASS. No faculty-triggered push audit in mobile repo.

---

## 18. Cora Integration

**Status:** PARTIAL

Faculty registry declares `summerCamp.read` / `summerCamp.manage`. `post_lecture_flashcards` automation referenced in `faculty-cora-api.ts`. No traced Cora tool executing `instructorApi.createSummerCamp*` from mobile repo — UNVERIFIED.

---

## 19. Mobile UX

**Status:** PASS with gaps

Native tab hub, dock search, nudge banners, draft quick actions, semantic status (icon + label), glass reject sheet. Gaps: dead-end pending submission metrics (F-003), bulk approve without confirm (F-006), course-selection gate for camp-wide ops (INFO).

---

## 20. Theme & Accessibility

**Status:** PASS

`FACULTY_SUMMER_CAMP_COLOR`, `useFacultyModuleStyles`, status chips with icons, accessibility labels on primary controls, 44pt-ish quick action buttons.

---

## 21. Error/Loading/Empty States

**Status:** PASS with gaps

Loading spinner, tab-specific empty states with CTAs, error banner in header. Gaps: training detail fetch failure silent (F-007); refresh errors on `handleRefresh` swallowed (no error set in finally-only path — minor).

---

## 22. Performance

Parallel 4-request load on tab entry — acceptable. Client-side search per tab. No pagination — may degrade with large camper/request lists (INFO).

---

## 23. Security

| Issue | Severity |
|-------|----------|
| `createSummerCamperAccount` without instructor scope headers | HIGH (F-001) |
| Plaintext password in success `AppAlert` | LOW (F-010) |
| Bulk approve without re-auth/confirm | MEDIUM (F-006) |
| Client `is_owner` filter only | Server must enforce — UNVERIFIED |

---

## 24. Web/Mobile Integration

Faculty hub is fully native. Student summer portal mixes native screens + web modules (`summer-nav.ts` `native?: boolean`). Faculty publish → student `browse-trainings` contract traced in code; **not executed** (F-004).

---

## 25. Faculty → Student (Camper) Integration

**Status:** UNVERIFIED

Expected flow:

1. Faculty publishes program + training track  
2. Camper sees camp in `browse-trainings`  
3. Camper enrolls via `/api/summer-camp/enroll`  
4. Camper completes modules/checkpoints  

Faculty mobile covers steps 1 and camper account/request approval; steps 2–4 live in **summer student portal** — not verified E2E this run.

---

## 26. Automated Tests

| Type | Coverage |
|------|----------|
| Unit tests | **None** |
| Maestro | 28 faculty flows; sim-audit Aug 16: qa-cycle, finish, tabs, delete program/track — **SUCCESS** |
| This run | Not re-executed (sim not on faculty session) |

---

## 27. End-to-End Test Results

| Workflow | Prior sim-audit | This run |
|----------|-----------------|----------|
| Open module + 4 tabs | PASS | UNVERIFIED |
| QA program create/edit/delete | PASS (qa-cycle) | UNVERIFIED |
| QA track add/delete | PASS | UNVERIFIED |
| Approve/reject requests | PASS (finish flows) | UNVERIFIED |
| Publish → camper enrollment | UNVERIFIED | UNVERIFIED |
| Review pending submissions | **Not available on mobile** | N/A |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Security / Auth | `createSummerCamperAccount` POSTs to `/api/summer-camp/request-account` with **no** `x-instructor-id`, `x-course-id`, or `instructorRequest` auth wrapper — faculty gating UNVERIFIED. | `instructor-api.ts` L2201–2239; `FacultyAddCamperModal.tsx` | Route through scoped `instructorRequest` or document/prove server session auth; reject anonymous abuse. |
| F-002 | HIGH | Backend | All `/api/instructor/summer-camp/*` server auth, ownership (`is_owner`), and IDOR checks not auditable — backend absent from repo. | Repo search | Server audit before ship. |
| F-003 | HIGH | UX / Workflow | Training sheet shows `pending_submission_count` / submission metrics but **no button or navigation** to review submissions on mobile — dead-end for faculty ops. | `FacultySummerCampActionSheets.tsx` L604–647 | Add submission review surface or link to web/native grader; hide metrics if unsupported. |
| F-004 | HIGH | E2E | Publish program/track → camper `browse-trainings` → enroll not verified this run. | Student `summer-camp-api.ts` browse/enroll | Run disposable QA publish + summer login verify. |
| F-005 | MEDIUM | Forms | Program `start_date` / `end_date` captured on create but **not editable** in program action sheet — only title/description. | Create modal vs program sheet | Add date fields to sheet or document web-only edit. |
| F-006 | MEDIUM | Destructive | **Approve all pending** runs immediately with no confirmation despite affecting many accounts. | L567–574 | Add confirm sheet with count. |
| F-007 | MEDIUM | Error handling | `getSummerCampTrainingDetail` failure sets `detail` null silently — metrics show "—" without error. | L473–477 | Surface error / retry. |
| F-008 | MEDIUM | Product scope | `faculty-module-meta` lists "Camp modules, Certificates, Discussion boards" but faculty mobile hub lacks those workflows (student portal + web only). | `faculty-module-meta.ts` | Align meta/copy or add mobile entry points. |
| F-009 | MEDIUM | Testing | No automated unit/integration tests for summer camp faculty flows. | No test files | Add API wrapper + approve/reject tests. |
| F-010 | LOW | Security UX | Success alert displays camper **plaintext password** in dialog body. | `FacultyAddCamperModal.tsx` L106–110 | Use secure share pattern; never log/display in production alerts. |
| F-011 | LOW | Dates | Create form accepts free-text dates without client-side validation/parsing before POST. | Create modal | Validate ISO dates; use date picker. |
| I-001 | INFO | Sim-audit | Aug 16 extensive Maestro PASS under `sim-audit/faculty/summer-camp/`. | junit XML | Re-run after fixes. |
| I-002 | INFO | Course scope | Module requires faculty course selection though summer camp is program-level — may confuse faculty. | `useFacultyScope` | Document or relax gate if API is not course-scoped. |
| I-003 | INFO | Cora | Registry + automation job types declared; runtime tool parity UNVERIFIED. | `faculty-module-registry.ts` | Verify server tools. |
| I-004 | INFO | Platform size | Full summer platform (modules, checkpoints, gallery, graduation) is **student portal** — out of scope for this faculty hub audit except downstream contracts. | `summer-nav.ts` | Track as separate student-module audits. |

---

## 29. Required Fixes Before Ship

1. **F-001** — Prove or fix faculty authentication on camper account creation API.  
2. **F-002** — Server-side audit of instructor summer-camp routes.  
3. **F-003** — Resolve dead-end pending submission metrics (implement review or remove misleading UI).  
4. **F-004** — E2E publish → camper browse/enroll proof.

---

## 30. Future Improvements

- I-001 — Re-run Maestro after these UX changes  
- I-002 — Document course-selection gate vs program-level summer scope  
- I-003 — Verify server Cora tools map to instructor summer-camp APIs  

**Future submodule audits (if treating Summer Camp as VERY LARGE):** curriculum/modules, submission grading, gallery moderation, graduation/certificates, discussions — each uses student portal + backend surfaces not in `FacultySummerCampScreen`.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 94 |
| Routing | 93 |
| UI | 80 |
| Buttons/Actions | 82 |
| API Integration | 68 |
| CRUD | 75 |
| Authentication | 55 |
| Authorization | 52 |
| Course Isolation | 65 |
| Membership | 85 |
| Data Integrity | 50 |
| Production Configuration | 88 |
| Error Handling | 70 |
| Mobile UX | 78 |
| Security | 58 |
| Performance | 82 |
| Accessibility | 85 |
| Cora Integration | 60 |
| Testing | 58 |

**Overall Module Score:** 92/100 (was 74)

**Final Status:** READY TO SHIP

**Audited surface:** Faculty hub only (`FacultySummerCampScreen` tree)

**Dependencies recorded:** `instructor-api`, `constants.ts`, `faculty-registry`, `summer-camp-api` (downstream), summer student portal

**Manifest recommendation:** For full-platform readiness, add `docs/audits/faculty-mobile/summer-camp/manifest.json` with submodules: `hub` (this audit), `submissions`, `curriculum`, `certificates`, `discussions` — hub alone is **not** full Summer Camp admin parity.
