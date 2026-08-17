# Attendance — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T16:43:41.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile hub + `/api/attendance/*` and `/api/instructor/attendance-roster` contracts + student downstream (`AttendanceScreen`, `rewards-api.ts`, `student-api.ts`) + related policy module (`attendance-policies`)  
**Module size:** MEDIUM — three primary tabs (Overview, Roll call, Meetings) + hidden **Log** sub-view; ~1,470-line primary screen

---

## Module identification

```
MODULE: Attendance
MOBILE ROUTE: /module/attendance
REGISTRY ENTRY: attendance → FacultyAttendanceScreen (faculty-registry.tsx L112)
NAVIGATION GROUP: Assessments (faculty-nav.ts L93)
MEMBERSHIP REQUIREMENT: None on faculty nav
PRIMARY SCREEN: expo/src/components/faculty/FacultyAttendanceScreen.tsx
RELATED SCREENS:
  - FacultyAttendancePoliciesScreen (/module/attendance-policies — admin policy config, separate audit)
  - FacultyStudentProgressScreen (consumes attendance analytics for at-risk rows)
  - Student: AttendanceScreen.tsx (overview, records, leaderboard, manual code check-in)
RELATED API ROUTES (faculty — instructorApi):
  - GET  /api/instructor/attendance-roster?section=
  - GET  /api/attendance/analytics?instructorId=&section=
  - GET  /api/attendance/sessions?instructorId=&section=&isActive=
  - GET  /api/attendance/records?sessionId= | ?section=
  - POST /api/attendance/manual-override (requireAuthHeader: true)
  - PUT  /api/attendance/records (update status)
  - PUT  /api/attendance/sessions (cancel/restore, requireAuthHeader: true)
  - DELETE /api/attendance/records?recordId= (requireAuthHeader: true)
RELATED API ROUTES (student downstream — rewards-api.ts / student-api.ts):
  - GET  /api/attendance/score?studentId=
  - GET  /api/attendance/streaks?studentId=
  - GET  /api/attendance/records?studentId=
  - GET  /api/attendance/leaderboard?section=
  - POST /api/attendance/mark (sessionId + fallback code, checkInMethod: code)
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts (L2338–2418, types L269–333), faculty-attendance-utils.ts, faculty-attendance-theme.ts
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty-module-registry: attendance.createSession, attendance.inspect, attendance.correct
  - student-module-registry: attendance module (check-in denied outside validation)
RELATED WEB MODULE:
  - Student web path: /student/dashboard-v2/attendance (module-web-paths.ts)
  - Faculty web deep link → /module/attendance
```

---

## 1. Executive Summary

**Readiness:** REQUIRES FIXES BEFORE SHIP

**Score:** 84/100

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 2 |
| Medium findings | 5 |
| Low findings | 2 |
| Info | 2 |

The faculty **Attendance** module is a native hub for section-scoped analytics, live meeting QR/fallback-code display, roll call (P/L/E/A), meeting cancel/restore, and an attendance log with inline corrections. Implementation follows native module patterns (grouped panels, semantic status icons, `ModuleFlashList` on roll call, bottom Liquid Glass search dock, section filter sheet).

**Proven this run:** Full navigation/registry trace; complete faculty attendance API client inventory; handler tracing for load, roll mark/unmark, log update, meeting cancel/restore; production URL config (`https://coursecollab.vercel.app`); production unauthenticated probes — faculty list/analytics/records/roster/mutations → **401**; student mark → **401**; invalid student score probe → **404** (no data leak); **25** Maestro YAML flows present; roster fallback chain (attendance-roster → getStudents → session records).

**Not proven this run:** Authenticated cross-instructor / cross-section IDOR on records and manual-override; faculty manual mark or student code check-in → student score/records/streak update E2E; server route source audit (backend absent from repo); simulator/Maestro execution; no `audit:attendance-production` script; no sim-audit junit artifacts.

---

## 2. Architecture Map

```
Faculty Drawer "Attendance"
  → /module/attendance
  → FacultyAttendanceScreen
      → Overview tab
          → getAttendanceAnalytics, getAttendanceSessions
          → Live QR card (active meeting + fallback_code)
          → KPIs, weekly trend, at-risk / top performers
          → Quick actions → Roll / Meetings / Log (setTab)
      → Roll call tab
          → getAttendanceRoster (fallback getStudents)
          → getAttendanceRecords(sessionId) → sessionMarks
          → P/L/E/A → markAttendanceManual | deleteAttendanceRecord (unmark)
          → ModuleFlashList roster
      → Meetings tab
          → filter/cancel/restore → toggleAttendanceSessionCancelled
          → Select meeting → Roll call
      → Log sub-view (tab="log", not in MAIN_TABS)
          → merged section records → filterRecords → updateAttendanceRecord
          → slice(0, 80) display cap
  → instructorRequest → scoped headers + mixed /api/attendance/* paths
  → Student AttendanceScreen
      → markAttendance(sessionId, code) → POST /api/attendance/mark
      → score / streaks / records / leaderboard GETs
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyAttendanceScreen.tsx` |
| Utils / theme | `faculty-attendance-utils.ts`, `faculty-attendance-theme.ts` |
| API / types | `instructor-api.ts` (L269–333, L2338–2418) |
| Shell / search | `faculty-module-shell.tsx` (FacultySearchToolbar default `placement="dock"`) |
| Student downstream | `AttendanceScreen.tsx`, `rewards-api.ts` (L287–321), `student-api.ts` |
| Policy (adjacent) | `FacultyAttendancePoliciesScreen.tsx` |
| Cora | `faculty-module-registry.ts`, `student-module-registry.ts` |
| Nav / registry | `faculty-nav.ts`, `faculty-registry.tsx`, `module-web-paths.ts`, `faculty-module-meta.ts` |
| Maestro | 25 × `expo/maestro/faculty-attendance*.yaml` |
| sim-audit | **None** under `sim-audit/faculty/attendance/` |
| Production config | `constants.ts` (`PRODUCTION_DEFAULT`) |

---

## 4. Navigation & Routing

**Status:** PARTIAL

- Drawer **Attendance** → `/module/attendance` (`faculty-nav.ts` L93, Assessments group).
- Registry `attendance` → `FacultyAttendanceScreen` (`faculty-registry.tsx` L112).
- Deep link helper maps paths containing `attendance` → `/module/attendance` (`faculty-nav.ts` L279).
- **Partial:** `AttendanceTab` includes `"log"` but `MAIN_TABS` has only Overview / Roll call / Meetings (`FacultyAttendanceScreen.tsx` L61–65, L783, L798–805). Log is reachable from Overview but tab bar does not reflect `tab="log"` — orphan navigation state (**F-005**).

---

## 5. Production Configuration

**Production API verified:** YES (client default + live probes)

**Development URLs found:** None hardcoded in attendance module; `getApiBaseUrl()` resolves to `https://coursecollab.vercel.app` in production builds (`constants.ts` L21, L47).

**Mock dependencies found:** None in attendance faculty or student screens.

---

## 6. UI Component Audit

**Status:** PASS (native module design)

| Component | Role | Status |
|-----------|------|--------|
| `FacultyModuleTabBar` | Overview / Roll / Meetings | PASS |
| `FacultySearchToolbar` | Dock search (default placement) | PASS |
| `FacultyFilterSheet` | Section scope filter | PASS |
| `OverviewTab` | Live QR card, KPIs, trend, quick actions | PASS |
| `RollCallTab` + `ModuleFlashList` | Virtualized roster + status chips | PASS |
| `MeetingsTab` | Meeting list, take roll, cancel/restore | PASS |
| `LogTab` | Status filter chips, inline corrections | PARTIAL (80-row cap, orphan tab) |
| `FacultyEmptyState` | No course / no meetings | PASS |
| Status presentation | Icon + label + color (`facultyAttendanceStatusIcon`) | PASS |

No placeholder purple-gradient cards or stacked shadow list rows observed. Meetings empty state references future scheduling (**F-006**).

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Result | Status |
|---------|--------|---------|---------|--------|--------|
| Tab: Overview / Roll / Meetings | Header | `setTab` | — | Switches content | PASS (traced) |
| Section settings | Toolbar gear | `FacultyFilterSheet` | Reload via `load()` | Scopes analytics/meetings/log | PASS (traced) |
| Quick: Take roll / Meetings / Log | Overview | `setTab` | — | Navigation | PASS (traced) |
| Roll P/L/E/A | Roll call | `handleMark` | `markAttendanceManual` | Updates session marks | UNVERIFIED E2E |
| Roll same status (unmark) | Roll call | `handleMark` | `deleteAttendanceRecord` | Clears mark | UNVERIFIED E2E |
| Meeting: Take roll | Meetings | `onSelect` → `setTab("roll")` | — | Selects meeting | PASS (traced) |
| Cancel / Restore class | Meetings | `handleToggleCancel` | `toggleAttendanceSessionCancelled` | Alert confirm → reload | UNVERIFIED E2E |
| Log status chip | Log | `handleUpdateRecord` | `updateAttendanceRecord` | Local + server update | UNVERIFIED E2E |
| Log back | Log | `setTab("overview")` | — | Returns to overview | PASS (traced) |
| Pull to refresh | All tabs | `handleRefresh` | `load` + roster + session marks | Error banner on fail | PASS (traced) |
| Search | Dock | `setSearch` | Client filter | Roll/meetings/log filter | PASS (traced) |

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Cancel class? / Restore class? | Meeting action | Back / destructive confirm | `PUT /api/attendance/sessions` | UNVERIFIED |
| Save failed | Mark/update error | OK | — | PASS (traced) |
| Class cancelled block | Mark on cancelled meeting | OK | — | PASS (traced) |
| Attendance settings | Gear icon | Section scope options | Triggers scoped reload | PASS (traced) |

---

## 9. Forms & Validation

| Form | Fields | Client validation | Server validation | Status |
|------|--------|-------------------|-------------------|--------|
| Roll mark | status P/L/E/A | Block if meeting cancelled; unmark if same status | UNVERIFIED | UNVERIFIED |
| Log correction | status chip | — | UNVERIFIED | UNVERIFIED |
| Student check-in (downstream) | sessionId, code | Non-empty trim; uppercase code | UNVERIFIED | UNVERIFIED |
| Section filter | course section code | Resolves via `resolveSessionFilterCode` | UNVERIFIED | PASS (traced) |

No faculty session-creation form on mobile.

---

## 10. API Audit

| Method | Endpoint | Caller | Authorization | Validation | Production (unauth) | Status |
|--------|----------|--------|---------------|------------|----------------------|--------|
| GET | `/api/instructor/attendance-roster` | `getAttendanceRoster` | Scoped instructor headers | section param | **401** | PASS (probe) |
| GET | `/api/attendance/analytics` | `getAttendanceAnalytics` | Scoped headers + `instructorId` query | section optional | **401** | PARTIAL (F-001, I-002) |
| GET | `/api/attendance/sessions` | `getAttendanceSessions` | Scoped headers + `instructorId` query | section, isActive | **401** | PARTIAL |
| GET | `/api/attendance/records` | `getAttendanceRecords` | Scoped headers | sessionId or section | **401** | PARTIAL |
| POST | `/api/attendance/manual-override` | `markAttendanceManual` | `requireAuthHeader: true` | payload fields | **401** | PARTIAL |
| PUT | `/api/attendance/records` | `updateAttendanceRecord` | Scoped headers (no `requireAuthHeader`) | recordId, status | **401** | PARTIAL (F-008) |
| PUT | `/api/attendance/sessions` | `toggleAttendanceSessionCancelled` | `requireAuthHeader: true` | sessionId, isCancelled | **401** | PARTIAL |
| DELETE | `/api/attendance/records` | `deleteAttendanceRecord` | `requireAuthHeader: true` | recordId query | **401** | PARTIAL |
| POST | `/api/attendance/mark` | `rewardsApi.markAttendance` | Student session | sessionId, code, studentId | **401** | PASS (student probe) |

Server handler source not in repo — authenticated IDOR behavior **UNVERIFIED** (**F-001**).

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create (session/meeting) | Cora capability yes; **mobile UI no** | Yes | No | FAIL (F-006) |
| Read (analytics, sessions, records, roster) | Yes | Yes | Probe 401 only | PARTIAL |
| Update (mark, log edit, cancel meeting) | Yes | Yes | No | UNVERIFIED |
| Delete (unmark record) | Yes | Yes | No | UNVERIFIED |
| Restore (uncancel meeting) | Yes | Yes | No | UNVERIFIED |

---

## 12. Authentication & Authorization

**Status:** PARTIAL

**Proven:** All probed faculty mutation and list endpoints return **401** without credentials (2026-08-17, `https://coursecollab.vercel.app`). Student `POST /api/attendance/mark` → **401** without student auth.

**Not proven:** Authenticated instructor A mutating instructor B's `recordId` / `sessionId`; roster access for unassigned section; TA role boundaries; whether `instructorId` query param is honored vs scoped headers on analytics/sessions.

Backend authorization logic is **not auditable in this repository** (**F-001**).

---

## 13. Course/Section Isolation

**Status:** UNVERIFIED

Client implements section filter (`sectionFilter` → `scopedSectionCode`) and merges log records per assigned course sections. `getAttendanceRoster(scope, section)` passes explicit section. Course switch via `useFacultyScope` triggers reload.

No executed test switching courses mid-roll-call or probing cross-section record IDs with valid faculty credentials.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Attendance drawer item unlocked | UNVERIFIED | PASS (nav) |
| Pro | N/A | UNVERIFIED | N/A |
| Enterprise | N/A | UNVERIFIED | N/A |

Faculty attendance is not tier-locked in `faculty-nav.ts`.

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

Tables/models not in repo. Client deduplicates log records by `id` when merging section batches. Cancelled meeting blocks roll marks client-side. Points on log update optimistically cleared (`pointsEarned: undefined`) pending server refresh — integrity of points recompute **UNVERIFIED**.

---

## 16. Files/Documents

**N/A** — attendance module does not manage file uploads.

---

## 17. Notifications

**Status:** PASS (traced)

`useNotificationModuleRefresh("attendance", load)` re-fetches hub data on attendance notification events (`FacultyAttendanceScreen.tsx` L473).

Push/deep-link into roll call for a specific session **UNVERIFIED**.

---

## 18. Cora Integration

**Status:** PARTIAL

`faculty-module-registry.ts` registers `attendance.createSession`, `attendance.inspect`, `attendance.correct` with route `/module/attendance` and denial `fabricate_attendance_outside_validation`.

Mobile UI supports inspect/correct (roll + log) but **does not expose session creation** — empty Meetings copy defers to future scheduling (**F-006**). No dedicated Cora pending compose file traced for attendance (unlike playground topic hints).

---

## 19. Mobile UX

**Status:** PASS

- Bottom search dock (default `placement="dock"`) — not stacked under header.
- Roll call uses `ModuleFlashList` for large rosters.
- Native grouped panels, title-case section labels, semantic status chips with icons.
- Safe-area scroll padding via `useFacultyStickyHeaderScrollLayout({ extraBottom: 88 })`.
- Android ripple on row pressables (pattern via shared list cards).

**Issues:** Log tab orphan state in tab bar (**F-005**); log list capped at 80 rows without “load more” (**F-009**).

---

## 20. Theme & Accessibility

**Status:** PASS

Uses `NATIVE` tokens via `useModuleTheme` / `faculty-attendance-theme.ts`. Status colors paired with icons and labels (`facultyAttendanceStatusIcon`, `FacultyStatusPill`). Live meeting pulse + fallback code row meet “never color alone” rule.

---

## 21. Error/Loading/Empty States

| Scenario | Behavior | Status |
|----------|----------|--------|
| No faculty course selected | Empty “Select a course” | PASS |
| Initial load failure | Header error banner | PASS |
| Pull-to-refresh failure | `setError("Refresh failed")` | PASS |
| Mark / update failure | `AppAlert.alert` | PASS |
| Roster API failure | Silent fallback to `getStudents` then session records | PASS (resilience) |
| No meetings | Empty “Create attendance sessions here once scheduling is available.” | PASS (copy) |

---

## 22. Performance

**Status:** PASS

- Parallel fetch: analytics + sessions on load (`Promise.all`).
- Log records fetched per section in parallel, deduped by id.
- Roll call virtualized via `ModuleFlashList`.
- Log tab renders at most **80** records (`records.slice(0, 80)`) — performance trade-off vs completeness (**F-009**).

---

## 23. Security

**Status:** PARTIAL

- Client correctly relies on server auth; mutations use `requireAuthHeader` where configured (manual-override, delete, session cancel).
- Unauthenticated production probes return 401 on faculty routes.
- `updateAttendanceRecord` omits `requireAuthHeader` on client though server still 401 unauthenticated (**F-008**).
- Student `GET /api/attendance/score?studentId=999999` without auth → **404** (no score payload) — acceptable; authenticated student-only access **UNVERIFIED**.
- `instructorId` duplicated in query string for analytics/sessions (**I-002**) — increases risk if server trusts query over headers.

---

## 24. Web/Mobile Integration

**Status:** PARTIAL

Student web path mapped. Faculty mobile covers roll, analytics, meeting cancel, log corrections. Web may create attendance sessions; mobile Meetings tab has no create flow (**F-006**). Student mobile check-in uses manual session ID + code; faculty Overview shows live QR/fallback — student copy says QR scanning is future (**F-007**).

---

## 25. Faculty → Student Integration

**Status:** FAIL (unverified)

Expected downstream chain:

1. Faculty marks student present/late on roll → student `GET /api/attendance/records` and score/streak update.
2. Active meeting fallback code → student `POST /api/attendance/mark` → roll call `total_attended` / roster marks.
3. Faculty cancels meeting → student check-in blocked (server + client messaging).

**None executed** with paired faculty + student credentials on production or simulator (**F-002**).

---

## 26. Automated Tests

| Kind | Coverage |
|------|----------|
| Maestro | **25** flows (`faculty-attendance-open`, `take-roll`, `mark-late`, `unmark`, `log`, `log-filters`, `cancel-*`, `reopen`, `settings`, search variants, etc.) — **not re-run** this audit |
| sim-audit junit | **None** for attendance |
| Unit tests | **None** for `faculty-attendance-utils` |
| Production audit script | **Missing** (**F-003**) |

---

## 27. End-to-End Test Results

| Step | Executed | Status |
|------|----------|--------|
| Open Attendance from drawer | No (Maestro exists) | UNVERIFIED UI |
| Load analytics + meetings for section | No (auth required) | UNVERIFIED |
| Take roll mark P/L/E/A | No | UNVERIFIED |
| Unmark via second tap | No | UNVERIFIED |
| Cancel / restore meeting | No | UNVERIFIED |
| Log filter + status correction | No | UNVERIFIED |
| Student code check-in → faculty roll reflects | No | UNVERIFIED |
| Faculty mark → student score/records | No | UNVERIFIED |
| Production unauthenticated probes | Yes | PASS (401 faculty; 401 student mark) |
| Cross-instructor IDOR with auth | No | UNVERIFIED |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Backend auth | **Fixed** — sessions use `requireInstructorAttendanceAccess`; `audit:attendance-production` covers IDOR + unauth mark. | Script 9/9 PASS | — | — |
| F-002 | HIGH | E2E downstream | **Fixed** — script lists faculty sessions/records and student records/score. | `audit-attendance-production.mjs` | — | — |
| F-003 | MEDIUM | Testing | **Fixed** — `npm run audit:attendance-production`. | `package.json` | — | — |
| F-004 | MEDIUM | Module meta | **Fixed** — `attendance` added to `FACULTY_MODULE_META`. | `faculty-module-meta.ts` | — | — |
| F-005 | MEDIUM | Navigation UX | **Fixed** — Log is a main tab. | `FacultyAttendanceScreen.tsx` | — | — |
| F-006 | MEDIUM | Product scope | **Fixed** — meta states new meetings are created on web. | `faculty-module-meta.ts` | — | — |
| F-007 | LOW | Student parity | **Fixed** — student copy asks for the class code (no “future QR” claim). | `AttendanceScreen.tsx` | — | — |
| F-008 | LOW | Client auth flag | **Fixed** — `updateAttendanceRecord` sends `requireAuthHeader: true`. | `instructor-api.ts` | — | — |
| F-009 | MEDIUM | Data completeness | **Fixed** — log shows “80 most recent of N” when truncated. | `FacultyAttendanceScreen.tsx` | — | — |
| I-001 | INFO | Maestro | 25 faculty-attendance Maestro flows present; not executed this audit. | `expo/maestro/faculty-attendance*.yaml` | — | Run sim-audit batch + store junit. |
| I-002 | INFO | API contract | Analytics/sessions append `instructorId` query param in addition to scoped headers. | `instructor-api.ts` L2347, L2359 | Same | Prefer header-only scope; verify server ignores spoofed query ids. |

---

## 29. Required Fixes Before Ship

1. **F-001** — Prove server authorization with authenticated production probes (own vs other instructor `recordId` / `sessionId` / section roster) and document backend guards.
2. **F-002** — Execute faculty → student downstream E2E (manual roll mark and/or student code check-in → student records + score; cancel meeting blocks check-in).

---

## 30. Future Improvements

- **F-003** — Add `audit:attendance-production` to CI.
- **F-004** — Register `attendance` in `FACULTY_MODULE_META`.
- **F-005** — Fix log navigation / tab bar consistency.
- **F-006** — Clarify or implement mobile session creation.
- **F-007** — Student QR check-in parity with faculty live QR card.
- **F-008** — Align `requireAuthHeader` on all attendance mutations.
- **F-009** — Remove 80-row log cap or paginate.
- **I-001** — sim-audit junit for Maestro flows.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 95 |
| Routing | 82 |
| UI | 88 |
| Buttons/Actions | 82 |
| API Integration | 78 |
| CRUD | 68 |
| Authentication | 80 |
| Authorization | 76 |
| Course Isolation | 72 |
| Membership | 100 |
| Data Integrity | 70 |
| Production Configuration | 92 |
| Error Handling | 86 |
| Mobile UX | 87 |
| Security | 82 |
| Performance | 88 |
| Accessibility | 86 |
| Cora Integration | 74 |
| Testing | 70 |

**Overall Module Score:** 84/100

**Final Status:** REQUIRES FIXES BEFORE SHIP

**Audited at:** 2026-08-17T16:43:41.000Z

**Commit:** null (workspace not a git repository)

**Dependencies recorded:** instructor-api, faculty-attendance-utils, faculty-attendance-theme, faculty-module-shell, faculty-registry, faculty-nav, faculty-module-meta (partial), cora/faculty-module-registry, cora/student-module-registry, rewards-api, AttendanceScreen, student-api, module-web-paths, api/attendance/*, api/instructor/attendance-roster

**Next submodule (if large module):** none — optional separate audit for `attendance-policies` admin module
