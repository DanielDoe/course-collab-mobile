# Analytics & More — Student Mobile Production Audit

```
MODULE: Analytics & More
STUDENT ROUTE: /module/codebench-more
NAVIGATION GROUP: Learning Center. student-nav id codebench-more, label Analytics & More, icon bar-chart-outline, locked true, minTier Trailblazer
REGISTRY ENTRY: MODULE_RENDERERS["codebench-more"] → AnalyticsMoreScreen
PRIMARY SCREEN: AnalyticsMoreScreen in expo/src/components/analytics-more/AnalyticsMoreScreen.tsx
RELATED SCREENS: StudentThemedLocked (membership gate). CodebenchIdeScreen is a linked sibling (Open IDE), not this module’s UI.
SUBROUTES: none. Deep link /module/codebench-more. Notification remap /student/dashboard-v2/codebench/more → /module/codebench-more. IDE CTAs push /codebench/ide?tool=
API ROUTES:
  GET /api/codebench/streak?studentId=
  POST /api/codebench/streak
  GET /api/codebench/badges?studentId=
  POST /api/codebench/badges
  GET /api/codebench/leaderboard?studentId=
  GET /api/codebench/submissions?studentId=
  POST /api/codebench/daily-challenge
  POST /api/codebench/analyze
  POST /api/codebench/learning-plan
  GET /api/codebench/analytics?studentId= (server exists; mobile does not call it)
  Faculty escalation probes (not called by this screen): GET /api/instructor/practice/student-progress, /api/instructor/practice/analytics, /api/instructor/reports, /api/instructor/progress-reviews, /api/instructor/dashboard/stats
SERVICES: expo/src/lib/codebench-api.ts, codebench-progress.ts, hooks/useCodebenchProgress.ts, codebench-prefs.ts
DATABASE MODELS: Inferred from API SQL — codebench_submissions, practice_submissions, daily_challenge_submissions, student_achievements, students, classroom_points, pending_practice_points. Direct DB: UNVERIFIED
MEMBERSHIP: Trailblazer required (nav + server getEffectiveMembershipTier on claimed studentId). Live review students: Scholar
CORA INTEGRATION: registry codebench-more — allowed read/summarize/explain/navigate; denied access_other_student_analytics; toolHints get_student_summary. No Cora UI on this screen.
FACULTY DEPENDENCY: faculty-approved CodeBench / practice points feed XP; faculty Analytics group is a different Expo surface (Student Progress / Reports / Progress Reviews)
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: MODULE_WEB_PATHS["codebench-more"] = /student/dashboard-v2/codebench/more
```

Size: MEDIUM  
Audited: 2026-08-17  
Commit: `dba7f46` (mobile) · backend tree `f710215f`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Analytics & more**. The “Faculty Expo only” scope line is treated as faculty → student CodeBench/analytics downstream plus student attempts to read faculty analytics APIs. This is **not** a faculty Student Progress / Reports audit.

Execution: production HTTPS probes with review accounts (Alex ECE `910000001` / db `722` / Scholar, Jordan ECE `910000002` / db `723` / Scholar, faculty `mchen` / instructor `15`, course `16`). Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses. No Trailblazer review account exists, so Trailblazer-gated payloads (submissions source, leaderboard rows, AI analysis) are **UNVERIFIED** on production.

---

## Executive Summary

Readiness: **READY** (A-011 INFO remains)  
Score: **76/100**  
Blockers: 0  
Critical: 0  
High: 0  
Medium: 0  
Low: 1 (A-011 INFO)

The drawer item exists, the native screen is registered, and production HTTPS is the only origin in this module’s client. After the 2026-08-18 v0 deploy (`dpl_AcM6wN8hZnQHmwxgUEbiV5boYutf`) and re-probe of `https://coursecollab.vercel.app`, unauthenticated CodeBench analytics and faculty header-only analytics return **401**. Alex cookie + Jordan `studentId=723` on badges returns **403**. Scholar 722 remains **403** Trailblazer on badges/streak/submissions/leaderboard after auth. Expo `codebenchApi` fails closed without session proof. A-011 is registry-deny only; live Cora isolation was not re-tested.

---

## Architecture

Student Drawer (`Learning Center` → Analytics & More)  
→ `/module/codebench-more`  
→ `registry.tsx` `codebench-more`  
→ `AnalyticsMoreScreen`  
→ membership: `hasNavAccess(tier, "Trailblazer")` else `StudentThemedLocked`  
→ tabs Overview / Insights / Activity  
→ `useCodebenchProgress` → `fetchCodebenchProgress`  
→ `codebenchApi` (`studentAuthenticatedHeaders` / cookies + `x-cc-refresh` + MFA trust)  
→ production CodeBench tables  
→ server membership on **caller session** via `requireCodebenchStudent` → `requireBoundStudentCaller`  
→ faculty points approval can later raise XP (downstream only)

---

## Files Inspected

- `expo/src/constants/student-nav.ts`
- `expo/src/modules/registry.tsx`
- `expo/app/(app)/module/[id].tsx`
- `expo/src/components/analytics-more/AnalyticsMoreScreen.tsx`
- `expo/src/components/analytics-more/analytics-config.ts`
- `expo/src/components/student/student-themed-hero.tsx`
- `expo/src/hooks/useCodebenchProgress.ts`
- `expo/src/lib/codebench-api.ts`
- `expo/src/lib/codebench-progress.ts`
- `expo/src/lib/codebench-prefs.ts`
- `expo/src/lib/cora/student-module-registry.ts`
- `expo/src/lib/membership-plans.ts`
- `expo/src/constants/module-web-paths.ts`
- `expo/src/config/api.ts`
- `v0-coursecollabv3/app/api/codebench/{streak,badges,leaderboard,submissions,daily-challenge,analyze,learning-plan,analytics}/route.ts`
- `v0-coursecollabv3/lib/student-api-auth.ts`
- `v0-coursecollabv3/lib/instructor-session-auth.ts`
- `v0-coursecollabv3/app/api/instructor/practice/student-progress/route.ts`
- `expo/docs/APP_STORE_REVIEW_CREDENTIALS.md` (accounts only)

---

## Navigation & Routing

| Check | Result |
|--------|--------|
| Label / route / icon | Analytics & More, `/module/codebench-more`, `bar-chart-outline` |
| Group | Learning Center |
| Membership lock | Drawer `locked` + `minTier: Trailblazer`. Screen repeats the gate. |
| Registry | Native `AnalyticsMoreScreen`, not faculty / admin / guest |
| Direct `/module/codebench-more` | File route does **not** check tier. Scholar still mounts the screen; UI swaps to `StudentThemedLocked`. |
| Deep link | `notification-link.ts` remaps `codebench/more` |
| Search dock | No module search — N/A |

---

## Production Configuration

Production API verified: **yes** (`https://coursecollab.vercel.app` via `resolveApiBaseUrl` / `PRODUCTION_API_BASE_URL`)  
Development URLs: **none** in analytics-more / codebench-api / codebench-progress  
Mock dependencies: analyze/learning-plan **hardcoded fallback JSON** if the model output is not parseable (A-007)

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| AnalyticsMoreScreen | Three-tab analytics hub | ACTIVE |
| StudentThemedLocked | Scholar / Explorer gate + upgrade | ACTIVE |
| CodebenchIdeScreen | Linked from CTAs | ACTIVE sibling, not audited here |

Empty / error / pull-to-refresh exist in code. Live Trailblazer data UI: **UNVERIFIED**.

---

## Components

| Component | Class |
|-----------|--------|
| PillSwipeTabs (Overview / Insights / Activity) | ACTIVE |
| ProgressSummarySection + SummaryStat KPIs | ACTIVE |
| ProfilePanel / AnalyticsPanel / ChallengePanel / BadgesPanel / LeaderboardPanel / StreakPanel | ACTIVE |
| FacultyEmptyState / ModuleListRow / ModuleSection / CommSectionFooter | ACTIVE shared |
| AppErrorScreen | ACTIVE (only when core snapshot `error` is set) |
| GET `/api/codebench/analytics` | DEAD for mobile (unused) |
| Legacy tab ids in `normalizeAnalyticsTab` | ACTIVE compat |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Upgrade | Locked screen | `router.push("/membership")` | membership module | Open plans | Code path only | UNVERIFIED UI |
| Pull to refresh | All tabs | `onRefresh` → `fetchCodebenchProgress` | CodeBench GETs/POSTs | Reload | Wired | PASS code |
| Open CodeBench IDE | Overview / empty | `openIde()` | none (nav) | `/codebench/ide` | Wired | PASS code |
| Submit and evaluate | Insights empty | `openIde("evaluate")` | none (nav) | IDE evaluate tool | Wired | PASS code |
| Solve in IDE | Daily challenge | `openIde("practice")` | none (nav) | IDE practice | Wired | PASS code |
| Start streak in IDE | Streak = 0 | `openIde()` | none (nav) | IDE | Wired | PASS code |
| Recommendation / badge / calendar cells | Insights / Activity | none | none | Display only | No press | PASS (non-actions) |

Rapid-tap: refresh has `refreshing` state. IDE pushes are not debounced — LOW.

---

## Menus / Action Sheets

None on this screen.

---

## Modals

None.

---

## Forms

None. Daily-challenge / analyze / learning-plan bodies are built by the client (`studentId` + optional code).

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/codebench/streak` | `codebenchApi.getStreak` | session (`requireCodebenchStudent`) | caller db id | caller Trailblazer | none | PASS. Unauth no-id **401**. Scholar after auth **403** |
| POST | `/api/codebench/streak` | `recordStreak` (not used by this screen) | session | caller | caller Trailblazer | none | PASS. Unauth **401** |
| GET | `/api/codebench/badges` | `getBadges` | session | caller; mismatch 403 | caller Trailblazer | none | PASS. Unauth **401**. Alex+723 **403**. Scholar **403** |
| POST | `/api/codebench/badges` | not used by screen | session | caller | caller Trailblazer | none | PASS. Unauth **401** |
| GET | `/api/codebench/leaderboard` | `getLeaderboard` | session | caller | caller Trailblazer | caller course/section SQL | PASS auth. Payload UNVERIFIED (Scholar 403) |
| GET | `/api/codebench/submissions` | `getSubmissions` | session | caller | caller Trailblazer | none | PASS auth. SQL returns `code`. Scholar **403** |
| POST | `/api/codebench/daily-challenge` | `getDailyChallenge` | session | caller | caller Trailblazer | none | PASS code. Prod Scholar after auth **403** |
| POST | `/api/codebench/analyze` | `analyze` | session | caller | caller Trailblazer | none | PASS code. Parse failure **502** |
| POST | `/api/codebench/learning-plan` | `getLearningPlan` | session | caller | caller Trailblazer | none | PASS code. Parse failure **502** |
| GET | `/api/codebench/analytics` | unused by mobile | session | caller | caller Trailblazer | none | PASS code |
| GET | faculty practice/reports/progress-reviews/dashboard | not this screen | `requireInstructorSession` via `requireInstructorCourse` | course scope | n/a | course 16 | PASS. Unauth+headers **401** |

---

## CRUD

Read-only hub. Writes that exist on related APIs: POST streak (noop success), POST badges (award), POST daily-challenge (can insert a challenge row for a claimed Trailblazer id). This screen does not POST submit/evaluate.

---

## Authentication

| Probe | Result |
|--------|--------|
| GET badges `studentId=722`, no cookie | **401** (was 200) |
| POST badges `{studentId:722}`, no cookie | **401** (was 200) |
| POST streak `{studentId:722}`, no cookie | **401** (was 200) |
| GET streak/submissions/leaderboard without `studentId`, no cookie | **401** (was 400 “Student ID required”) |
| Alex login cookie + own streak | **403** Trailblazer (membership on caller) |
| Missing session | **401** |

Mobile `codebench-api.ts` now uses `studentAuthenticatedHeaders` and fails closed without cookies / `x-cc-refresh` / MFA trust.

---

## Student Authorization

Scholar cannot load Trailblazer-gated CodeBench reads for id 722/723. Membership is now on the **caller session** (`requireCodebenchStudent` → `getEffectiveMembershipTier` / `codeBench` feature).

Student cookie **without** instructor headers: faculty analytics **401**.  
Anonymous **with** `x-instructor-id: 15` + `x-course-id: 16`: faculty analytics **401**.

Students cannot mutate grades from this screen.

---

## Cross-Student Isolation

| Test | Result |
|------|--------|
| Unauth GET badges `723` | **401** |
| Alex cookie + GET badges `723` | **403** |
| Alex cookie + GET submissions `723` | **403** (Jordan is Scholar, not an isolation deny) |
| Cookie-scoped IDOR on streak/submissions | **UNVERIFIED** — no Trailblazer peer on the review roster |

Server binds `requireBoundStudentCaller`. Claimed `studentId` that does not match the session is **403**. Unauth is **401**.

---

## Course / Section Isolation

Leaderboard SQL filters to the caller’s `course_id` (students + sessions) or section fallback. JSON omits `student_code`. Production payload: **UNVERIFIED** (Scholar 403). Source: repaired.

Streak/submissions filter by **caller** `studentDbId`.

---

## Membership Enforcement

| Check | Result |
|--------|--------|
| Client lock | Scholar → `StudentThemedLocked` + upgrade. Code path only; simulator **UNVERIFIED**. |
| Server Scholar 722 | 403 on streak, submissions, leaderboard, analyze, plan, daily-challenge, unused analytics GET |
| Server badges | Scholar after auth **403** Trailblazer (caller session) |
| Client `tier: Trailblazer` | not sent |
| Membership on caller id | Claimed Trailblazer id without that session is **403** isolation first |

`app/(app)/module/[id].tsx` does not enforce `minTier`.

---

## Security

THE MOBILE CLIENT IS UNTRUSTED. Analytics routes now require a student session and use the caller db id.

`GET /api/codebench/submissions` still returns source `code` for the **caller**. Cross-student IDOR is **403** without a matching session. Trailblazer peer review-roster proof: **UNVERIFIED**.

---

## Assessment Security

N/A — not a graded assessment surface. CodeBench evaluate questions with `correctAnswer` are **not** fetched by this screen.

---

## Cora Security

No Cora composer on the screen. Registry denies `access_other_student_analytics` and hints `get_student_summary`. `execute-cora-tool.ts` binds student tools to `session.userId` when role is student. Prompt-only deny remains. Live Cora prompt test: **UNVERIFIED**.

---

## Database Integrity

Badge GET/POST call `checkAndAwardBadges` only after `requireCodebenchStudent`. Daily-challenge POST can still create tables, but only for the caller Trailblazer. Streak POST does not persist (returns `{success, date}`).

XP on the client is API `submissionXpTotal` only (no `Math.max` with local SecureStore).

---

## Files / Documents

None.

---

## Notifications

`module-notification-registry` maps `codebench-more` → `codebench`. Deep-link remap exists. Push delivery: **UNVERIFIED**.

---

## Mobile UX

Grouped canvas + Title Case sections + solid thumbs. KPI tiles on a non-dashboard module (design rule: KPI grid is dashboard-only) — LOW. No Liquid Glass on rows. Search dock N/A. Simulator / safe area / keyboard: **UNVERIFIED**.

---

## Theme

Uses `NATIVE` / `useThemedNative` / `useThemedStudentNative`. Light/dark: **UNVERIFIED** on device.

---

## Accessibility

KPI tiles have `accessibilityLabel`. Calendar cells include date plus active/inactive. Icon+label on statuses. Screen-reader pass: **UNVERIFIED**.

---

## Errors / Loading / Empty States

Loading spinner, `AppErrorScreen` + retry, empty states for no code / no challenge / empty leaderboard. Daily-challenge / analysis / learning-plan failures are listed in `codebenchFailureMessage` with streak/badges.

---

## Performance

Four GETs in parallel, then daily-challenge POST, then analyze + learning-plan POSTs (OpenAI). Acceptable for a hub. Unused `sql` import on analyze/learning-plan. N+1 not on this client.

---

## Web / Mobile Integration

Web path `/student/dashboard-v2/codebench/more`. Create-on-web → see-on-mobile: **UNVERIFIED**.

---

## Faculty → Student Integration

Faculty Analytics Expo (`/module/student-progress`, reports, progress-reviews) is **not** this screen. Downstream: approved CodeBench / practice points become XP/leaderboard once Trailblazer APIs succeed. Live publish→analytics: **UNVERIFIED** (Scholar lock).

Student must not read faculty analytics. Production faculty analytics reject header-only calls (**401**).

---

## Tests

Expo: `codebench-progress.test.ts`, `codebench-auth.contract.test.ts`. Backend: `student-api-auth.test.ts` CodeBench cases + `codebench-analytics-auth.contract.test.ts`. Production script: `expo/scripts/audit-analytics-more-production.mjs`.

---

## End-to-End Results

Scholar journey: Drawer lock → upgrade CTA. **Code-traced.** Simulator **UNVERIFIED**.

Trailblazer journey: Open → tabs → insights / badges / streak / IDE. **UNVERIFIED** (no Trailblazer review account).

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Change studentId on badges | **403** (Alex cookie + 723) |
| Change studentId on submissions (Scholar peer) | **403** |
| Missing session | badges/streak POST **401** |
| `x-student-id` only | **401** |
| Claim Trailblazer in body | server ignores client tier; membership on caller |
| Call faculty analytics with student cookie only | **401** |
| Call faculty analytics with instructor headers only | **401** |
| Replay badge POST without session | **401** |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| A-001 | CRITICAL | Authentication | CodeBench analytics APIs treat query/body `studentId` as login. Unauthenticated badge read/award and streak POST succeed. Expo client sends header identity only. | Prod: GET/POST badges 200; POST streak 200; no Cookie on `codebench-api.ts` | `v0-coursecollabv3/app/api/codebench/{badges,streak,leaderboard,submissions,daily-challenge,analyze,learning-plan,analytics}/route.ts`; `expo/src/lib/codebench-api.ts` | `requireBoundStudentCaller` / `requireStudentIdParamMatchesCaller`. Client: `studentAuthenticatedHeaders` like `student-api.ts`. Unauth → **401**. |
| A-002 | CRITICAL | Student isolation | Any caller can read/award badges for any numeric id. Other routes have the same missing caller bind. | Prod: unauth badges 723 = 200; Alex cookie + 723 badges = 200 | same as A-001 | Bind to session id; mismatch **403**. Ignore client `studentId` for queries. |
| A-003 | CRITICAL | Membership | Trailblazer is checked on the **claimed** id, not the caller. Badges skip membership. Route file does not gate `/module/codebench-more`. | Prod Scholar 722: 403 on gated GETs; 200 on badges. `getEffectiveMembershipTier(parseInt(studentId))` | CodeBench routes; `AnalyticsMoreScreen.tsx`; `module/[id].tsx` | Resolve caller from session, then `getEffectiveMembershipTier(caller)`. Scholar → **403**. Keep client lock. |
| A-004 | HIGH | API / data | Practice & daily-challenge SQL aliases `code as solution`. Client flatten reads `code` only, so XP/count/latestCode drop those buckets. Client also `Math.max(apiXp, localXp)`. | Route aliases vs `flattenSubmissions` / `submissionXpTotal` | `submissions/route.ts`; `codebench-progress.ts` | Return `code` or map `solution`. XP from server only. |
| A-005 | CRITICAL | Faculty escalation | Faculty analytics still accept `x-instructor-id` + `x-course-id` with no instructor session. Student cookie without those headers is 401. | Prod unauth+headers **200** on practice student-progress, practice analytics, reports, progress-reviews, dashboard/stats | those instructor routes; `instructor-course-scope.ts` | `requireInstructorSession` then course scope. Unauth+headers → **401**. Faculty Expo already sends cookies in `instructorRequest`. |
| A-006 | HIGH | Course isolation | Leaderboard is global and includes names + roster codes. | SQL `FROM combined_stats` no session filter. Prod payload UNVERIFIED (403) | `leaderboard/route.ts` | Filter to caller’s course/section. Do not return `student_code` unless product requires it. |
| A-007 | MEDIUM | Mock data | Analyze / learning-plan return hardcoded scores/plans when JSON parse fails. | `analyze/route.ts` lines 85–106; `learning-plan/route.ts` 72–83 | those routes | Return 502, not fabricated proficiency. |
| A-008 | MEDIUM | Errors | Daily-challenge / analyze / learning-plan failures become `null`; hub shows empty analytics. | `codebench-progress.ts` `loadInsights` / `getDailyChallenge` `.catch(() => null)` | `codebench-progress.ts`; hook | Surface in `error` like streak/badges. |
| A-009 | MEDIUM | Tests | No module tests; no production audit script. | glob: no `*codebench*test*` | expo tests / `expo/scripts` | Add auth contract tests + `audit-analytics-more-production.mjs`. |
| A-010 | LOW | UX | KPI grid on a non-dashboard module; no simulator proof; calendar a11y omits active/inactive. | `ProgressSummarySection`; design rule | `AnalyticsMoreScreen.tsx` | Keep summary compact; add a11y on calendar. |
| A-011 | LOW | Cora | Deny flag is registry-only. Live tool isolation **UNVERIFIED**. | `student-module-registry.ts`; `execute-cora-tool.ts` | Cora | Keep session bind; do not pass other-student analytics into the model. |

### Remediation (2026-08-18)

- **A-001** — `requireCodebenchStudent` → `requireBoundStudentCaller` on badges/streak/leaderboard/submissions/daily-challenge/analyze/learning-plan/analytics. Expo `studentAuthenticatedHeaders`. Live unauth GET/POST badges and POST streak → **401**. Unauth GET streak/submissions/leaderboard without studentId → **401**.
- **A-002** — Mismatch claimed id vs caller → **403**. Live: Alex cookie + `studentId=723` badges → **403**.
- **A-003** — Membership on caller session (`codeBench` feature / Trailblazer). Live Scholar 722 after auth → **403** on badges/streak/submissions/leaderboard. Client lock kept. `module/[id].tsx` unchanged.
- **A-004** — `submissions/route.ts` selects `code` (no `code as solution`). `flattenSubmissions` maps `solution`→`code`. XP is API-only. Source verified; Trailblazer payload UNVERIFIED.
- **A-005** — Five faculty routes already called `requireInstructorCourse`, which calls `requireInstructorSession` first (no route rewrite). Live unauth + `x-instructor-id:15` + `x-course-id:16` → **401**.
- **A-006** — Leaderboard SQL filters caller course/section. JSON omits `student_code`. Source verified; live rows UNVERIFIED (Scholar 403).
- **A-007** — analyze/learning-plan parse failure → **502**. Source verified.
- **A-008** — `codebench-progress.ts` records daily challenge / analysis / learning plan in `error`.
- **A-009** — `codebench-progress.test.ts`, `codebench-auth.contract.test.ts`, `student-api-auth.test.ts` CodeBench cases, `codebench-analytics-auth.contract.test.ts`, `expo/scripts/audit-analytics-more-production.mjs` + `npm run audit:analytics-more-production`.
- **A-010** — Calendar cells: `{date}, active|inactive`. Overview summary kept.
- **A-011** — No Cora code change. `get_student_summary` already uses session student id. Left open / INFO.

---

## Required Before Ship

1. Re-prove Trailblazer insights/leaderboard payload with a review fixture (optional).
2. Live Cora `get_student_summary` isolation (A-011 INFO).

---

## Future Improvements

- Trailblazer review fixture so insights/leaderboard can be E2E’d without upgrading Apple’s Scholar account.
- Stop returning full source on the analytics submissions list; return counts/dates only.
- Remove dead mobile-unused `/api/codebench/analytics` or point the hub at it after auth.
- Dedicated `/module/codebench-more` membership route gate.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 86 |
| Routing | 78 |
| UI | 74 |
| Buttons | 80 |
| API | 78 |
| CRUD | 70 |
| Authentication | 86 |
| Authorization | 80 |
| Student Isolation | 84 |
| Course Isolation | 72 |
| Membership | 86 |
| Production Configuration | 90 |
| Data Integrity | 72 |
| Security | 80 |
| Assessment Security | 100 |
| Cora Security | 58 |
| Error Handling | 78 |
| Mobile UX | 74 |
| Performance | 68 |
| Accessibility | 62 |
| Testing | 72 |

OVERALL SCORE: 76/100

FINAL STATUS: READY

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` key `analytics-more`.
