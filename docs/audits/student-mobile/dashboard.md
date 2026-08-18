# Dashboard — Student Mobile Production Audit

```
MODULE: Dashboard
STUDENT ROUTE: /dashboard
NAVIGATION GROUP: Top-level (not inside a drawer group). student-nav STUDENT_DASHBOARD_LINK
REGISTRY ENTRY: none — dedicated Expo file route, not MODULE_RENDERERS
PRIMARY SCREEN: StudentDashboard in expo/app/(app)/dashboard.tsx
RELATED SCREENS: FacultyDashboardScreen / GuestDashboardScreen / SummerDashboardScreen / OtherPortalDashboard (same /dashboard URL, other portals only)
SUBROUTES: none under /dashboard. Quick actions leave to /module/quizzes, /module/grades, /module/homework, /module/practice, insight routes, /announcements
API ROUTES:
  GET /api/grades/student
  GET /api/student/quiz-history
  GET /api/student/homework-history
  GET /api/attendance/score
  GET /api/attendance/streaks
  GET /api/student/quizzes
  GET /api/student/finals
  GET /api/classroom-points
  GET /api/announcements
  GET /api/student/membership (shell)
  GET /api/student/notifications (shell)
SERVICES: expo/src/lib/student-dashboard-stats.ts, student-api.ts studentRequest, post-login-bootstrap.ts
DATABASE MODELS: UNVERIFIED (production gradebook / announcements / attendance / points — no DB access this run)
MEMBERSHIP: All (Scholar / Explorer / Trailblazer). No minTier on the nav item. Live review student: Scholar
CORA INTEGRATION: none on this screen
FACULTY DEPENDENCY: instructor-published announcements; gradebook / attendance / points / assessments created by faculty
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: /student/dashboard-v2 remaps to native /dashboard; web GradeTrendChart parity claimed in comments
```

Size: MEDIUM  
Audited: 2026-08-17  
Commit: `dba7f46` plus uncommitted dashboard client changes in the working tree  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Dashboard**. The “Faculty Expo only” scope line is treated as faculty → student downstream only. This is **not** a faculty dashboard audit.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **54/100**  
Blockers: 0  
Critical: 2  
High: 0 remaining in Expo (D3 repaired)  
Medium: 2 remaining (D8 client tests added; D12 info)  
Low: 3

The student dashboard is reachable, points at production HTTPS, and the **mobile client** now sends session cookies via `studentRequest`. Local fixes since the earlier pass also stop invented class averages and keep announcement failures from blocking KPIs.

Production **still** treats `x-student-id` as enough to read another student’s gradebook, and `/api/student/finals` is publicly reachable. Cookie-scoped IDOR is rejected (403). Until the server requires a real session, the module cannot ship.

---

## Architecture

Student Drawer (`STUDENT_DASHBOARD_LINK`)  
→ Expo route `app/(app)/dashboard.tsx`  
→ not in `registry.tsx`  
→ `StudentDashboard` when `session.portal === "student"`  
→ Welcome / KPI / SVG charts / insights / engagement / quick actions / announcements  
→ `fetchStudentDashboardBundle(session)` + `studentApi.getAnnouncements(session)`  
→ `studentRequest` (cookies + MFA trust + `x-student-id`)  
→ production grade / history / attendance / quizzes / finals / points / announcements  
→ server currently also accepts header-only identity  
→ gradebook / assessment / attendance / points / announcement tables

---

## Files Inspected

- `expo/app/(app)/dashboard.tsx`
- `expo/app/(app)/_layout.tsx`
- `expo/src/constants/student-nav.ts`
- `expo/src/modules/registry.tsx`
- `expo/src/components/shell/StudentDrawer.tsx`
- `expo/src/components/dashboard/*`
- `expo/src/lib/student-dashboard-stats.ts`
- `expo/src/lib/grade-trend-logic.ts`
- `expo/src/lib/grade-trend-logic.test.ts`
- `expo/src/lib/student-api.ts`
- `expo/src/lib/post-login-bootstrap.ts`
- `expo/src/config/api.ts`
- `expo/src/types/dashboard.ts`
- `expo/docs/APP_STORE_REVIEW_CREDENTIALS.md` (accounts only; no secrets in this report)

---

## Navigation & Routing

| Check | Result |
|--------|--------|
| Label / route / icon | Dashboard, `/dashboard`, `grid-outline` |
| Group | Top-level drawer row |
| Membership lock | None — correct for all tiers |
| Registry | Not a `/module/[id]` slug |
| Student portal isolation | `session.portal === "student"` only renders `StudentDashboard` |
| Deep link | `coursecollab://dashboard`; web `/student/dashboard-v2` → `/dashboard` |
| Cold start | Authenticated users redirect to `/(app)/dashboard` |
| Trailblazer lock bypass on this screen | N/A |

---

## Production Configuration

Production API verified: **yes** (live HTTPS 200s on `https://coursecollab.vercel.app`)  
Development URLs: **none** in dashboard client files  
Mock dependencies: **no fabricated roster**. Class-average invention **removed** in current working tree (`classAvg: null` when omitted). Tests cover that.

---

## Screens

| Screen | Status |
|--------|--------|
| `StudentDashboard` | ACTIVE |
| Other portal dashboards on `/dashboard` | ACTIVE for other portals only |

Loading, error, offline overlay, empty announcements: present. Light/dark visual pass on simulator: **UNVERIFIED** this run.

---

## Components

| Component | Status |
|-----------|--------|
| `DashboardWelcomeCard` | ACTIVE |
| `KpiGrid` | ACTIVE — still `.slice(0, 4)` of 8 KPIs |
| `GradeTrendChart` | ACTIVE (SVG) |
| `PerformanceComparisonChart` | ACTIVE (SVG; nullable classAvg) |
| `PerformanceInsightsCard` | ACTIVE |
| `EngagementStats` | ACTIVE |
| `QuickActionsPanel` | ACTIVE |
| `AnnouncementsSection` | ACTIVE — cards not pressable |
| `DashboardChartWebView` / `dashboard-chart-html.ts` | DEAD on student path |
| Cora widgets | N/A |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Pull to refresh | `dashboard.tsx` | `handleRefresh` | Re-fetch bundle + shell | Refresh | Wired | PASS |
| Offline Try again | `ConnectivityOverlay` | `handleRefresh` | Same | Retry | Wired | PASS |
| View all | announcements header | `router.push("/announcements")` | List route | Open list | Wired | PASS |
| Announcement card | list | none | Detail | Open `/announcements/[id]` | Display only | FAIL |
| Quizzes / Grades / Homework / Practice | `QuickActionsPanel` | `router.push` | Module routes | Navigate | Wired | PASS |
| Insight row | `PerformanceInsightsCard` | `router.push` | Module routes | Navigate | Wired | PASS |
| Comparison bars | chart | local toggle | none | Highlight | Local | PASS |
| Grade trend scrub | chart | PanResponder | none | Tooltip | Local | PASS |

---

## Menus / Action Sheets

None on the student dashboard.

---

## Modals

None.

---

## Forms

None.

---

## API Routes

Live production, 2026-08-17. Review ECE student db `722` / roster `910000001`; classmate `723`; ELEG twin `734` / `910100001`.

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/grades/student` | `studentAuthenticatedRequest` | Cookie 200; **header-only 200** | Cookie + other id **403** | All | `session` query | **CRITICAL** header-only |
| GET | `/api/student/quiz-history` | same | Cookie 200; header-only previously 200 | Cookie IDOR 403 | All | student id | **CRITICAL** (server) |
| GET | `/api/student/homework-history` | same | Cookie / header-only | Cookie IDOR 403 | All | roster + session | **CRITICAL** (server) |
| GET | `/api/attendance/score` | same | Cookie / header-only | — | All | student id | **CRITICAL** (server) |
| GET | `/api/attendance/streaks` | same | **Header-only 200** | — | All | student id | **CRITICAL** |
| GET | `/api/student/quizzes` | same | Cookie 200 | — | All | studentDatabaseId | UNVERIFIED header-only this rerun |
| GET | `/api/student/finals` | same | **None → 200** | — | All | session + roster | **CRITICAL** |
| GET | `/api/classroom-points` | same | Cookie / header-only | — | All | student + session | **CRITICAL** (server) |
| GET | `/api/announcements` | `studentApi.getAnnouncements` | Cookie 200 (12); header-only previously 200 | — | All | student id | **CRITICAL** (server) |
| GET | `/api/student/membership` | shell | Cookie 200 Scholar | — | Scholar | student | PASS |
| GET | `/api/instructor/dashboard/stats` | not used | Student cookie **401** | — | — | — | PASS |
| POST | `/api/announcements` | not used | Student cookie **401** | — | — | — | PASS |
| GET | `/api/instructor/announcements` | faculty probe | Faculty cookie 200, 4 rows | — | — | course | Integration UNVERIFIED count vs student 12 |

No-session, no-header grades: **401**.

---

## CRUD

Read-only. Student cannot create/edit announcements (401). No grade writes from this screen.

---

## Authentication

Anonymous grades without header: 401.  
`x-student-id` of a real database id: treated as that student.  
Mobile client now attaches cookies + MFA trust + header. That does **not** stop an attacker who omits cookies.  
`studentRequest` 401 can expire the session via `noteApiFailure`.  
Password-change-required review accounts still get API access after login; app shell redirects to change-password — UI gated, API not.

---

## Student Authorization

Faculty dashboard stats and announcement POST rejected with a student cookie (401). No self-award / grade mutation on this surface.

---

## Cross-Student Isolation

| Test | Result |
|------|--------|
| Cookie 722 + query 723 | **403 Access denied** |
| No cookie + `x-student-id: 723` | **200 grade 12.82** |
| Unauthenticated finals | **200** empty list |

**FAIL** isolation when the client (or attacker) sends only `x-student-id`.

---

## Course / Section Isolation

| Test | Result |
|------|--------|
| ECE 722 grades | 12.88 / F, 12 announcements |
| ELEG 734 grades | 0.00 / F, 0 announcements |
| ELEG cookie + ECE studentId 722 | **403** |

Cookie-scoped course isolation: **PASS**. Header-only course hopping: same as D1.

---

## Membership Enforcement

Dashboard is for all tiers. No client `tier` / `isPremium` sent. Live membership: Scholar. Tampering N/A on this read surface.

---

## Security

Mobile is untrusted. Server still honors a student-controlled header as identity. Client now uses the shared authenticated helper — necessary but not sufficient.

---

## Assessment Security

Quiz-history attempts expose scores/percentages, not `correctAnswer` / `answerKey` / `solution` (prior payload inspection).  
Unauthenticated finals returned empty `finals[]` on this demo. Leak of published exam metadata when rows exist: **UNVERIFIED**.

---

## Cora Security

N/A — no Cora on this screen.

---

## Database Integrity

Live distinct grades for ECE vs ELEG persisted. Client no longer invents class averages. Client no longer fabricates a letter when the server omits one (`"—"`). `recalculate=true` on every open: whether that mutates stored totals is **UNVERIFIED**.

---

## Files / Documents

None.

---

## Notifications

Deep link `/dashboard` resolves. `useNotificationModuleRefresh("dashboard")` reloads. Push delivery to the correct student: **UNVERIFIED**.

---

## Mobile UX

Native grouped canvas, themed tokens, safe-area padding, pull-to-refresh. KPI grid still drops four metrics. Announcement cards are display-only.

---

## Theme

Uses appearance tokens. Simulator light/dark/accent: **UNVERIFIED**.

---

## Accessibility

KPI a11y props present. Comparison bars have spoken labels. Chart scrubbing not announced. Announcement cards have no button role.

---

## Errors / Loading / Empty States

`Promise.allSettled` keeps KPIs if announcements fail, and vice versa. Error banner + spinner no longer mutually stuck. Bundle uses `Promise.all` across eight stats APIs — **one failure fails all KPIs** (stricter than silent zeros; can be brittle). Offline overlay present. Empty announcements present.

---

## Performance

Eight parallel GETs plus announcements. Duplicate fetch helpers collapsed to the bundle. `KpiGrid` still builds eight then slices four.

---

## Web / Mobile Integration

Web dashboard-v2 remaps to native. Create-on-web → see-on-mobile this session: **UNVERIFIED**.

---

## Faculty → Student Integration

Faculty `GET /api/instructor/announcements` returned **4** rows (instructor 15). Student ECE `GET /api/announcements` returned **12**. Downstream exists; count/filter parity **UNVERIFIED**. Did not publish a new announcement this run.

---

## Tests

`npx tsx --test src/lib/grade-trend-logic.test.ts`: **2 passed** (no invented class averages). No tests for header-only rejection or dashboard error fan-out. Bare `node --test` cannot resolve the TS import.

---

## End-to-End Results

Open dashboard → bootstrap or fetch bundle → widgets render when APIs succeed → quick actions navigate → view-all announcements. Core **read** path works. Isolation fails without a session cookie.

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| No session, no header | Grades 401 |
| No session + victim `x-student-id` | **200 private grades** |
| Cookie + other studentId | 403 |
| ELEG session + ECE studentId | 403 |
| Faculty stats as student | 401 |
| Faculty announcement POST as student | 401 |
| Unauthenticated finals | 200 empty |
| Client membership claim | Not sent |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| D1 | CRITICAL | Auth / isolation | Production still accepts `x-student-id` as identity. Header-only GET returned ECE `12.88` and classmate `12.82`. | Fresh Node, no cookies, 2026-08-17 | Production grade/history/attendance/points/announcement APIs | Require session cookie/JWT. Cross-check header. Ignore header as auth. |
| D2 | CRITICAL | Auth | `GET /api/student/finals` returns 200 with no cookie and no header. | Unauth GET `success: true` | Production finals route | Require student session. |
| D3 | HIGH | Reliability | Eight stats GETs are `Promise.all` — one 4xx/5xx fails the entire KPI bundle. | `student-dashboard-stats.ts` | Same | **Fixed.** `Promise.allSettled`; failed widgets show "—" and a partial-error banner. |
| D6 | MEDIUM | UX | Announcement preview rows are not pressable. | `dashboard.tsx` | `dashboard.tsx` | **Fixed.** Cards open `/announcements/[id]`. |
| D7 | MEDIUM | UX | `KpiGrid` still renders only 4 of 8 KPIs. | `KpiGrid.tsx` | `KpiGrid.tsx` | **Fixed.** All 8 KPIs render. |
| D8 | MEDIUM | Testing | Class-average tests exist; no contract test that header-only must 401. | `grade-trend-logic.test.ts` | — | **Fixed.** `student-session-proof` + dashboard contract + settle tests. |
| D9 | LOW | Dead code | Student charts are SVG; HTML WebView unused here. | Import graph | `DashboardChartWebView.tsx`, `dashboard-chart-html.ts` | Remove or keep faculty-only. |
| D10 | LOW | UX | `riskLevel` / `riskReason` still unused. | `student-dashboard-stats.ts` 197–233 | Same | Render or delete. |
| D12 | INFO | Integration | Faculty announcement list count (4) ≠ student ECE count (12). | Live GETs | Faculty vs student announcement APIs | Confirm intended filters. |

Resolved since the prior pass (client only, not re-opened): silent `fetchJson` zeros; invented 80/90 class averages; announcement throw stuck spinner; client letter-grade fallback.

---

## Required Before Ship

1. Server must reject dashboard APIs without a real student session.  
2. `x-student-id` must not grant access by itself.  
3. Re-prove: header-only → 401; cookie + other id → 403; cookie + own id → 200.  
4. Keep mobile on `studentRequest` (already in the working tree).

---

## Future Improvements

Tap announcement cards; show remaining KPIs; settle stats fan-out; announcement count parity; simulator theme pass; `recalculate=true` side-effect check.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 84 |
| UI | 76 |
| Buttons | 78 |
| API | 52 |
| CRUD | 82 |
| Authentication | 22 |
| Authorization | 74 |
| Student Isolation | 22 |
| Course Isolation | 78 |
| Membership | 88 |
| Production Configuration | 92 |
| Data Integrity | 74 |
| Security | 22 |
| Assessment Security | 68 |
| Cora Security | N/A |
| Error Handling | 68 |
| Mobile UX | 76 |
| Performance | 74 |
| Accessibility | 68 |
| Testing | 36 |

OVERALL SCORE: **54/100**

FINAL STATUS: **BLOCKED BY SECURITY / DATA ISSUE**

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json`.

Shared dependencies to invalidate this audit: authentication, `student-http-cookies`, `student-dashboard-stats`, `student-api` / `studentRequest`, student session, course context, gradebook APIs, announcement APIs, student navigation, membership.
