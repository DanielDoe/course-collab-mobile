# Flashcards — Student Mobile Production Audit

```
MODULE: Flashcards
STUDENT ROUTE: /module/flashcards
NAVIGATION GROUP: Learning Center. student-nav id flashcards, label Flashcards, icon layers-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS.flashcards → FlashcardsHomeScreen
PRIMARY SCREEN: FlashcardsHomeScreen in expo/src/components/flashcards/FlashcardsHomeScreen.tsx
RELATED SCREENS: FlashcardStudyScreen, FlashcardDeckEditorScreen, FlashcardDeckListCard, FlashcardFlipCard, FlashcardMcqUI, FlashcardWaterBreak, FlashcardKnownCelebration. Practice Hub consumes practiceHub=true course decks. Faculty FacultyFlashcardsScreen is upstream publish only (not this audit’s UI).
SUBROUTES: /flashcards/[deckId] (study), /flashcards/[deckId]/edit. Param: deckId.
API ROUTES:
  GET|POST /api/student/flashcards/decks
  GET|PATCH|DELETE /api/student/flashcards/decks/:deckId
  POST /api/student/flashcards/decks/:deckId/cards
  PATCH|DELETE /api/student/flashcards/cards/:cardId
  GET|POST /api/student/flashcards/decks/:deckId/study
  GET /api/student/flashcards/gamification
  GET|POST|PATCH|DELETE /api/instructor/flashcards/decks…
SERVICES: expo/src/lib/flashcards-api.ts (studentAuthenticatedRequest), instructor-content-api.ts
DATABASE MODELS: UNVERIFIED directly. Inferred: flashcard_decks, flashcard_cards, flashcard_study_events, course flashcard settings
MEMBERSHIP: All tiers see the module. Course-deck study is Scholar-locked (Explorer+). Personal decks unrestricted.
CORA INTEGRATION: none on list/study/editor. Student Cora propose_personal_flashcards is a separate tool (not exercised).
FACULTY DEPENDENCY: instructor publish / topic availability / configuration. Faculty Expo Flashcards is the upstream writer.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: student-nav remaps flashcards → /student/dashboard-v2/flashcards
```

Size: MEDIUM (list + study + personal editor + stats + faculty downstream)  
Audited: 2026-08-17  
Commit: `f710215f`  
Production API: `https://coursecollab.vercel.app`  
Manifest: none (single-run)

Invocation named **student-mobile-module-audit** / **Flashcards**. Faculty Expo is in scope only as publish → student downstream and faculty API privilege escalation. This is **not** a faculty Manage Flashcards UI audit.

Execution: production HTTPS probes with review accounts (Alex ECE `910000001` / db `722`, Jordan ECE `910000002`, Alex ELEG `910100001`, faculty `mchen` / instructor `15`, course `16`). Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **46/100** on production  
Blockers: 0  
Critical: 4  
High: 0  
Medium: 2  
Low: 1

The student Flashcards module is reachable, points at production HTTPS, and the ECE review roster can list two published faculty decks. Search dock + create (+) exist. Study / editor routes exist. Scholar course-deck study is **server-enforced** (0 cards, study POST `MEMBERSHIP_REQUIRED`). Personal-deck IDOR holds when the claimed id is honest.

**Production still treats `x-student-id` as a login** and **`x-instructor-id` + `x-course-id` as faculty identity.** Anyone can list/create as Alex, publish/delete as Maya, and list another course’s published catalog with `?courseId=`. Local web helpers (`requireCallerStudentDbId`, `requireInstructorSession`) already reject header-only in unit tests, but production `coursecollab.vercel.app` has not shipped that. Cookie without header → 401. Cookie + swapped header switches course context.

Until the web API is deployed and IDOR is re-proved, this module cannot ship.

---

## Architecture

Student Drawer (`Learning Center` → Flashcards)  
→ `/module/flashcards`  
→ `registry.tsx` `flashcards`  
→ `FlashcardsHomeScreen`  
→ search dock + tabs (All / Course / Mine / Stats) + `FlashcardDeckListCard`  
→ `/flashcards/[deckId]` study · `/flashcards/[deckId]/edit`  
→ `flashcardsApi` (`studentAuthenticatedRequest` — cookies + MFA + `x-cc-refresh` locally)  
→ production flashcard tables  
→ production server treats `x-student-id` as identity; local server binds session  
→ faculty publish via `/api/instructor/flashcards` (production: header course scope)

---

## Files Inspected

- `expo/src/constants/student-nav.ts`
- `expo/src/modules/registry.tsx`
- `expo/app/(app)/flashcards/[deckId].tsx`
- `expo/app/(app)/flashcards/[deckId]/edit.tsx`
- `expo/src/components/flashcards/FlashcardsHomeScreen.tsx`
- `expo/src/components/flashcards/FlashcardStudyScreen.tsx`
- `expo/src/components/flashcards/FlashcardDeckEditorScreen.tsx`
- `expo/src/lib/flashcards-api.ts`
- `expo/src/lib/flashcard-access.ts`
- `expo/src/lib/student-api.ts`
- `v0-coursecollabv3/app/api/student/flashcards/**`
- `v0-coursecollabv3/app/api/instructor/flashcards/decks/route.ts`
- `v0-coursecollabv3/lib/flashcards.ts`
- `v0-coursecollabv3/lib/student-api-auth.ts`
- `v0-coursecollabv3/lib/instructor-course-scope.ts`

---

## Navigation & Routing

Nav label Flashcards, Learning Center, `/module/flashcards`, no lock. Registry maps `flashcards` → `FlashcardsHomeScreen`. Subroutes exist. Invalid `deckId` (`NaN`) skips load while `loading` stays `true` → spinner, no error. Deep-link / restart: **UNVERIFIED**.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`  
Development URLs: none in flashcard client/API helpers  
Mock dependencies: none observed on this module

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| FlashcardsHomeScreen | List + create + stats | ACTIVE. Production list works with header. Simulator **UNVERIFIED**. |
| FlashcardStudyScreen | Flip / MCQ / timed / points | ACTIVE. Scholar locked empty. Invalid id spinner. |
| FlashcardDeckEditorScreen | Personal CRUD | ACTIVE. Header-only create proved. |
| Practice Hub deck cards | Downstream | ACTIVE (code). Live practiceHub list **UNVERIFIED** this run. |
| FacultyFlashcardsScreen | Upstream | Downstream contract only. |

---

## Components

| Component | Class |
|-----------|--------|
| FlashcardDeckListCard | ACTIVE |
| FlashcardFlipCard / TimerBar | ACTIVE |
| FlashcardMcqUI | ACTIVE |
| FlashcardWaterBreak | ACTIVE |
| FlashcardKnownCelebration | ACTIVE |
| FlashcardDifficulty* | ACTIVE |
| FlashcardQuizPreview | Faculty preview (not student path) |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Create deck (+) | Home search dock | `createDeck` | POST `/decks` | Own personal deck | Header-only POST 200 deck 28 (deleted) | FAIL auth |
| Open deck | List card | `openDeck` | GET `/decks/:id` | Study if unlocked | Scholar lock alert path exists; API returns 0 cards | PASS membership |
| Edit | List / study | router edit | GET + PATCH | Own decks only | Jordan GET/PATCH Alex deck 403 | PASS honest IDOR |
| Known / learning | Study | `recordStudyEvent` | POST `/study` | Session-bound points | Header-only; Scholar 403 MEMBERSHIP | PASS membership / FAIL auth |
| Tabs / search | Home | local filter | none | Filter list | Code-only | UNVERIFIED UI |

---

## Menus / Action Sheets

No overflow sheet on the student home list. Study uses on-screen mode pills + water-break dialog. Faculty generate-from-bank is faculty-only.

---

## Modals

Water-break duration dialog on study. Open/cancel: **UNVERIFIED** on simulator.

---

## Forms

Editor: title / description / topic / front / back. Client requires front+back. Server requires front+back. Server-side ownership check on PATCH/DELETE card (`getOwnedCard`). Proved Jordan cannot PATCH Alex deck.

---

## API Routes

| Method | Route | Caller | Authentication (production) | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|-----------------------------|---------------|------------|--------------|--------|
| GET | `/api/student/flashcards/decks` | flashcardsApi | **Header `x-student-id` = identity.** No header 401. Query-only 401. Cookie-only 401. | Lists claimed student’s course + personal | studySettings Scholar-locked | `?courseId=` **overrides** enrolled course | FAIL auth / course |
| POST | `/api/student/flashcards/decks` | createDeck | Header identity | Creates as claimed student db id | n/a | personal | FAIL auth |
| GET | `/api/student/flashcards/decks/:id` | getDeck | Header | `studentCanStudyDeck` | Scholar → 0 cards | Foreign course deck 403 | FAIL auth / PASS scope on detail |
| PATCH/DELETE | `/decks/:id` | editor | Header | Own student decks only | n/a | n/a | FAIL auth / PASS honest IDOR |
| POST | `/decks/:id/study` | study | Header | Deck access + Scholar 403 | **Enforced** | enrolled course | FAIL auth / PASS membership |
| GET | `/gamification` | home | Header | Caller stats | n/a | n/a | FAIL auth |
| GET/POST/DELETE | `/api/instructor/flashcards/decks` | faculty | **Headers only** | Course owner check (mchen + course 1 → 403) | n/a | header course | FAIL auth |

---

## CRUD

Personal create / delete proved on production (deck 28). Faculty create / delete proved (deck 29, deleted). Course decks 21 / 22 published on ECE 16. ELEG course 15 has 0 published decks.

---

## Authentication

| Probe | Result |
|-------|--------|
| GET list, no auth | **401** Student authentication required |
| GET list, `x-student-id: 910000001` | **200**, 2 ECE decks |
| GET list, `x-student-id: 722` | **200**, same 2 |
| GET list, query `studentId` only | **401** |
| GET list, Alex login cookie, no header | **401** |
| GET list, Alex cookie + `x-student-id: 910100001` | **200**, ELEG context `courseId=15`, 0 decks |
| Faculty GET, no headers | **401** |
| Faculty GET, `x-instructor-id` + `x-course-id` | **200**, decks 21–22 |

Local `requireCallerStudentDbId` rejects header-only in `lib/student-api-auth.test.ts`. Production does not.

---

## Student Authorization

Student UI does not publish course decks. Production **does** allow faculty flashcard POST/DELETE with only instructor/course headers — a student (or anyone) can create and delete course decks. Proved: created faculty deck 29, deleted same run.

---

## Cross-Student Isolation

Jordan header GET/PATCH Alex personal deck 28: **403**.  
Anyone can send Alex’s header and act as Alex (list, create, gamification).  
Alex cookie + Jordan header: **200** (same ECE course; session ignored).

---

## Course / Section Isolation

ELEG `910100001` list: **200, 0 course decks**.  
ECE Alex list: **200, 2 decks** (21, 22) on course 16.  
Alex header + `?courseId=1`: **200, 2 decks** from **live course 1** (ids 3, 4, same titles). Catalog leak.  
Alex GET deck 3 (course 1): **403 Access denied**. Detail scope holds; list does not.  
Alex GET deck 21: **200**, 0 cards (Scholar). Faculty header GET deck 21: **200**, 8 cards + fronts.

---

## Membership Enforcement

Scholar review student: `canStudyCourseDeck: false`, `unlockFraction: 0`. GET course deck returns `cards: []`, `totalCards: 8`. Study POST with faculty card id 131: **403** `MEMBERSHIP_REQUIRED`. Header `x-membership-tier: Trailblazer` ignored (still 0 cards). Server-side **PASS**. Personal decks not gated (intended).

---

## Security

Header identity, faculty header CRUD, `courseId` catalog override. Client locally fail-closes without session proof; production never sees that until deploy.

---

## Assessment Security

Flashcard backs are study answers, not gradebook keys. Scholar is not sent course cards. Faculty header GET returns all backs. No premature Scholar leak on student GET. N/A as graded assessment; treated as study content.

---

## Cora Security

N/A on this screen. `propose_personal_flashcards` not exercised.

---

## Database Integrity

Study events bind to claimed student db id. Scholar cannot write `known` on course decks. Header-only create persisted deck 28 until deleted. Points path not exercised (membership blocked).

---

## Files / Documents

No student flashcard file upload on this path.

---

## Notifications

`useNotificationModuleRefresh` is used on home. Push deep-link: **UNVERIFIED**.

---

## Mobile UX

Native list + docked search + pill tabs matches module design. Study is flip/MCQ. Simulator safe-area / dark mode: **UNVERIFIED**.

---

## Theme

Tokens via `useThemedNative` / `NATIVE`. Simulator light/dark: **UNVERIFIED**.

---

## Accessibility

Create (+) has `accessibilityLabel="Create deck"`. List cards: depends on `FlashcardDeckListCard`. Study icon controls: **UNVERIFIED**.

---

## Errors / Loading / Empty States

Home: spinner, error string, empty titles. Study: loading, lock/error. Invalid `deckId`: infinite spinner. Offline: **UNVERIFIED**.

---

## Performance

Home: list + gamification (2 GETs). Study: deck + progress (2 GETs). Acceptable.

---

## Web / Mobile Integration

Web remap exists. Create-on-web → see-on-mobile: **UNVERIFIED**.

---

## Faculty → Student Integration

Faculty header GET ECE 16 returns the same two published decks the student list returns (21, 22). ELEG student list empty — demo clone for ELEG flashcards **missing**. Unpublished student 404 path: deleted deck 29 → 404. Publish toggle hide: **UNVERIFIED** this run (prior faculty audit script claimed pass).

---

## Tests

`lib/student-api-auth.test.ts` covers generic header-only reject. Local flashcard tests added: `lib/student-flashcard-list-scope.test.ts` (client `courseId` ignored), `lib/student-flashcards-auth.contract.test.ts` (every student route `requireCallerStudentDbId`, every instructor route `requireInstructorCourse`), Expo `src/lib/student-flashcards-auth.contract.test.ts` (`studentAuthenticatedRequest` + `FlashcardInvalidRoute`). Faculty `audit-flashcards-production.mjs` still treats `x-student-id` as sufficient auth (false PASS vs this skill). Membership lock was not weakened and has no new client test.

---

## End-to-End Results

Open Flashcards → two ECE course cards → GET week deck → 0 cards for Scholar + upgrade copy. Create personal deck API works. Core **read** path works for a known header. Isolation of identity and course catalog fail.

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| No session + victim `x-student-id` | **200** list + gamification |
| Query `studentId` only | 401 |
| Cookie only | 401 |
| Cookie + other student header | **200**, other student’s course context |
| `?courseId=1` as ECE student | **200**, live course 1 decks |
| Foreign deck detail | 403 |
| Scholar study `known` | 403 MEMBERSHIP_REQUIRED |
| Client `tier=Trailblazer` | Ignored |
| Faculty GET/POST/DELETE headers only | **200** |
| Faculty foreign course 1 | 403 |
| Jordan edit Alex personal deck | 403 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix | Status |
|----|----------|------|---------|----------|---------------|-----------------|--------|
| FC1 | CRITICAL | Auth | Student flashcard APIs treat `x-student-id` as identity on **production**. Cookie is ignored. Local: `requireCallerStudentDbId` session-proof (already wired; not a new local impl). | Header-only GET 200; cookie-only 401; cookie+ELEG header → course 15. 2026-08-17. Local: `lib/student-api-auth.test.ts` header-only 401; all student flashcard routes import `requireCallerStudentDbId`. | `app/api/student/flashcards/**` | Deploy + re-prove header-only 401; cookie+own 200; cookie+other 403 | Repaired locally (already wired; regression tests). Production still header-auth. |
| FC2 | CRITICAL | Auth / escalation | Faculty flashcard CRUD is header-only on **production**. Local: `requireInstructorSession` / `requireInstructorCourse` (already wired). | GET/POST/DELETE 200; created 29 then deleted. Local: `lib/instructor-session-auth.test.ts` header-only 401; all instructor flashcard routes import `requireInstructorCourse`. | `lib/instructor-course-scope.ts` | Deploy + re-prove header-only 401 | Repaired locally (already wired; regression tests). Production still header-auth. |
| FC3 | CRITICAL | Course isolation | List honors client `courseId` (and `session`) instead of enrollment. ECE header + `courseId=1` lists live course 1 decks. | 200 decks 3–4 on production. Local GET now uses `resolveStudentFlashcardListScope` from DB enrollment only. | `app/api/student/flashcards/decks/route.ts` | Ignore query course/session; use DB context only | Repaired locally. Production still honors `?courseId=`. |
| FC4 | CRITICAL | Isolation | Header-only POST creates a personal deck as the claimed student. | POST 200 deck 28 studentId 722; deleted. Local POST already uses `requireCallerStudentDbId`. | POST decks route | Same as FC1 | Repaired locally (already wired; regression tests). Production still header-auth. |
| FC5 | MEDIUM | Integration | ELEG review student sees 0 course decks while ECE sees 2. | Original 2026-08-17 list: ELEG 0. After local copy on review Neon (same IDs as live review courses): SELECT ELEG 15=2, ECE 16=2. Read-only production GET `x-student-id: 910100001` → 200, courseId 15, decks 30 and 31. | `lib/app-store-review-eleg-flashcards.ts` | Clone ECE review decks onto ELEG 15 | Repaired locally. Read-only production list now returns 2 ELEG decks (copy landed on the review Neon the live API uses). Auth on that GET is still header-only (FC1). |
| FC6 | MEDIUM | Testing | No flashcard IDOR / courseId / membership contract tests. Faculty audit script treats header as auth. | repo search | `lib/student-flashcard-list-scope.test.ts`, `lib/student-flashcards-auth.contract.test.ts`, `expo/src/lib/student-flashcards-auth.contract.test.ts` | Add targeted tests; do not treat header as login | Repaired locally (tests added). |
| FC7 | LOW | Routing | Invalid `deckId` leaves study/editor in the initial loading spinner. | `FlashcardStudyScreen.tsx` L232 | `FlashcardInvalidRoute.tsx` + study/edit routes | Error empty-state | Repaired locally. |

---

## Required Before Ship

1. **Deploy** session-proof student + instructor identity (already in local web helpers). Re-prove on production: header-only → 401; cookie + other id → 403; cookie + own id → 200. Local helpers were already wired; do not treat this as a new production fix.
2. **Deploy** student list enrollment bind (`resolveStudentFlashcardListScope`). Re-prove `?courseId=1` as ECE student returns only course 16 (or empty), never course 1.
3. ELEG review copy ran on the review Neon (`ensure-app-store-review-eleg-flashcards.ts`; ELEG 15 now 2 published decks). Read-only production list for `910100001` returned decks 30 and 31. Re-check after any later reseed.
4. Do not mark FC1–FC4 production-resolved without a new production probe.

---

## Future Improvements

Simulator theme pass. Practice Hub live probe. Cora personal-flashcard tool audit.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 74 |
| UI | 76 |
| Buttons | 78 |
| API | 24 |
| CRUD | 40 |
| Authentication | 14 |
| Authorization | 28 |
| Student Isolation | 22 |
| Course Isolation | 32 |
| Membership | 88 |
| Production Configuration | 90 |
| Data Integrity | 70 |
| Security | 16 |
| Assessment Security | 82 |
| Cora Security | N/A |
| Error Handling | 62 |
| Mobile UX | 74 |
| Performance | 78 |
| Accessibility | 68 |
| Testing | 20 |

OVERALL SCORE: **46/100**

FINAL STATUS: **BLOCKED BY SECURITY / DATA ISSUE**

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json`.

Shared dependencies to invalidate this audit: authentication, student-http-cookies, student-api, student session, course context, flashcard APIs, faculty flashcard APIs, student navigation, membership.
