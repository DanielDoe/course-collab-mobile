# CodeBench IDE — Student Mobile Production Audit

```
MODULE: CodeBench IDE
STUDENT ROUTE: /module/codebench
NAVIGATION GROUP: Learning Center
REGISTRY ENTRY: codebench → CodebenchScreen (expo/src/modules/registry.tsx)
PRIMARY SCREEN: expo/src/components/codebench/CodebenchScreen.tsx
RELATED SCREENS:
  - expo/src/components/codebench/CodebenchIdeScreen.tsx
  - expo/app/(app)/codebench/ide.tsx
  - CodebenchAskCoraPanel, CodebenchCoraAttachMenu, CodebenchWalkthroughPanel, CodebenchAiFullscreenShell
SUBROUTES: /codebench/ide, /codebench/ide?tool=<id>
API ROUTES (mobile-called):
  GET  /api/codebench/streak?studentId=
  POST /api/codebench/streak
  GET  /api/codebench/badges?studentId=
  GET  /api/codebench/leaderboard?studentId=
  GET  /api/codebench/submissions?studentId=
  POST /api/codebench/daily-challenge
  POST /api/explain
  POST /api/debug
  POST /api/improve
  POST /api/pseudocode
  POST /api/ai-tutor
  POST /api/codebench/evaluate
  POST /api/codebench/replay
  POST /api/codebench/submit
  POST /api/codebench/practice/submit
  GET  /api/classroom-points/submissions
RELATED (not called by native IDE): POST /api/compile, GET /api/codebench/analytics, POST /api/codebench/daily-challenge/submit
SERVICES: expo/src/lib/codebench-api.ts, codebench-prefs.ts, codebench-progress.ts, codebench-replay.ts
DATABASE MODELS: codebench_submissions, practice_submissions, daily_challenge_submissions, student_achievements, pending_practice_points
MEMBERSHIP: Trailblazer (nav locked: true, minTier Trailblazer). Scholar/Explorer must not access.
CORA INTEGRATION: in-IDE tools (explain/debug/improve/pseudocode/walkthrough/tutor/practice/evaluate); CoraCodeTab → /module/codebench
FACULTY DEPENDENCY: classroom-points assignments; instructor approve of pending practice points
ADMIN DEPENDENCY: none dedicated
WEB DEPENDENCY: /student/dashboard-v2/codebench
```

Size: LARGE (this run: hub + IDE editor + Cora tools + membership + auth/isolation; not Analytics & More)  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Codebench IDE**. Scope line “Faculty Expo only” is treated as faculty → student downstream (classroom assignments). This is the **student** CodeBench IDE.

---

## Executive Summary

Readiness: **READY WITH MINOR FIXES** (local remediations; live API still unpatched)  
Score: **78/100** (local) / 42/100 (live until v0 deploy)  
Blockers: 0  
Critical: 0 open (5 fixed locally)  
High: 0 open (4 fixed locally)  
Medium: 3 open (F-011, F-012, F-013)  
Low: 1 open (F-016)

Native hub + immersive IDE exist and are wired. Drawer and hub gate Trailblazer. **No `/api/codebench/*` route uses session auth** — identity is query/body `studentId`. Live production probes (2026-08-18, no cookies):

| Probe | Status | Evidence |
|-------|--------|----------|
| GET `/api/codebench/badges?studentId=1` | **200** | empty badge object, no session |
| POST `/api/codebench/streak` `{studentId:1}` | **200** | `{success:true}` |
| POST `/api/codebench/evaluate` `{code, studentId:1}` | **200** | questions **including `correctAnswer`** |
| POST `/api/explain` `{code}` no studentId | **200** | full AI explanation |
| POST `/api/codebench/replay` `{code}` no studentId | **200** | walkthrough steps |
| POST `/api/compile` `{code}` no studentId | **200** | Judge0 **Accepted** |
| GET `/api/codebench/submissions?studentId=1` | 403 | Trailblazer required (membership on **claimed** id, not caller) |
| POST `/api/codebench/submit` `{studentId:999999}` | 404 | existence oracle |
| GET `/api/classroom-points/submissions` | 401 | correctly denied |

Simulator Maestro pass: **UNVERIFIED**. Database write verification: **UNVERIFIED**.

---

## Architecture

Student Drawer (`codebench`, Trailblazer)
→ `/module/codebench` → `MODULE_RENDERERS.codebench` → `CodebenchScreen`
→ `openIde()` → `/codebench/ide` → `CodebenchIdeScreen` (immersive, chrome hidden)
→ `codebench-api.ts` (`x-student-id` + `x-student-session` only — **no refresh cookie / MFA trust**)
→ production `https://coursecollab.vercel.app`
→ `/api/codebench/*` trusts body/query `studentId`
→ `codebench_submissions` / OpenAI / Judge0

---

## Files Inspected

- `expo/src/constants/student-nav.ts`
- `expo/src/modules/registry.tsx`
- `expo/app/(app)/module/[id].tsx`
- `expo/app/(app)/codebench/ide.tsx`
- `expo/src/components/codebench/CodebenchScreen.tsx`
- `expo/src/components/codebench/CodebenchIdeScreen.tsx`
- `expo/src/lib/codebench-api.ts`
- `expo/src/lib/codebench-prefs.ts`
- `expo/src/lib/student-api.ts` (session-proof header pattern)
- `v0-coursecollabv3/app/api/codebench/{submissions,evaluate,badges,streak,submit,replay}/route.ts`
- `v0-coursecollabv3/app/api/{explain,compile}/route.ts`
- `v0-coursecollabv3/lib/student-api-auth.ts`, `lib/require-student-api-auth.ts`

---

## Navigation & Routing

Nav label, group, icon, Trailblazer lock: **PASS** (drawer).  
Hub `openIde` re-checks Trailblazer: **PASS**.  
`/codebench/ide` has **no** `StudentThemedLocked` / `hasNavAccess` — deep link bypasses hub UI. API may still 403 for Scholar if `studentId` is sent.  
`getStudentActiveNavItemId` matches `/module/codebench` only — IDE route does not highlight CodeBench.

---

## Production Configuration

Production API verified: `API_BASE_URL` → `https://coursecollab.vercel.app`.  
Development URLs: none hardcoded in CodeBench files.  
Mock dependencies: walkthrough fallback sample when code &lt; 10 chars (`codebench-samples.ts`).

---

## Screens

| Screen | Loading | Empty | Error | Locked | Status |
|--------|---------|-------|-------|--------|--------|
| CodebenchScreen | spinner | no-session / empty leaderboard | AppErrorScreen retry | StudentThemedLocked | ACTIVE |
| CodebenchIdeScreen | “Opening CodeBench…” | “Add some code” alert | AppAlert | **missing** | ACTIVE — membership UI gap |

---

## Components

| Component | Class |
|-----------|--------|
| CodebenchScreen / CodebenchIdeScreen | ACTIVE |
| AskCora / Attach / Walkthrough / AiFullscreen | ACTIVE |
| AnalyticsMoreScreen | sibling module, not this audit |
| `hashText` in IdeScreen | DEAD |
| Judge0 / native Run-to-compile | **ABSENT** on mobile |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Open editor | Hub | `openIde()` | none | IDE | IDE if Trailblazer | PASS (UI) |
| Daily challenge | Hub | `openIde("practice")` | none | challenge context | generic practice | FAIL (HIGH UX) |
| Submit and evaluate | Hub | `openIde("evaluate")` | evaluate | evaluate flow | opens IDE | PASS |
| **Run** | IDE | `runTool("evaluate")` | `/api/codebench/evaluate` | compile/run | comprehension quiz + answer keys | FAIL |
| Language / mode / Cora sheets | IDE | local state | none | pickers | pickers | PASS |
| Explain/Debug/Improve/Pseudo | IDE | codebench-api | `/api/*` | Trailblazer + session | membership skippable without studentId | FAIL |
| Walkthrough | IDE | replay | `/api/codebench/replay` | same | same | FAIL |
| Practice submit | IDE | `submitPractice` | practice/submit | real score | **hardcoded score: 7** | FAIL |
| Evaluate submit | IDE | `submit` | `/api/codebench/submit` | own record | trusts body studentId | FAIL |
| Cora tutor send | IDE | `aiTutor` | `/api/ai-tutor` | session | codebench-api omits cookies | UNVERIFIED / likely 401 |

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/codebench/submissions` | hub | **none** | claimed studentId | Trailblazer on **claimed** id | none | FAIL CRITICAL |
| GET | `/api/codebench/badges` | hub | **none** | none | none | none | FAIL CRITICAL (live 200) |
| POST | `/api/codebench/streak` | hub | **none** | none | none | none | FAIL (live 200) |
| GET | `/api/codebench/streak` | hub | none | claimed id | Trailblazer on claimed id | none | FAIL |
| GET | `/api/codebench/leaderboard` | hub | none | claimed id | Trailblazer/beta on claimed id | **global** | FAIL isolation |
| POST | `/api/codebench/evaluate` | IDE Run | **none** | none | **none** | none | FAIL CRITICAL (live 200 + keys) |
| POST | `/api/explain` (and debug/improve/pseudocode) | IDE | none | skip if no studentId | skip if no studentId | none | FAIL CRITICAL (live 200) |
| POST | `/api/codebench/replay` | IDE | none | skip if no studentId | skip if no studentId | none | FAIL CRITICAL (live 200) |
| POST | `/api/compile` | web only | none | skip if no studentId | skip if no studentId | none | FAIL CRITICAL (live Judge0 200) |
| POST | `/api/codebench/submit` | IDE | none | body studentId | Trailblazer unless assignment | none | FAIL CRITICAL |
| POST | `/api/codebench/practice/submit` | IDE | none | body studentId | Trailblazer/beta | none | FAIL CRITICAL |
| POST | `/api/ai-tutor` | IDE tutor | session (`requireCallerStudentDbId`) | bound | credits | course settings | PASS (backend) / client cookies missing |
| GET | `/api/classroom-points/submissions` | IDE assignments | session | bound | n/a | session | PASS (live 401) |

Zero matches for `requireStudentApiAuth` / `requireBoundStudentCaller` under `app/api/codebench/`.

---

## Authentication

`x-student-id` is not identity. CodeBench routes never call `requireCallerStudentDbId`. Mobile `codebench-api.ts` does not attach `studentHttpCookieHeader` / refresh / MFA trust (unlike `student-api.ts`).

---

## Student Authorization

Students cannot hit faculty classroom approve APIs from this module (those routes use instructor auth). They **can** write `codebench_submissions` / `practice_submissions` / `pending_practice_points` as any `studentId` they send. They **can** trigger unauthenticated OpenAI and Judge0.

---

## Cross-Student Isolation

**FAIL.** GET submissions returns `code TEXT` for the query `studentId` with no caller bind. Scholar id 1 → 403 (tier), not 401. A Trailblazer victim id would leak source. Writes trust body `studentId`.

---

## Course / Section Isolation

Leaderboard and streak are student-global, not course-scoped. Classroom assignments are session-scoped (correct). Switching courses does not re-scope CodeBench XP/leaderboard.

---

## Membership Enforcement

Hub UI: PASS.  
Server: Trailblazer checked against **claimed** `studentId` on some routes; **skipped** when `studentId` omitted (explain/compile/replay). `/api/codebench/evaluate` and badges have **no** membership check. Live Scholar `studentId=1` still received evaluate questions.

Client can send `membershipTier: "Trailblazer"` in Cora prepare envelope — `/api/ai-tutor` ignores client tier (UNVERIFIED beyond existing Cora path). CodeBench AI tools do not use that envelope.

---

## Security

- Unauthenticated OpenAI spend (evaluate/explain/replay)
- Unauthenticated Judge0 compile (cost + remote execution)
- Answer keys in evaluate JSON before the student answers
- Submit 404 existence oracle for unknown studentId
- Header-only mobile identity

---

## Assessment Security

Evaluate is a comprehension quiz of the student’s own code, not a published exam. Still: live 200 returned `correctAnswer` in the question payload. IDE scores locally using those keys (`finishEvaluate`). Premature key exposure: **CRITICAL** for this flow.

---

## Cora Security

Explain/debug/improve/pseudocode/replay are not behind session auth. `/api/ai-tutor` is. Mobile CodeBench tutor calls `ai-tutor` **without** session cookies — likely 401 on production unless cookies happen to be present. Cora `code_assistant` client guard requires Trailblazer.

---

## Database Integrity

Tables created inline in submit routes (`CREATE TABLE IF NOT EXISTS`). Practice submit accepts client `score`. IDE sends `score: 7` always.

---

## Mobile UX

Native grouped hub + immersive IDE. Gold **Run** label implies execution; it starts Evaluate. No file tree / save / stdin. Dual XP: SecureStore local vs API leaderboard.

---

## Tests

No CodeBench-specific Expo auth tests found. Production probes this run: 12 requests (table above). Simulator: UNVERIFIED.

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | **CRITICAL** | Auth | No session bind on `/api/codebench/*`. `studentId` from query/body is identity. | Grep: zero `requireBoundStudentCaller` in `app/api/codebench`. Live badges/streak/evaluate 200 with no cookies. | `app/api/codebench/**` | **FIXED locally** — `requireCodebenchStudent` on all listed CodeBench + compile/explain/debug/improve/pseudocode routes; production re-probe pending |
| F-002 | **CRITICAL** | Isolation | GET submissions returns source code for any claimed Trailblazer `studentId`. Membership is on claimed id, not caller. | `submissions/route.ts` L8–36; live Scholar 403 (not 401) | `submissions/route.ts` | **FIXED locally** — 401 no session; 403 mismatch; SQL uses session `studentDbId` |
| F-003 | **CRITICAL** | Membership / spend | `/api/explain` (and debug/improve/pseudocode/replay/compile) skip membership when `studentId` omitted. | Live POST `/api/explain` no sid → 200 explanation; compile → Judge0 Accepted | `app/api/explain/route.ts`, `compile/route.ts`, `replay/route.ts` | **FIXED locally** — always `requireCodebenchStudent` before OpenAI/Judge0 |
| F-004 | **CRITICAL** | Evaluate | `/api/codebench/evaluate` has no auth and no membership; returns `correctAnswer` + `explanation`. | Live 200 with keys; `evaluate/route.ts` L22–31, L126–129 | `evaluate/route.ts`, IdeScreen `finishEvaluate` | **FIXED locally** — session + Trailblazer; questions mapped to `{question,type,options}`; IDE submits score 0 |
| F-005 | **CRITICAL** | Execution | Unauthenticated `POST /api/compile` runs Judge0. | Live 200 `status: Accepted` | `app/api/compile/route.ts` | **FIXED locally** — `requireCodebenchStudent` before Judge0 |
| F-006 | HIGH | Client auth | `codebench-api.ts` sends only `x-student-id` / `x-student-session` — no cookie/refresh/MFA. | L7–18 vs `student-api.ts` `studentAuthenticatedHeaders` | `expo/src/lib/codebench-api.ts` | **FIXED locally** — `studentAuthenticatedHeaders` + cookie persist |
| F-007 | HIGH | Membership UI | `/codebench/ide` has no Trailblazer lock; hub can be bypassed by deep link. | IdeScreen L126–129; no `hasNavAccess` | `CodebenchIdeScreen.tsx` | **FIXED locally** — `hasNavAccess` + `StudentThemedLocked`; tools do not run when locked |
| F-008 | HIGH | Integrity | Practice submit hardcodes `score: 7`. | IdeScreen L430–434 | `CodebenchIdeScreen.tsx` | **FIXED locally** — client omits score; practice/submit and submit ignore client score (store 0) |
| F-009 | HIGH | UX / contract | Gold **Run** calls Evaluate, not compile. Mobile never calls `/api/compile`. | IdeScreen L748–761 | IdeScreen | **FIXED locally** — visible label is Evaluate (same handler) |
| F-010 | MEDIUM | Oracle | Submit unknown `studentId` → 404 “Student not found”. | Live POST submit 999999 → 404 | `submit/route.ts` | **FIXED locally** — 401 first; 403 mismatch; no unauth existence lookup |
| F-011 | MEDIUM | Course | Leaderboard/streak are global, not course-scoped. | `leaderboard/route.ts` | leaderboard | Scope by course/section if product requires |
| F-012 | MEDIUM | Challenge | Daily challenge card opens generic `tool=practice` with no challenge payload. | CodebenchScreen L611–614 | CodebenchScreen | Pass challenge id/prompt into IDE |
| F-013 | MEDIUM | XP | Local SecureStore XP ≠ API leaderboard XP. | `codebench-prefs.ts` vs submissions | prefs / hub | Single source of truth |
| F-014 | LOW | Nav | `/codebench/ide` not treated as active CodeBench in drawer. | `student-nav.ts` `getStudentActiveNavItemId` | student-nav.ts | **FIXED locally** — `/codebench/ide` maps to `codebench` |
| F-015 | LOW | Dead code | `hashText` unused; unused `isCoraAccessDeniedError` import. | IdeScreen | IdeScreen | **FIXED locally** — unused `hashText` and `isCoraAccessDeniedError` removed |
| F-016 | LOW | Copy | Cora Code tab says “C++ and MATLAB”; IDE has 13 languages. | CoraCodeTab | CoraCodeTab | Align copy |

---

## Required Before Ship

1. **Deploy `v0-coursecollabv3`** so live probes stop returning 200 on unauth badges/streak/evaluate/explain/replay/compile.
2. Remaining non-ship-blockers: F-011 course-scoped leaderboard, F-012 daily-challenge deep link, F-013 unified XP, F-016 Cora copy.

---

## Future Improvements

Course-scoped leaderboard, real compile/run in the IDE, daily-challenge deep link, unified XP, Cora Code tab copy.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 88 |
| Routing | 82 |
| UI | 78 |
| Buttons | 78 |
| API | 80 |
| CRUD | 75 |
| Authentication | 82 |
| Authorization | 80 |
| Student Isolation | 80 |
| Course Isolation | 45 |
| Membership | 82 |
| Production Configuration | 90 |
| Data Integrity | 72 |
| Security | 78 |
| Assessment Security | 80 |
| Cora Security | 75 |
| Error Handling | 72 |
| Mobile UX | 74 |
| Performance | 70 |
| Accessibility | 55 |
| Testing | 55 |

OVERALL SCORE: **78/100** (local)

FINAL STATUS: **READY WITH MINOR FIXES** — deploy v0 before treating live as ship-ready.

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` key `codebench`.
