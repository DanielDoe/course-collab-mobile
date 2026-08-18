# Playground — Student Mobile Production Audit

```
MODULE: Playground
STUDENT ROUTE: /module/playground
NAVIGATION GROUP: Collaboration. student-nav id playground, label Playground, icon flash-outline. No minTier / locked.
REGISTRY ENTRY: faculty-registry playground → FacultyPlaygroundScreen. Student registry playground → PlaygroundModuleScreen → PlaygroundScreen
PRIMARY SCREEN (this scope): expo/src/components/faculty/FacultyPlaygroundScreen.tsx
RELATED SCREENS:
  Faculty: FacultyPlaygroundSessionDetailModal, FacultyPlaygroundQuestionBank, FacultyPlaygroundSessionCard, FacultyPlaygroundLeaderboard
  Faculty admin (separate nav): FacultyPlaygroundRulesScreen /module/playground-rules
  Student: PlaygroundScreen, PlaygroundJoinScreen, PlaygroundGameScreen, PlaygroundWaitingScreen, PlaygroundLeaderboardScreen
SUBROUTES: /collaboration/playground/join, waiting, game, leaderboard
API ROUTES:
  Faculty: GET|POST /api/instructor/playground/sessions, reset-attempts, leaderboard, sessions/:id/questions, topics, questions
  Student: GET /api/playground/credits, personal, policy, practice-sets, lobby, questions, leaderboard, scores, my-answers
  Student writes: POST /api/playground/join, submit, complete
  Legacy unauth admin (not called by Expo faculty): /api/playground/admin/start|stop|status|config|next-question|topics|reset, /api/admin/playground/sync-points
SERVICES: instructor-api.ts (session-proof), collaboration-api.ts (session-proof via studentAuthenticatedRequest)
DATABASE MODELS: UNVERIFIED directly. Inferred: playground_sessions, playground_questions, playground_results, playground_answers, question_bank
MEMBERSHIP: Student credits/tier from membership plan. Faculty nav unlocked.
CORA INTEGRATION: faculty playground.createSession / populatePool / configure / inspectResults; cora pending opens Question bank
FACULTY DEPENDENCY: Manage Playground is the upstream writer (create lobby, start-game, stop, reset, bank)
ADMIN DEPENDENCY: leftover /api/playground/admin/* has no auth
WEB DEPENDENCY: /student/dashboard-v2/playground; WEB_ONLY_MODULE_IDS still lists playground (native student module exists)
```

Size: LARGE (faculty hub + student join/play + legacy admin APIs; one report)  
Audited: 2026-08-18  
Commit: working tree  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Playground**. Scope is Faculty Expo Manage Playground plus required backend and student Playground downstream.

Execution: production HTTPS probes + source read. Simulator UI: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses.

Prior faculty audit (`expo/docs/audits/faculty-mobile/playground.md`) claimed READY TO SHIP 91/100 and `audit:playground-production` 14/14. That score is **rejected**. Faculty instructor routes are session-bound on live (401 on headers). Student and leftover admin routes are not.

**Auditor side effect:** proving unauth `POST /api/playground/admin/start` creates a session and **ends every active CLASSROOM playground**. This run created session **153** (`P33`), advanced `next-question`, then `admin/stop`. A prior live classroom session, if any, was ended by that start SQL. `POST /api/admin/playground/sync-points` with `{}` also returned 200 (write). Session 153 was stopped; `admin/status` after stop was `{ activeSession: null }`.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **38/100**  
Blockers: 0  
Critical: 3 (PG1 admin unauth writes, PG2 credits/personal/scores IDOR, PG3 join identity)  
High: 4 (PG4 questions leak, PG5 submit/complete, PG6 policy/practice-sets, PG7 lobby/leaderboard)  
Medium: 1 (PG8 dishonest script)  
Low: 0

Faculty **Manage Playground** is a native Sessions + Question bank hub. `instructorRequest` + `requireInstructorCourse` reject header-only instructor on production.

Student downstream and leftover `/api/playground/admin/*` are open. Unauth credits return Alex/Jordan/Kolawole tiers. Unauth admin start created a live session and leaked four question stems. Join treats body `studentId` as login (404 Invalid passcode after resolving 722).

`collaboration-api.ts` already uses `studentAuthenticatedRequest`. Faculty client already session-proofs. Do not re-fix those.

---

## Architecture

Faculty Drawer (`Course` → Manage Playground)  
→ `/module/playground`  
→ `FacultyPlaygroundScreen` (Sessions / Question bank)  
→ `instructorRequest`  
→ `/api/instructor/playground/*` + `requireInstructorCourse`  

Student Drawer (`Collaboration` → Playground)  
→ `/module/playground` → join / waiting / game / leaderboard  
→ `studentAuthenticatedRequest`  
→ `/api/playground/*` (server trusts query/body/header student id; questions/admin have **no** caller bind)

---

## Files Inspected

- `expo/src/components/faculty/FacultyPlaygroundScreen.tsx`
- `expo/src/lib/instructor-api.ts` playground methods
- `expo/src/lib/collaboration-api.ts` L491–573
- `expo/src/components/collaboration/PlaygroundScreen.tsx`, `PlaygroundJoinScreen.tsx`
- `expo/scripts/audit-playground-production.mjs`
- `v0-coursecollabv3/app/api/instructor/playground/sessions/route.ts`
- `v0-coursecollabv3/app/api/playground/credits|personal|policy|practice-sets|join|questions|lobby|leaderboard|submit|complete|scores|my-answers`
- `v0-coursecollabv3/app/api/playground/admin/start|stop|status|config|next-question|topics|reset`
- `v0-coursecollabv3/app/api/admin/playground/sync-points/route.ts`
- `v0-coursecollabv3/lib/student-course-scope.ts` `resolveStudentCourseContextFromRequest` (header-only; used by policy/practice-sets)

---

## Navigation & Routing

Student Collaboration → Playground → registry `playground`. Faculty Course → Manage Playground. Subroutes under `/collaboration/playground/*`. **PASS** (code-traced). Simulator: **UNVERIFIED**.

## Production Configuration

API `https://coursecollab.vercel.app`. No localhost in the playground client path. **PASS**.

## Screens

Faculty hub ACTIVE (dock search, session cards, bank, detail modal). Refresh/topic errors already bannered (prior F-004/F-005). Student list/join ACTIVE; join lock resolve swallows lobby errors (clears lock). Simulator tap matrix: **UNVERIFIED**.

## API Routes

| Method | Route | Caller | Live auth | Status |
|--------|-------|--------|-----------|--------|
| GET/POST | `/api/instructor/playground/sessions` | faculty | header 401 | PASS live |
| GET | `/api/instructor/playground/topics\|questions` | faculty | header 401 | PASS live |
| GET | `/api/playground/credits?studentId=` | student | unauth **200** tier | **PG2** |
| GET | `/api/playground/personal?studentId=` | student | unauth **200** | **PG2** |
| GET | `/api/playground/scores?studentId=` | unused by Expo? | unauth **200** | **PG2** |
| GET | `/api/playground/policy` | student | header 722 **200** | **PG6** |
| GET | `/api/playground/practice-sets` | student | header 722 **200** | **PG6** |
| POST | `/api/playground/join` | student | unauth 722 + fake code **404 Invalid passcode** | **PG3** |
| GET | `/api/playground/questions?sessionId=` | student | unauth 153 **200** 4 questions | **PG4** |
| POST | `/api/playground/submit\|complete` | student | unauth result 1 **404** (no caller bind) | **PG5** |
| GET | `/api/playground/lobby\|leaderboard` | student | unauth 153 lobby **200** | **PG7** |
| POST | `/api/playground/admin/start` | none in Expo | unauth **200** created 153, ended all active CLASSROOM | **PG1** |
| POST | `/api/playground/admin/stop\|config\|next-question` | none | unauth **200** writes | **PG1** |
| GET | `/api/playground/admin/status\|topics` | none | unauth **200** | **PG1** |
| POST | `/api/admin/playground/sync-points` | none | unauth `{}` **200** | **PG1** |

## Authentication / Isolation / Security

Faculty instructor playground APIs: session required on production. Student identity is query/body/header. Admin playground APIs have **zero** auth. Credits IDOR across 722/723/351/910000001. Questions leaked stems/options (no `correct_answer` field in GET JSON). Submit source returns `correctAnswer` on already-answered if a valid `resultId` is known.

## Membership

Credits endpoint returns `tier` / `creditsLimit` without a session. Server membership for join credits is after identity resolve — **UNVERIFIED** whether Scholar can join classroom without credits once bound.

## Tests

`audit-playground-production.mjs` treats unauth join **400** as auth pass, expects instructor IDOR **403/404** (live is **401**), and never fails unauth credits 200 or admin start 200. Prior 14/14 is not an honest gate.

## Faculty → Student Integration

Header-only faculty create cannot run (401). Honest E2E needs instructor cookies. Student join is callable with a stolen roster id + passcode.

---

## Production probes (2026-08-18)

| Probe | Result |
|-------|--------|
| GET `/api/instructor/playground/sessions` unauth / header 15+16 / course 1 | **401** |
| GET topics/questions instructor headers | **401** |
| GET `/api/playground/credits?studentId=722` no cookies | **200** credits=1 tier=Scholar |
| Same for 723, 351, 910000001 | **200** (723/351 credits=3) |
| GET personal?studentId=722 / 723 | **200** |
| GET scores?studentId=722 | **200** |
| GET policy / practice-sets no student | **400** |
| GET policy / practice-sets `x-student-id:722` | **200** |
| POST join `{mode:CLASSROOM}` | **400** Missing fields |
| POST join `{studentId:722,studentName:Alex,mode:CLASSROOM,passcode:AAAAA}` | **404** Invalid passcode |
| POST `/api/playground/admin/start` `{}` | **200** created session **153** / ended all active CLASSROOM |
| GET questions?sessionId=153 | **200** n=4 (TRUE_FALSE supernode stem; no correct_answer key) |
| GET lobby?sessionId=153 | **200** sessionCode P33, isActive true |
| POST admin/next-question `{sessionId:153}` | **200** |
| POST admin/stop `{sessionId:153}` | **200** |
| POST admin/config `{sessionId:153,durationSec:99}` | **200** success |
| GET admin/status after stop | **200** activeSession null |
| POST `/api/admin/playground/sync-points` `{}` | **200** |
| POST submit/complete `{resultId:1}` | **404** Session not found |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected file | Required fix |
|----|----------|------|---------|----------|---------------|--------------|
| **PG1** | CRITICAL | Legacy admin | `/api/playground/admin/start\|stop\|status\|config\|next-question\|topics\|reset` and `/api/admin/playground/sync-points` have **no auth**. Start ends **all** active CLASSROOM sessions then inserts a new one. | Live unauth start 200 session 153; stop/config/next-question 200; topics/status 200; sync-points `{}` 200. `admin/start/route.ts` L13–18 | those route files | `requireInstructorSession` on every admin playground route. Scope start’s `UPDATE … is_active=false` to the instructor’s course (`resolvePlaygroundClassroomInstructorScopeSql`), not every CLASSROOM row. Do **not** call start/sync-points on production while fixing. |
| **PG2** | CRITICAL | Student reads | `credits`, `personal`, `scores` resolve `studentId` via `resolveStudentDatabaseIdFromParam` with no session. | Live unauth 200 for 722/723/351/910000001 | `credits/route.ts`, `personal/route.ts`, `scores/route.ts` | `requireBoundStudentCaller(request, studentId)`. Header/query is a claim only. |
| **PG3** | CRITICAL | Join | `POST /api/playground/join` trusts body `studentId`. Unauth 722 + fake passcode reaches passcode lookup (404 Invalid passcode). | `join/route.ts` L40–48; live 404 | `join/route.ts` | `requireBoundStudentCaller`. Use bound db id; ignore mismatched body `studentId`. |
| **PG4** | HIGH | Questions | `GET /api/playground/questions` has no caller check. Session 153 leaked 4 stems/options. `correct_answer` is selected in SQL but omitted from JSON (keep it omitted). | `questions/route.ts` L16–80; live 200 n=4 | `questions/route.ts` | Require bound student who has a `playground_results` row for that session (or instructor session). Unauth → 401. |
| **PG5** | HIGH | Writes | `submit` / `complete` / `my-answers` take `resultId` only. Submit can return `correctAnswer` when already answered. | `submit/route.ts` L23–37, L238–246; live submit 404 | those routes | Bind caller; result must belong to bound student. Do not return `correctAnswer` to the client. |
| **PG6** | HIGH | Policy / sets | `policy` and `practice-sets` use `resolveStudentCourseContextFromRequest` (header/query student, **no** `requireBoundStudentCaller`). | helper L104–111; live header 722/723 200 | those two playground routes only | Call `requireBoundStudentCaller` in the playground routes. **Do not** rewrite the shared helper (calendar/syllabus/schedule-adjustment callers). |
| **PG7** | HIGH | Lobby / board | Unauth lobby returns sessionCode/isActive. Unauth leaderboard is 200 empty. Viewer from query/`x-student-id` only. | live lobby 153 200; `leaderboard-viewer.ts` L12–16 | `lobby/route.ts`, `leaderboard/route.ts` | Session-bind. Lobby `resultId` must belong to caller when present. |
| **PG8** | MEDIUM | Tests | Script treats join 400 as auth pass; instructor 401 fails IDOR checks; no fail for unauth credits 200 or admin start 200; F-002 uses header-only faculty. | `audit-playground-production.mjs` L65–103, L109+ | same file | Accept instructor header **401** as pass. **Fail** unauth credits 200 and unauth admin/start 200. Fail header-only student policy 200. F-002 create 401 → `instructor session required` (do not fake pass). Do not call `/api/playground/admin/start`. |

Already closed (do not re-fix): faculty `instructorRequest`; `requireInstructorCourse` on `/api/instructor/playground/*`; student `collaboration-api` `request()` → `studentAuthenticatedRequest`; faculty hub refresh/topic/detail error banners (F-004/F-005); F-006 meta; F-008 rules link.

## Local repairs (source only — production unpatched)

Verified by re-reading files after the fix agent (not from the agent summary):

- PG1: all leftover `/api/playground/admin/*` + `sync-points` call `requireInstructorSession`. Start deactivates via `resolvePlaygroundClassroomInstructorScopeSql` / instructor course filter — not every CLASSROOM row.
- PG2–PG3: credits, personal, scores, join use `requireBoundStudentCaller` before lookups.
- PG4–PG7: questions require a joined result; submit/complete/my-answers check ownership and no longer return `correctAnswer`; policy/practice-sets bind first; lobby/leaderboard session-bind (viewer takes a bound db id).
- PG8: audit script fails unauth credits/admin status/topics 200, header-only policy 200, join-with-studentId 404, and header-only questions 200. Does not POST admin/start.
- Contract: `npx tsx --test lib/playground-request-auth.contract.test.ts` 2/2.

Live unauth credits and admin/start are still **200** until v0 deploy. Status remains BLOCKED.

---

## Required Before Ship

1. PG1–PG3 in source, then deploy v0.
2. PG4–PG7 bind + no answer-key in submit JSON.
3. Honest `audit:playground-production` (PG8).
4. Re-probe: unauth credits and admin/start must not be 200. Unauth questions must not return stems.

## Future Improvements

- Remove `playground` from `WEB_ONLY_MODULE_IDS` or document why it remains.
- Simulator faculty create → student join E2E after cookies exist.

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 86 |
| UI | 82 |
| Buttons | 78 |
| API | 28 |
| CRUD | 55 |
| Authentication | 18 |
| Authorization | 16 |
| Student Isolation | 12 |
| Course Isolation | 40 |
| Membership | 45 |
| Production Configuration | 88 |
| Data Integrity | 20 |
| Security | 14 |
| Assessment Security | 22 |
| Cora Security | n/a |
| Error Handling | 74 |
| Mobile UX | 78 |
| Performance | 76 |
| Accessibility | 68 |
| Testing | 30 |

**Overall Module Score:** 38/100  

**Final Status:** BLOCKED BY SECURITY / DATA ISSUE  

**Audited at:** 2026-08-18T03:55:00.000Z
