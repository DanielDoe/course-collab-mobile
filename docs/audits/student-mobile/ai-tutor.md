# Cora Assistant — Student Mobile Production Audit

```
MODULE: Cora Assistant
STUDENT ROUTE: /module/ai-tutor
NAVIGATION GROUP: Learning Center (student-nav.ts L51–61)
REGISTRY ENTRY: ai-tutor → AiTutorScreen (registry.tsx L84)
PRIMARY SCREEN: expo/src/components/ai-tutor/AiTutorScreen.tsx
RELATED SCREENS:
  - StudentCoraHubView.tsx
  - CoraImmersiveChat.tsx
  - CoraWorkspaceTab / CoraLearnTab / CoraSolveTab / CoraCodeTab / CoraInsightsTab / CoraStudyPlanTab / CoraToolsTab / CoraPreferencesTab
  - CoraToolFlowSheet.tsx, CoraActionCard.tsx, CoraOverlayShell.tsx
SUBROUTES: none under /module/ai-tutor (overlay sections, not file routes)
API ROUTES:
  GET  /api/ai-tutor/stats?studentId=
  GET  /api/ai-tutor/recommendations?studentId=
  GET  /api/ai-tutor/credits?studentId= (legacy fallback)
  GET  /api/ai-tutor/progress-detailed?studentId=
  GET  /api/ai-tutor/student-context
  POST /api/ai-tutor
  GET  /api/cora/credits/balance?role=student
  GET  /api/cora/usage/activity
  GET  /api/cora/student-capabilities
  GET/POST/DELETE /api/cora/workspace-conversations
  POST /api/cora/workspace-actions
  POST /api/cora/session
  POST /api/cora/question-import
  POST /api/cora/actions/confirm?studentDatabaseId=
  POST /api/cora/scope/feedback
SERVICES: ai-tutor-api.ts, cora-api.ts, cora/credits/api.ts, cora/confirm-action.ts, student-module-registry.ts, cora-rbac
DATABASE MODELS: UNVERIFIED (not in this repo)
MEMBERSHIP: Explorer (drawer locked + StudentThemedLocked). Review demo students are Scholar.
CORA INTEGRATION: this module is Cora
FACULTY DEPENDENCY: faculty-published course content in studentContext; faculty Cora is a separate screen (/module/cora)
ADMIN DEPENDENCY: none observed on this surface
WEB DEPENDENCY: module-web-paths ai-tutor → /student/dashboard-v2/ai-tutor
```

Size: VERY LARGE — manifest at `docs/audits/student-mobile/ai-tutor/manifest.json`  
Audited: 2026-08-17T21:50:00-05:00  
Commit: working tree (not a git sha this run)  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Cora Assistant**. The “Faculty Expo only” scope line is treated as faculty → student downstream (course context Cora can read). This is **not** a faculty Cora Copilot audit.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **44/100**  
Blockers: 0  
Critical: 4  
High: 3  
Medium: 4  
Low: 3

Student Cora is a native Learning Center module: hub, immersive chat, overlays (workspace, learn, solve, code, insights, study plan, tools, preferences), credit economy, and propose→confirm tools. Production API base is HTTPS production. Chat client sends cookies + `x-student-id`.

**Production probes (2026-08-17):**

| Call | Result |
|------|--------|
| Unauth GET stats / recommendations / progress-detailed + `studentId` | **200** |
| Unauth POST `/api/ai-tutor` | **401** |
| Unauth credits balance / capabilities / conversations / confirm | **401** |
| Header-only `x-student-id` GET student-context | **200** profile, grades, notes, flashcards, calendar, attempts |
| Header-only GET workspace-conversations | **200** |
| Header-only POST `/api/ai-tutor` | **200** (chat ran; response text not logged) |
| Header-only POST confirm (empty proposal) | **400** `proposal required` — auth accepted |
| GET `/api/cora/credits/balance` header-only | **401** |

Membership Explorer is **client-only** (`hasNavAccess` + locked screen). `/module/[id]` does not consult `minTier`. A Scholar who deep-links still hits the lock UI, but the server accepted header-only chat for the review student id.

Tool create→confirm E2E (notes, flashcards, calendar, practice) was **not** executed. `confirmStudentCoraAction` now sends cookies + MFA via `studentAuthenticatedRequest`. Production confirm still accepted header-only identity (F-004 server UNFIXED).

---

## Architecture

Student Drawer “Cora Assistant” (Explorer lock)  
→ `/module/ai-tutor`  
→ `registry.tsx` `ai-tutor`  
→ `AiTutorScreen`  
→ hub / immersive chat / overlay tabs  
→ `aiTutorApi.streamMessage` → `POST /api/ai-tutor`  
→ `coraCreditsApi` / `cora-api` / `confirmStudentCoraAction`  
→ production Cora + student-context services  
→ server currently accepts `x-student-id` as enough for context, conversations, and chat

---

## Files Inspected

- `expo/src/constants/student-nav.ts` (L61, `hasNavAccess`)
- `expo/src/modules/registry.tsx` L84
- `expo/app/(app)/module/[id].tsx` (no tier check)
- `expo/src/components/ai-tutor/AiTutorScreen.tsx`
- `expo/src/lib/ai-tutor-api.ts`
- `expo/src/lib/cora-api.ts`
- `expo/src/lib/cora/confirm-action.ts`
- `expo/src/lib/cora/credits/api.ts`
- `expo/src/lib/cora/student-module-registry.ts`
- `expo/src/lib/cora-rbac/*`, `cora/credits/economy.ts`
- `.cursor/skills/cora-student-tools/SKILL.md`

---

## Navigation & Routing

**Status:** PARTIAL

- Learning Center → **Cora Assistant** → `/module/ai-tutor`, `locked: true`, `minTier: "Explorer"`.
- Registry resolves `AiTutorScreen` for student portal only.
- Direct `/module/ai-tutor` works; Scholar sees `StudentThemedLocked` after membership loads.
- Route renderer does **not** enforce tier (F-005).
- Faculty `/module/cora` is a different registry. Guest Cora Career is `/module/cora-assistant` — not this module.

---

## Production Configuration

**Production API verified:** YES (`API_BASE_URL` → `https://coursecollab.vercel.app`)

**Development URLs:** None in ai-tutor / cora client paths.

**Mock dependencies:** `executeLocalCoraProposal` is for offline **faculty** drafts (`local-proposals.ts`). Student confirm is supposed to hit `/api/cora/actions/confirm`.

---

## Screens

ACTIVE: hub, immersive chat, overlay tabs listed above.  
PLACEHOLDER: none proven.  
UNVERIFIED E2E: Code / vision / file import / study-plan generation / tool sheets.

---

## Components

| Component | Class |
|-----------|--------|
| AiTutorScreen | ACTIVE |
| StudentCoraHubView | ACTIVE |
| CoraImmersiveChat | ACTIVE |
| Overlay tabs | ACTIVE (code-traced) |
| CoraActionCard | ACTIVE |
| StudentThemedLocked | ACTIVE |
| Local faculty proposals | LEGACY / faculty-only |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Open chat | Hub | immersive send | POST /api/ai-tutor | Session + Explorer | Unauth 401; header-only **200** | FAIL |
| Upgrade | Locked | `/membership` | — | Scholar blocked | Client lock only | PARTIAL |
| Confirm proposal | Action card | `confirmStudentCoraAction` | POST confirm | Session | Header-only reaches 400 | FAIL |
| Credits | Hub | `getStudentBalance` | GET balance | Auth | Unauth/header **401** | PASS |
| New chat / history | Workspace | cora-api conversations | GET/POST | Auth | Header-only GET **200** | FAIL |
| Tool tiles | Tools / hub | capability → chat/flow | various | Confirm card | UNVERIFIED E2E | UNVERIFIED |

---

## Menus / Action Sheets

Cora overlay sections and `CoraToolFlowSheet`. Traced; not sim-executed.

---

## Modals

Expensive-task confirm (`409` / `needsConfirmation`). Locked upgrade. Exchange-limit alert. Traced.

---

## Forms

Chat composer (text + optional imported problem). Client blocks empty send, Explorer, lite/credits. Server membership UNVERIFIED (header-only chat succeeded).

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/ai-tutor/stats?studentId=` | getStats | query id | none (unauth 200) | none | none | FAIL |
| GET | `/api/ai-tutor/recommendations?studentId=` | getRecommendations | query id | none | none | none | FAIL |
| GET | `/api/ai-tutor/progress-detailed?studentId=` | getProgressDetailed | query id | none | none | none | FAIL |
| GET | `/api/ai-tutor/student-context` | getStudentContext | x-student-id | header 200 PII | none | student dump | FAIL |
| POST | `/api/ai-tutor` | streamMessage | cookie **or** header | header 200 chat | none observed | body studentId | FAIL |
| GET | `/api/cora/credits/balance` | getStudentBalance | session | 401 unauth/header | — | — | PASS |
| GET | `/api/cora/student-capabilities` | (registry/web) | session | 401 unauth | — | — | PASS |
| GET | `/api/cora/workspace-conversations` | sync history | x-student-id | header 200 | — | — | FAIL |
| POST | `/api/cora/actions/confirm` | confirmStudentCoraAction | x-student-id (no cookie on client) | header 400 not 401 | — | — | FAIL |

---

## CRUD

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create chat | Yes | Yes | Header-only 200 | FAIL isolation |
| Read stats/context | Yes | Yes | Unauth/header 200 | FAIL |
| Update / confirm tools | Yes | Yes | Confirm auth-by-header | UNVERIFIED write |
| Delete conversation | Yes (`deleteWorkspaceConversation`) | Yes | No | UNVERIFIED |
| Restore | N/A | — | — | N/A |

---

## Authentication

**Status:** FAIL

Chat POST without headers **401**. Same POST with only `x-student-id` **200**. Stats/recommendations/progress **200** with no headers. Confirm accepts header identity.

---

## Student Authorization

**Status:** FAIL

Identity is query/header `studentId`. Client is untrusted. Confirm client now sends cookies (F-007 local); server still accepts header-only (F-004).

---

## Cross-Student Isolation

**Status:** FAIL

Unauth GET stats for `910000001` **200**. Header `x-student-id: 999999` still returned stats for query `910000001` **200** (query wins). Student-context with header of the review id returned that student’s grades/notes keys.

---

## Course / Section Isolation

**Status:** UNVERIFIED / PARTIAL

`studentContext` is a cross-module dump. Course filter `filterStudentContextForCora` is client-side before POST. Server scope UNVERIFIED. Faculty course content appears because Cora reads student-visible course data — expected if session-bound; not proven.

---

## Membership Enforcement

**Status:** FAIL (server)

| Tier | UI | Server | Status |
|------|-----|--------|--------|
| Scholar | Locked + drawer lock | Header-only chat **200** | FAIL |
| Explorer | Unlocked | UNVERIFIED | UNVERIFIED |
| Trailblazer | Code tab extra | Client-only Trailblazer check for code capability | UNVERIFIED |

Review demo students are Scholar — they cannot use the UI; the API still can.

---

## Security

CRITICAL open reads + header-only chat/context. Do not log context bodies or Cora completions.

---

## Assessment Security

Registry + `get_assessment_integrity` intended. Whether POST `/api/ai-tutor` refuses answer keys during an active attempt is **UNVERIFIED** this run (no live attempt). Mark UNVERIFIED, not PASS.

---

## Cora Security

**Status:** FAIL

Capabilities registry exists. Confirm is header-authenticated. Chat ran without a cookie. Credits balance is the only probed Cora route that stayed 401 with header-only.

---

## Database Integrity

UNVERIFIED (backend not in repo). Accidental header-only chat may have written a thread/usage row.

---

## Files / Documents

Question import `/api/cora/question-import` traced, not probed with a file. UNVERIFIED.

---

## Notifications

No dedicated Cora drawer badge. UNVERIFIED.

---

## Mobile UX

**Status:** PASS (code)

Native hub, immersive chat, dock-style overlays, locked upgrade CTA. Not sim-walked this run.

---

## Theme

**Status:** PASS (code)

Themed student native + Cora tokens. Dark mode supported via appearance.

---

## Accessibility

**Status:** PARTIAL

Locked screen and composer exist. Full a11y pass UNVERIFIED.

---

## Errors / Loading / Empty States

**Status:** PASS (code)

Membership spinner, session-required copy, stream `onError`, credit/lite alerts, recommendations `.catch([])`.

---

## Performance

**Status:** PARTIAL

Hub loads stats + credits + history. Context enrich on send. N+1 risk UNVERIFIED.

---

## Web / Mobile Integration

Web path mapped. History sync claims workspace parity. Cross-client thread UNVERIFIED.

---

## Faculty → Student Integration

Cora reads faculty-published lectures/notes/assessments via student-context. Faculty cannot be audited as “this module.” Downstream write tools (notes/flashcards) UNVERIFIED E2E.

---

## Tests

`audit:ai-tutor-production` probes GET + empty confirm (no chat POST). Contract test: `confirm-action.contract.test.ts`. Economy helpers may have tests elsewhere — not relied on. F-007 client cookies are local; production 200s remain FAIL.

---

## End-to-End Results

| Workflow | Result |
|----------|--------|
| Scholar opens Cora | Client lock traced; not sim |
| Explorer chat | UNVERIFIED (review acct is Scholar) |
| Unauth stats/recs/progress | 200 |
| Header-only chat | 200 |
| Header-only context | 200 |
| Credits balance | 401 without session |
| Confirm proposal | Header 400; cookie path unused |
| Tool confirm → note/deck | UNVERIFIED |
| Assessment integrity | UNVERIFIED |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Unauth stats/recs/progress + studentId | 200 CRITICAL |
| Unauth chat POST | 401 |
| Header-only context | 200 CRITICAL |
| Header-only chat | 200 CRITICAL |
| Header-only confirm | 400 (auth passed) CRITICAL |
| Header-only credits | 401 |
| Query studentId vs other header | Query wins — 200 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | CRITICAL | Auth | Unauth GET stats/recommendations/progress-detailed 200 | Production `?studentId=910000001` → 200 | backend `/api/ai-tutor/*` (not in repo) | Require student session; 401 without cookie |
| F-002 | CRITICAL | Auth | Header-only `x-student-id` returns student-context PII | Production GET student-context → 200 keys include profile, grades, notes, attempts | backend student-context | Bind to session; ignore spoofed header |
| F-003 | CRITICAL | Auth | Header-only POST `/api/ai-tutor` returns 200 and runs Cora | Production POST with `x-student-id` only → 200 | backend `/api/ai-tutor` | Require session; charge/scope from session |
| F-004 | CRITICAL | Auth | Confirm accepts header identity; client sends no cookies | Confirm header-only → 400 proposal required; `confirm-action.ts` L75–83 | confirm-action.ts + backend confirm | Client: cookies + credentials; server: session only |
| F-005 | HIGH | Membership | Explorer gate is UI-only; `/module/[id]` has no minTier | AiTutorScreen L220/L1742; module/[id].tsx | backend chat + route | Server 403 for Scholar; optional route gate |
| F-006 | HIGH | Isolation | Stats query `studentId` ignores conflicting `x-student-id` | Header 999999 + query 910000001 → 200 | backend stats | Ignore query; use session id |
| F-007 | HIGH | Client | `confirmStudentCoraAction` omitted cookie/MFA headers | confirm-action.ts vs ai-tutor-api `tutorHeaders` | confirm-action.ts | **Local client fixed** — now `studentAuthenticatedRequest` (cookies + MFA + session proof). Does **not** fix server F-004. |
| F-008 | MEDIUM | E2E | Tool confirm → notes/flashcards/calendar not executed | Audit-only | CoraActionCard | Disposable Explorer E2E after auth fix |
| F-009 | MEDIUM | Assessment | Integrity restrictions UNVERIFIED | No live attempt | assessment-integrity (server) | Probe active quiz + Cora |
| F-010 | MEDIUM | Meta | VERY LARGE module; code/vision/files UNVERIFIED | manifest | — | Follow-up workflow audits |
| F-011 | MEDIUM | Testing | No production audit script | — | expo/scripts | Added `audit:ai-tutor-production` (GET/confirm only; chat not re-run) |
| F-012 | LOW | UX | Scholar lock is after membership fetch only | AiTutorScreen L1733 | AiTutorScreen | Keep; not a substitute for F-005 |
| F-013 | LOW | Faculty | Faculty confirm also header-only | confirm-action.ts L37–58 | faculty Cora | Separate faculty audit |
| F-014 | LOW | Credits | Legacy `/api/ai-tutor/credits` 404 | Production 404 Student not found | ai-tutor-api.ts L266–277 | Safe fallback; primary balance 401 is correct |

---

## Required Before Ship

1. **F-001 / F-002 / F-003 / F-004** — Session-required Cora reads, chat, context, conversations, and confirm. Header/query `studentId` must not authenticate.
2. **F-005** — Server membership: Scholar cannot chat or load Cora context.
3. **F-007** — Mobile confirm now sends cookie/MFA headers via `studentAuthenticatedRequest` (does **not** replace server F-004).

Do not mark READY until production re-probes flip the 200s to 401/403.

---

## Future Improvements

Workflow audits for code/vision/files; assessment-integrity E2E; production script; CoraActionCard a11y; FlashList on long workspace history.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 84 |
| Routing | 78 |
| UI | 82 |
| Buttons | 70 |
| API | 35 |
| CRUD | 40 |
| Authentication | 22 |
| Authorization | 28 |
| Student Isolation | 20 |
| Course Isolation | 45 |
| Membership | 40 |
| Production Configuration | 90 |
| Data Integrity | 50 |
| Security | 18 |
| Assessment Security | 40 |
| Cora Security | 20 |
| Error Handling | 78 |
| Mobile UX | 84 |
| Performance | 70 |
| Accessibility | 72 |
| Testing | 15 |

OVERALL SCORE: 44/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` key `ai-tutor`.
