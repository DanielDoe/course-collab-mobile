# AI Notetaker — Student Mobile Production Audit

```
MODULE: AI Notetaker
STUDENT ROUTE: /module/ai-notetaker
NAVIGATION GROUP: Learning Center
REGISTRY ENTRY: MODULE_RENDERERS["ai-notetaker"] → NotetakerHomeScreen
PRIMARY SCREEN: NotetakerHomeScreen (expo/src/components/notetaker/NotetakerHomeScreen.tsx)
RELATED SCREENS: NotetakerCaptureScreen, NotetakerNoteDetailScreen, NotetakerChatPanel, NotetakerLiveCaptions, NotetakerProcessingOverlay, NotetakerTitleSheet
SUBROUTES: /notetaker/capture, /notetaker/[noteRef]
API ROUTES:
  GET|POST /api/student/ai-notetaker
  GET|PATCH|DELETE /api/student/ai-notetaker/[noteId]
  GET|POST /api/student/ai-notetaker/[noteId]/audio
  POST /api/student/ai-notetaker/[noteId]/chat
  POST /api/student/ai-notetaker/live-caption-chat
  POST /api/student/ai-notetaker/client-log
SERVICES: expo/src/lib/notetaker-api.ts, notetaker-export.ts, notetaker-archive-storage.ts, use-notetaker-live-captions.ts
DATABASE MODELS: student_ai_notetaker_notes, student_ai_notetaker_chat_usage (inferred from SQL in backend routes)
MEMBERSHIP: minTier Explorer (nav lock); Trailblazer for in-note AI chat; limits in v0/lib/ai-notetaker-limits.ts
CORA INTEGRATION: none on notetaker surfaces (separate student-module-registry entry only)
FACULTY DEPENDENCY: none (student-owned notes)
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: shared backend APIs; live-caption-chat may be web-only (UNVERIFIED mobile usage)
```

Size: **MEDIUM**  
Audited: 2026-08-17 (revalidated local repairs 2026-08-18)  
Commit: `dba7f46` (audit baseline); local repairs uncommitted  
Production API: `https://coursecollab.vercel.app` — **still unpatched** (header-only probe returns 403 NOTETAKER_TIER, not 401)

Invocation: **student-mobile-module-audit** / **AI Notetaker** / Production Readiness. Scope: Expo student mobile + required backend + student-facing downstream (no faculty Manage UI).

Execution: code trace + production HTTPS probe (unauthenticated). Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API behavior.

---

## Executive Summary

**Readiness:** BLOCKED BY SECURITY / DATA ISSUE (local repairs applied; production deploy + re-probe required)  
**Score:** 41/100 (pre-fix baseline) → **~62/100 projected** after deploy + IDOR re-probe  
**Blockers:** 0  
**Critical:** 4 (N1–N4 open on production; **N1–N3 fixed locally**)  
**High:** 4 (N5 fixed locally; N4/N6–N8 remain)  
**Medium:** 6  
**Low:** 5

The AI Notetaker module is wired in student nav (Explorer+ lock), has a complete mobile UX (home → record → process → detail → chat → export → delete), and calls production HTTPS. **Production APIs still accept a caller-supplied `studentDatabaseId` without session proof** until backend deploy.

**Local repairs (2026-08-18):**

- Backend: `lib/ai-notetaker-request-auth.ts` + `requireBoundStudentCaller` on all 6 route files; DELETE tier gate (N5).
- Mobile: `notetaker-api.ts` uses `studentAuthenticatedHeaders`, `credentials: "include"`, `assertProductionHttpsUrl`, `createApiAbortSignal`; authenticated audio playback headers on detail screen.
- Contract tests: `expo/src/lib/notetaker-auth.contract.test.ts`.

Production probe without cookies (unchanged until deploy):

```bash
curl "https://coursecollab.vercel.app/api/student/ai-notetaker?studentDatabaseId=722&limit=1"
# → 403 {"code":"NOTETAKER_TIER"}  (tier checked for victim id 722, not session-bound)
```

Additional risks: synchronous audio processing with `maxDuration = 300` vs 90-minute capture; public Vercel Blob `access: "public"` for audio; DELETE skips tier gate; Scholar review account cannot exercise module without upgrade.

---

## Architecture

Student Drawer (Learning Center → AI Notetaker, locked below Explorer)  
→ `/module/ai-notetaker`  
→ `registry.tsx` `ai-notetaker`  
→ `NotetakerHomeScreen`  
→ `/notetaker/capture` | `/notetaker/[noteRef]`  
→ `notetaker-api.ts` → `/api/student/ai-notetaker/*`  
→ `getStudentDatabaseIdFromRequest` (query/header only — **no session**)  
→ Postgres + Whisper/GPT processing + Blob storage

---

## Findings

| ID | Severity | Area | Finding | Evidence | Recommended Fix |
|----|----------|------|---------|----------|-----------------|
| N1 | CRITICAL | Auth | All ai-notetaker routes trust `studentDatabaseId` query/header without session | `lib/ai-notetaker-request.ts:4-11`; no `requireBoundStudentCaller` in any route | **FIXED locally** — `ai-notetaker-request-auth.ts` on all 6 routes; deploy + 401 re-probe |
| N2 | CRITICAL | Auth | Mobile sends header-only identity, no session proof | `notetaker-api.ts:76-82,270-273` — no `credentials`, no MFA/refresh | **FIXED locally** — `studentAuthenticatedHeaders` + `credentials: "include"` |
| N3 | CRITICAL | Isolation | IDOR: supply Explorer victim DB id → read/write their notes without login | Same as N1; probe proves server evaluates tier for supplied id | **FIXED locally** with N1+N2; production re-probe pending |
| N4 | CRITICAL | Functional | Audio POST processes inline; `maxDuration=300` vs 90 min capture | `[noteId]/audio/route.ts:13`; `NotetakerCaptureScreen.tsx:57` | Async job queue + poll (detail screen already polls processing) — **UNVERIFIED fix scope** |
| N5 | HIGH | Auth | DELETE omits membership tier check | `[noteId]/route.ts:138-155` vs GET tier gate | **FIXED locally** — `canAccessAiNotetaker` on DELETE |
| N6 | HIGH | Storage | Blob upload uses `access: "public"` | `ai-notetaker-storage.ts:115-116` | Private blob + authenticated streaming only |
| N7 | HIGH | UX/limits | Capture hardcodes 90 min; Explorer limit is 60 min | `NotetakerCaptureScreen.tsx:57,207` vs `ai-notetaker-limits.ts` | Load limits from list/get API |
| N8 | HIGH | Functional | Upload fetch has no abort/timeout | `notetaker-api.ts:270-274` | **FIXED locally** — `createApiAbortSignal` |
| N9 | MEDIUM | Gating | `/notetaker/*` reachable without nav tier lock | `NotetakerCaptureScreen.tsx` portal-only check | Tier guard on capture/detail routes |
| N10 | MEDIUM | Data | Failed upload leaves orphan draft notes | `processNotetakerAudio` create then upload | Delete draft on upload failure |
| N11 | MEDIUM | Privacy | Archive is device-local AsyncStorage only | `notetaker-archive-storage.ts` | Document or add server field |
| N12 | MEDIUM | App Review | Primary review student is Scholar — module locked | `APP_STORE_REVIEW_CREDENTIALS.md:17,59` | Explorer test account in review docs |
| N13 | LOW | UX | Live captions section uses uppercase label | `NotetakerLiveCaptions.tsx:145` | Title Case per native module rules |
| N14 | LOW | Config | `notetaker-api.ts` lacks `assertProductionHttpsUrl` | compare `student-api.ts` | **FIXED locally** |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Unauthenticated list with `studentDatabaseId=722` | 403 NOTETAKER_TIER (Scholar) — **proves id accepted, not session** |
| Unauthenticated list with Explorer victim id | **UNVERIFIED** (no Explorer db id in probe) — code path returns notes if tier passes |
| Header-only without cookies | Same as above — **CRITICAL** |
| DELETE without tier | **PASS on code review** — delete allowed if note ref known |
| Faculty session on student routes | **UNVERIFIED** live |

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 88 |
| Routing | 85 |
| UI | 72 |
| Buttons | UNVERIFIED |
| API | 35 |
| CRUD | 55 |
| Authentication | 20 |
| Authorization | 25 |
| Student Isolation | 30 |
| Course Isolation | N/A |
| Membership | 60 |
| Production Configuration | 90 |
| Data Integrity | 50 |
| Security | 25 |
| Assessment Security | N/A |
| Cora Security | N/A |
| Error Handling | 65 |
| Mobile UX | 70 |
| Performance | 45 |
| Accessibility | UNVERIFIED |
| Testing | 40 |

**OVERALL SCORE: 41/100**

**FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE**

---

## Required Before Ship

1. ~~Session-bound student auth on **all** `/api/student/ai-notetaker/*` routes~~ — **done locally**; deploy `v0-coursecollabv3`.
2. ~~Mobile `notetaker-api.ts` must send session proof~~ — **done locally**.
3. Re-prove IDOR on production after deploy (401 without session; 403 cross-student).
4. Address long-audio timeout (async processing or reduce max capture to server limit).
5. App Review Explorer account or documented upgrade path for notetaker demo.

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` → `ai-notetaker`.
