# Practice Hub — Student Mobile Production Audit

```
MODULE: Practice Hub
STUDENT ROUTE: /module/practice
NAVIGATION GROUP: Learning Center. student-nav id practice, label Practice Hub, icon fitness-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS.practice → PracticeHubScreen (registry.tsx). Native-screens PracticeModuleScreen is unused.
PRIMARY SCREEN: expo/src/components/practice/PracticeHubScreen.tsx
RELATED SCREENS: PracticeTopicScreen, PracticeQuizScreen, PracticeQuizWebScreen (dead route), PracticeLeaderboardListCard, PracticeLeaderboardPodium. Faculty Manage Practice is upstream only.
SUBROUTES: /practice/topic?topic=, /practice/quiz, /practice/quiz-web (no inbound nav)
API ROUTES:
  GET  /api/practice/topics-progress
  GET  /api/practice/config
  GET  /api/practice/recent-sessions
  GET  /api/practice/leaderboard
  POST /api/practice/generate
  POST /api/practice/evaluate
  POST /api/student/practice/submit
  GET  /api/practice/topics | history | analytics | stats | comparison | daily-limit | results/:id
  POST /api/practice/submit | answer | complete (legacy)
  GET|POST /api/student/practice/stats | leaderboard | results/:id | complete
SERVICES: expo/src/lib/practice-api.ts, student-api.ts (studentAuthenticatedRequest), practice-session.ts
DATABASE MODELS: practice_attempts, practice_answers, practice_leaderboard, student_topic_progress, practice_topic_availability, practice_question_availability, question_bank. Direct DB: UNVERIFIED except via API.
MEMBERSHIP: Nav open to all tiers. Generate + leaderboard-with-studentId require Explorer+. Review student Alex is Scholar.
CORA INTEGRATION: propose_practice_quiz → personalPracticeQuiz.create (session required in tool handler)
FACULTY DEPENDENCY: Manage Practice hide/show topics and questions. Faculty Expo audit READY 90/100.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: student-nav remaps practice → /student/dashboard-v2/practice; quiz-web unused
```

Size: LARGE (hub, topic start, native quiz, leaderboard, auth/IDOR, membership, answer keys, Cora, faculty downstream)  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`  
Manifest: `docs/audits/student-mobile/practice/manifest.json`

Invocation named **student-mobile-module-audit** / **Practice Hub**. The “Faculty Expo only” scope line is treated as faculty → student practice downstream only. This is **not** a faculty Manage Practice re-audit.

Execution: production HTTPS probes with review roster ids (Alex ECE `910000001`, Jordan ECE `910000002`, course `16` / session `ECE2202`). Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses. No live generate for Scholar (403). Evaluate probe used `questionId=1` read-only grade (save catch if attempt missing).

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **36/100**  
Blockers: 0  
Critical: 3  
High: 4  
Medium: 4  
Low: 4

The student Practice Hub is reachable, points at production HTTPS, and the native quiz path (`/practice/quiz`) is the live flow. Scholar generate is correctly 403. Course mismatch on topics-progress is 403. Faculty-hidden topics are excluded from the student topic list. Practice does **not** write the gradebook.

**Production `https://coursecollab.vercel.app` still treats a roster id as a login** on `/api/practice/*`. Unauthenticated callers can read Alex and Jordan progress, history, analytics, and stats; download a global topic catalog; and open a public ECE leaderboard with real names and student codes. Unauthenticated `POST /api/practice/evaluate` grades question bank id `1` and returns the correct answer.

The Expo client already refuses header-only identity (`requireStudentSessionProof`). That does not protect the production API.

**Local repairs applied (2026-08-18) — production still unpatched until deploy:**

- Backend helper `lib/require-student-practice-auth.ts`: `requireStudentPracticeCaller` + `requirePracticeAttemptOwnership` (`practice_attempts`, not quiz).
- `lib/student-practice-scope.ts`: `resolveStudentPracticeContextForCaller` (identity = session db id; query studentId is a claim).
- Session bind on `/api/practice/*` and `/api/student/practice/*` listed in the audit. Leaderboard always requires session; Scholar omit-studentId bypass removed.
- Generate omits `correct_answer` / correctLetters / correctTexts. Evaluate requires an owned practice attempt (no orphan `questionId` grade).
- Student stats scoped to caller course. Topic screen surfaces `formatStudentModuleError`. `PracticeQuestion.correct_answer` optional.
- Probe script: `expo/scripts/audit-practice-hub-production.mjs` (`npm run audit:practice-hub-production`). Live probes will FAIL until deploy.

---

## Architecture

Student Drawer (`Learning Center` → Practice Hub)  
→ `/module/practice`  
→ `registry.tsx` `practice` → `PracticeHubScreen`  
→ dock search + Practice / Leaderboard tabs  
→ `/practice/topic?topic=` → `practiceApi.generate`  
→ `/practice/quiz` → evaluate + `/api/student/practice/submit`  
→ `studentAuthenticatedRequest` (client session proof)  
→ production practice tables  
→ production server binds **query/body `studentId` or `x-student-id` only** (`resolveStudentPracticeContextFromParams`)  
→ faculty hide via `/api/instructor/practice/*` (already session/course scoped on faculty side)

---

## Files Inspected

- `expo/src/constants/student-nav.ts`
- `expo/src/modules/registry.tsx`, `native-screens.tsx`
- `expo/src/components/practice/*`
- `expo/app/(app)/practice/{topic,quiz,quiz-web}.tsx`
- `expo/src/lib/practice-api.ts`, `practice-session.ts`, `practice-session-count.ts`, `practice-web-inject.ts`
- `expo/src/lib/student-api.ts`, `expo/src/config/api.ts`
- `expo/src/lib/cora/student-module-registry.ts`
- `v0-coursecollabv3/app/api/practice/**`
- `v0-coursecollabv3/app/api/student/practice/**`
- `v0-coursecollabv3/lib/student-practice-scope.ts`, `student-api-auth.ts`, `save-practice-answer.ts`, `resolve-quiz-question-from-bank.ts`
- `v0-coursecollabv3/lib/cora/tools/execute-cora-tool.ts`, `lib/cora/confirmations/confirm-action.ts`
- Faculty downstream: `expo/docs/audits/faculty-mobile/practice.md`

---

## Navigation & Routing

Drawer label **Practice Hub**, Learning Center, `/module/practice`, **no** membership lock. Registry resolves `PracticeHubScreen`, not faculty `FacultyPracticeScreen`.

Subroutes: topic, native quiz, unused `quiz-web`. Search toolbar default `placement="dock"`. Back from topic uses `NotetakerScreenHeader` fallback `/module/practice`.

`PracticeModuleScreen` in `native-screens.tsx` is **DEAD** (not registered).

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app` via `resolveApiBaseUrl()` / `PRODUCTION_API_BASE_URL`.  
Development URLs: none in practice screens/clients.  
Mock dependencies: none observed.

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| PracticeHubScreen | Topics, flashcard decks, recent sessions, leaderboard | ACTIVE |
| PracticeTopicScreen | Difficulty + generate | ACTIVE |
| PracticeQuizScreen | Native attempt | ACTIVE |
| PracticeQuizWebScreen | WebView fallback | DEAD (no inbound nav) |
| PracticeModuleScreen | Legacy web CTA | DEAD |
| Faculty practice screens | Upstream only | N/A this audit |

---

## Components

| Component | Class |
|-----------|--------|
| PracticeHubScreen / Topic / Quiz | ACTIVE |
| PracticeLeaderboardListCard / Podium | ACTIVE |
| StudentSearchToolbar dock | ACTIVE |
| PillSwipeTabs | ACTIVE |
| FlashcardDeckListCard (hub embed) | ACTIVE |
| PracticeQuizWebScreen / web inject | DEAD / unused |
| CircuitSubmissionPanel (circuit Q) | ACTIVE when question type needs it |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Topic row | Hub | `openTopic` | — | Open topic | Client lock + route | TRACE |
| Start Practice | Topic | `startPractice` | POST generate | New attempt | Scholar 403 live | PASS membership |
| Submit answer | Quiz | `submitAnswer` | POST evaluate | Grade | Server computes XP | TRACE / auth FAIL |
| Finish practice | Quiz | `finishPractice` | POST student/practice/submit | Finalize | Header-only server | TRACE / auth FAIL |
| Leaderboard tab | Hub | `getLeaderboard` | GET leaderboard | Rankings | Scholar 403 with id; public without id | FAIL |
| View plans | Hub/topic/quiz | `/membership` | — | Upgrade | Client only | TRACE |
| All flashcards | Hub | `/module/flashcards` | — | Flashcards module | Route | TRACE |
| quiz-web back | Web quiz | clear + back | — | Leave | Unreachable | DEAD |

Simulator taps: **UNVERIFIED**.

---

## Menus / Action Sheets

None on the student hub beyond tab switch, pager, and membership alerts.

---

## Modals

Membership / validation `AppAlert`s only. No stacked resource modals.

---

## Forms

| Form | Fields | Client | Server | Status |
|------|--------|--------|--------|--------|
| Start practice | difficulty, topic, count | lock + empty topic | generate 403 Scholar | PARTIAL |
| Evaluate | answer, attemptId, xpEarned | required answer | server XP; no auth | FAIL |
| Submit | attemptId | session proof client | x-student-id only | FAIL |

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/practice/topics-progress` | practiceApi | query studentId | none | unlock counts only | mismatch 403 | **FAIL** live 200 unauth |
| GET | `/api/practice/recent-sessions` | practiceApi | query studentId | none | none | none | **FAIL** live 200 |
| GET | `/api/practice/config` | practiceApi | optional studentId | none | returned not gated | optional | **FAIL** live 200 unauth |
| GET | `/api/practice/leaderboard` | practiceApi | optional studentId | none | 403 if studentId Scholar; **public if omitted** | session filter | **FAIL** |
| POST | `/api/practice/generate` | practiceApi | body studentId | none | Explorer+ **403 Scholar live** | course check | AUTH FAIL / membership PASS |
| POST | `/api/practice/evaluate` | practiceApi | **none** | none | attempt-owner tier if attemptId | none | **FAIL** live 200 + key |
| POST | `/api/student/practice/submit` | practiceApi | x-student-id | attempt owned by header | none | none | **FAIL** header-only |
| GET | `/api/practice/topics` | unused by hub | none | none | none | global fallback | **FAIL** live 200 catalog |
| GET | `/api/practice/history` | unused by hub | query studentId | none | none | none | **FAIL** live 200 |
| GET | `/api/practice/analytics` | unused by hub | query studentId | none | none | none | **FAIL** live 200 |
| GET | `/api/practice/stats` | unused by hub | query studentId | none | none | none | **FAIL** live 200 |
| GET | `/api/practice/daily-limit` | unused by hub | query studentId | none | tier cap | topic limit | **FAIL** live 200 |
| GET | `/api/practice/comparison` | unused by hub | query studentId | none | none | course of student | **FAIL** live 200 |
| GET | `/api/practice/results/:id` | unused by hub | none | none | none | none | 404 for id 1; still unauth |
| POST | `/api/practice/submit` | unused | none | trusts client is_correct | none | none | **FAIL** unauth 404 |
| POST | `/api/practice/answer` | unused | none | trusts client isCorrect | none | none | **FAIL** unauth 500 |
| POST | `/api/practice/complete` | unused | none | trusts client scores | none | none | **FAIL** unauth 404 |
| GET | `/api/student/practice/stats` | unused | x-student-id | none | none | **global topics** | **FAIL** live 200 |

Zero `/api/practice/*` routes call `requireCallerStudentDbId` / `requireStudentIdParamMatchesCaller`.

---

## CRUD

| Operation | Supported | Traced | Executed | Status |
|-----------|-----------|--------|----------|--------|
| List topics | Yes | Yes | Live GET | IDOR |
| Start session | Yes | Yes | Scholar 403 | Membership PASS |
| Answer / evaluate | Yes | Yes | Live unauth | Answer leak |
| Submit attempt | Yes | Yes | Header-only 404 fake id | Auth FAIL |
| Delete attempt | No | — | — | N/A |
| Gradebook write | No | Yes | Grep + routes | PASS |

---

## Authentication

**FAIL.** Production treats `studentId` / `x-student-id` as identity. Client session proof is not enforced server-side.

Proven 2026-08-18 against `https://coursecollab.vercel.app` with **no cookies**:

| Probe | Result |
|-------|--------|
| GET topics-progress no id | 400 Student ID required |
| GET topics-progress `910000001` | **200** topic list + access |
| GET topics-progress `910000002` | **200** Jordan progress |
| GET recent-sessions / history / analytics / stats / daily-limit / comparison Alex | **200** |
| POST generate Scholar | **403** PRACTICE_TIER_LOCKED |
| POST evaluate `{questionId:1, answer:"A"}` | **200** + correct answer |
| POST student/practice/submit no header | 401 |
| POST student/practice/submit header + fake attempt | 404 |

---

## Student Authorization

Students cannot hit faculty instructor practice mutations without faculty headers (faculty audit). Student practice writes are not faculty-escalating. **PASS** for faculty-escalation; **FAIL** for “student-only via session.”

---

## Cross-Student Isolation

**FAIL.** Unauthenticated caller read Alex and Jordan `topics-progress` and `recent-sessions` by swapping `studentId`. Evaluate does not bind caller to attempt owner.

---

## Course / Section Isolation

**PARTIAL.** `courseId=15` with Alex ECE id → **403 Course mismatch**. Faculty-hidden topics excluded from scoped topic lists. `GET /api/practice/topics` without studentId returns **global** catalog (C++ + ECE). `GET /api/student/practice/stats` with header returns global topic counts (AC Power 24 vs Alex scoped 12).

---

## Membership Enforcement

| Surface | UI | Server | Status |
|---------|----|--------|--------|
| Hub open | No nav lock | topics-progress returns access.level none | Scholar can open hub |
| Start practice | Client lock + 403 | **403** Scholar generate | PASS |
| Leaderboard with studentId | 403 UI | **403** Scholar | PASS |
| Leaderboard without studentId | — | **200 public ranks** | **FAIL bypass** |
| Evaluate locked Q | Client lock | 403 when attempt+tier (code) | UNVERIFIED live Explorer |

Membership tampering (`tier` in body): generate ignores client tier and uses `getEffectiveMembershipTier` — **PASS** when generate is reached.

---

## Security

THE MOBILE CLIENT IS UNTRUSTED. Production still trusts the client’s roster id.

`requireAttemptOwnership` in `student-api-auth.ts` is for **`quiz_attempts`**, not `practice_attempts`. Do not reuse it blindly for Practice Hub.

---

## Assessment Security

Practice is not gradebook-graded. Still:

- Generate formats every question with `correct_answer` (`generate/route.ts` + `formatQuestionBankRowForRenderer`), including `locked: true`.
- Client type `PracticeQuestion.correct_answer` persists to `coursecollab-practice-session.json`.
- Live evaluate returned `answerReview.correctLetters=["B"]`, `correctTexts=["False"]`, option `isCorrect`.
- Legacy submit/answer trust client `is_correct`.

---

## Cora Security

`propose_practice_quiz` requires Cora session + `studentDbId` and emits a confirmation card. Confirm calls `createPracticeQuiz(studentDbId, …)` from session claims. Tool-level session exists; it still lands on generate, which currently trusts body `studentId`. Faculty tools are a separate registry. Domain/credits: **UNVERIFIED**.

---

## Database Integrity

No gradebook writes in practice routes. Writes: `practice_attempts`, `practice_answers`, leaderboard, topic progress, optional Trade Center points. Direct SQL: **UNVERIFIED**.

---

## Files / Documents

Circuit questions may upload via `/api/student/quiz-solution-upload`. Not executed. **UNVERIFIED**.

---

## Notifications

Hub refreshes on `useNotificationModuleRefresh("practice")`. Push copy: **UNVERIFIED**.

---

## Mobile UX

Grouped canvas, Title Case headers, dock search, icon+label status, pager for topics (3 per page). Offline: none. Simulator light/dark: **UNVERIFIED**.

---

## Theme

Uses `useThemedStudentNative` / `NATIVE` tokens. Accent + lock warning with icon and label.

---

## Accessibility

Labels on primary rows via list cards. VoiceOver / TalkBack: **UNVERIFIED**.

---

## Errors / Loading / Empty States

Hub: spinner, error banner, empty topics, empty decks, empty leaderboard, 403 locked box. Topic load failure silently sets `topic=null`. Quiz missing session redirects to hub. Evaluate/finish errors use `AppAlert`.

---

## Performance

Client paginates 3 topics. Leaderboard client cap 100. No infinite list of all topics at once.

---

## Web / Mobile Integration

Native quiz is the production path. `quiz-web` would load `${API_BASE_URL}/student/dashboard-v2/practice/quiz?native=1` and inject full questions (including keys) into sessionStorage. Unreachable from current nav.

---

## Faculty → Student Integration

Faculty hide/show is course-scoped (faculty audit `audit:practice-production` 15/15). Student `topics-progress` uses `hiddenPracticeTopicNames` + question availability. Live Alex list is ECE-scoped (12 AC Power vs global 24).

---

## Tests

No student Practice Hub production audit script. Faculty-only `audit:practice-production`. Unit coverage for leaderboard normalize exists. Typecheck this run: not executed (audit-only).

---

## End-to-End Results

| Flow | Result |
|------|--------|
| Nav → hub | TRACE (registry + nav) |
| Scholar generate | LIVE 403 |
| Native quiz start | UNVERIFIED (tier locked) |
| Evaluate | LIVE unauth answer leak |
| Submit | LIVE header required; no session |
| Leaderboard public | LIVE PII |
| Faculty hide → student list | Prior faculty E2E PASS |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| No session + victim studentId | **200** progress/history/analytics |
| Swap Alex → Jordan | **200** both |
| Omit studentId on leaderboard | **200** names + student codes |
| Scholar generate | 403 (good) |
| Unauth evaluate question 1 | **200** + key |
| Course mismatch | 403 (good) |
| Header-only student submit | 401 without header; 404 spoofed attempt |
| Client xpEarned=9999 | Server returned xpEarned 0 (ignored) |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| P-001 | CRITICAL | Auth / isolation | `/api/practice/*` reads trust query `studentId` with no session. Live IDOR on Alex and Jordan. | P2/P3/P5–P10/P17 200 unauth | `student-practice-scope.ts`, topics-progress, recent-sessions, history, analytics, stats, daily-limit, comparison | `requireBoundStudentCaller` then resolve scope from **caller** db id |
| P-002 | CRITICAL | Answer keys | Unauth `POST /api/practice/evaluate` grades any `questionId` and returns `answerReview` / correct letters. | P23 status 200, `correctTexts:["False"]` | `app/api/practice/evaluate/route.ts` | Session + owned `practice_attempts` row required; no orphan question grade |
| P-003 | CRITICAL | PII / membership | Leaderboard without `studentId` is public and lists real names + student codes. Scholar 403 only when studentId sent. | P13 200 Melissa Renderos / `2238366`; P14 403 | `app/api/practice/leaderboard/route.ts` | Require session; apply caller membership; never public |
| P-004 | HIGH | Course isolation | `GET /api/practice/topics` unauth returns global catalog (C++ + ECE). | P15 200 | `app/api/practice/topics/route.ts` | Require session + course scope |
| P-005 | HIGH | Answer keys | Generate maps `formatQuestionBankRowForRenderer` including `correct_answer` for locked questions. Client stores it. | `generate/route.ts:362-371`; `practice-session.ts:21` | generate route + PracticeQuestion | Strip keys until after permitted review; do not persist keys on device |
| P-006 | HIGH | Auth | Legacy `POST /api/practice/{submit,answer,complete}` have no auth and trust client correctness. | P24 404, P27 500, P28 404; code trusts `is_correct` | those route.ts files | Require session + attempt ownership or 401 all callers |
| P-007 | HIGH | Auth | `/api/student/practice/*` accepts `x-student-id` without session proof. | P20/P26/P29 | `app/api/student/practice/**` | `requireCallerStudentDbId` |
| P-008 | MEDIUM | Course isolation | Header-only student stats returns global topic counts (24 AC Power vs scoped 12). | P29 vs P2 | `app/api/student/practice/stats/route.ts` | Scope to caller course |
| P-009 | MEDIUM | Membership UX | Hub nav has no minTier; Scholar opens an empty/locked hub. | student-nav.ts:60; P12 access.level none | student-nav optional | Keep server gate; optional nav lock |
| P-010 | MEDIUM | Evaluate | Evaluate grades `questionId` even when attempt is missing (save caught). | P23 200 + evaluate catch around save | evaluate/route.ts | Fail closed without owned attempt |
| P-011 | LOW | Dead code | `/practice/quiz-web` injects full questions including keys; no nav to it. | grep inbound none | PracticeQuizWebScreen | Leave unused or delete later |
| P-012 | LOW | UX | Topic load error on topic screen silently becomes “not found”. | PracticeTopicScreen catch | PracticeTopicScreen.tsx | Surface `formatStudentModuleError` |
| P-013 | LOW | UX | No offline handling on hub/topic/quiz. | screens | practice screens | Standard overlay if shared pattern exists |
| P-014 | LOW | Testing | No student practice production audit script. | package.json only faculty script | expo/scripts | Add read-only student probes |

INFO (not scored as defects): client `xpEarned` ignored (P23 xp 0). No gradebook writes. Faculty hide filter works. Course mismatch 403 works. Client already requires session proof.

---

## Required Before Ship

1. Bind every student practice route to `requireCallerStudentDbId` / `requireBoundStudentCaller`. Never trust query/header/body `studentId` as identity.
2. Evaluate and submit only against a `practice_attempts` row owned by the caller.
3. Stop unauthenticated evaluate answer-key responses.
4. Leaderboard must not be public; Scholar must not bypass by omitting `studentId`.
5. Strip `correct_answer` from generate payloads (and locked questions).
6. Lock or authenticate legacy write routes.
7. Re-prove with a production probe script. Do not mark READY until live 401/403 on the probes above.

---

## Future Improvements

- Optional Explorer nav lock to match generate.
- Remove dead `quiz-web` / `PracticeModuleScreen`.
- Topic-screen error banner.
- Offline overlay.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 88 |
| Routing | 82 |
| UI | 78 |
| Buttons | 72 |
| API | 22 |
| CRUD | 55 |
| Authentication | 12 |
| Authorization | 28 |
| Student Isolation | 10 |
| Course Isolation | 52 |
| Membership | 58 |
| Production Configuration | 92 |
| Data Integrity | 70 |
| Security | 14 |
| Assessment Security | 18 |
| Cora Security | 68 |
| Error Handling | 68 |
| Mobile UX | 74 |
| Performance | 76 |
| Accessibility | 48 |
| Testing | 22 |

OVERALL SCORE: **36/100**

FINAL STATUS: **BLOCKED BY SECURITY / DATA ISSUE**

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` key `practice`.
