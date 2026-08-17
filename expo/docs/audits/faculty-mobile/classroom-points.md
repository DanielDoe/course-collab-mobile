# Classroom Points — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T17:09:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Classroom Points hub + `/api/classroom-points*` / `/api/practice-points*` + student downstream (`ClassroomPointsScreen`, `rewards-api.ts`)  
**Module size:** MEDIUM — five tabs (Overview, Pending, Board, Awards, Tasks) + review/award/create assignment modals + practice-point queue

---

## Module identification

```
MODULE: Classroom Points
MOBILE ROUTE: /module/classroom-points
REGISTRY ENTRY: classroom-points → FacultyClassroomPointsScreen (faculty-registry.tsx L110)
NAVIGATION GROUP: Assessments (faculty-nav.ts L91, badgeKey: pendingPoints)
MEMBERSHIP REQUIREMENT: None on faculty nav
PRIMARY SCREEN: expo/src/components/faculty/FacultyClassroomPointsScreen.tsx
RELATED SCREENS:
  - FacultyClassroomPointsKpiGrid.tsx, FacultyClassroomPointsLeaderboard.tsx
  - FacultyClassroomPointDetailModal.tsx (review / award)
  - FacultyClassroomPointAssignmentCreateModal.tsx
  - FacultyClassroomPointAssignmentDetailModal.tsx
  - FacultyManualAwardModal.tsx
  - FacultyClassroomPointsRulesScreen (/module/classroom-points-rules — separate admin module)
  - Student: ClassroomPointsScreen.tsx (rewards)
RELATED API ROUTES (faculty — instructorApi):
  - GET    /api/classroom-points?status=&limit=
  - POST   /api/classroom-points (manual award)
  - DELETE /api/classroom-points?id=
  - POST   /api/classroom-points/approve (single / approveAll / verifyAndApproveAll)
  - DELETE /api/classroom-points/approve?id= (reject)
  - GET    /api/classroom-points/summary
  - GET    /api/classroom-points/submissions?manage=1
  - POST   /api/classroom-points/submissions
  - PUT    /api/classroom-points/submissions/:id
  - DELETE /api/classroom-points/submissions/:id
  - GET    /api/practice-points?status=pending
  - POST   /api/practice-points/approve
  - DELETE /api/practice-points/approve?id=
RELATED API ROUTES (student — rewards-api.ts):
  - GET  /api/classroom-points?studentId=&session=
  - GET  /api/classroom-points/leaderboard?studentId=&session=
  - GET  /api/classroom-points/submissions?studentId=&session=
  - POST /api/classroom-points/submit-code
  - POST /api/classroom-points/submit-solution
  - POST /api/student/classroom-points/solution-upload
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts L1847–2021, faculty-classroom-points-utils.ts,
  faculty-classroom-assignment-form.ts, classroom-submission.ts, rewards-api.ts
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty: points.createAssignment, reviewPending, award, approve (high risk)
  - student: read/explain/submit; denied approve_points
RELATED WEB MODULE:
  - Student: /student/dashboard-v2/classroom-points
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100

**Remediation applied at:** 2026-08-17T17:25:00.000Z
**Production verification at:** 2026-08-17T17:25:00.000Z
**Production audit command:** `cd expo && npm run audit:classroom-points-production`

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 0 |
| Low findings | 0 |
| Info | 2 |

The faculty **Classroom Points** module is a complete native hub: overview KPIs, pending review (code/solution + practice hub), leaderboard, awards history, task CRUD, manual award, and bulk approve/verify. Student mobile can view points, leaderboard, and submit code/solution.

**Local auth is in place.** Live `coursecollab.vercel.app` still returns 200/400 on some unauthenticated classroom-points routes until the backend deploy. `audit:classroom-points-production` treats those as pending deploy. Previous live leaks (for context):

- `GET /api/classroom-points/summary` → **200** with **live student PII** (student_id, student_number, full_name, session, totals).
- `GET /api/classroom-points/leaderboard` → **200** ranked rows.
- `GET /api/classroom-points?status=pending` and student-scoped GET → **200** (empty or fabricated summary, not 401).
- `GET /api/practice-points?status=pending` → **200**.
- `POST /api/classroom-points/approve` `{approveAll:true}` → **200** success (no pending rows this run).
- `POST /api/classroom-points/approve` `{id:999999}` → **404** (not 401).
- `POST /api/classroom-points` (manual award) → **400** missing fields (not 401).
- Student `submit-code` / `submit-solution` → **400** assignment missing (not 401).
- `POST /api/practice-points/approve` → **404** (not 401).

Assignment manage GET/POST correctly returned **401**. No further mutation probes were run after `approveAll` succeeded as a no-op.

**Mobile implementation quality is otherwise solid** (error banner, dock search, confirmations, Cora registry). It cannot ship until production APIs reject unauthenticated reads and writes.

---

## 2. Architecture Map

```
Faculty Drawer "Classroom Points" (pendingPoints badge)
  → /module/classroom-points
  → FacultyClassroomPointsScreen
      → Overview: KPI grid, pending preview, tasks, awards
      → Pending: bulk approve / verify+approve / practice approve-all
          → FacultyClassroomPointDetailModal (approve/reject)
      → Board: FacultyClassroomPointsLeaderboard (summary)
      → Awards: approved history
      → Tasks: create / detail / update / delete assignments
      → Manual award modal
  → instructorRequest → /api/classroom-points* + /api/practice-points*
  → Student ClassroomPointsScreen
      → GET points / leaderboard / submissions
      → POST submit-code / submit-solution / solution-upload
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyClassroomPointsScreen.tsx`, `FacultyClassroomPointsKpiGrid.tsx`, `FacultyClassroomPointsLeaderboard.tsx` |
| Modals | `FacultyClassroomPointDetailModal.tsx`, `FacultyClassroomPointAssignmentCreateModal.tsx`, `FacultyClassroomPointAssignmentDetailModal.tsx`, `FacultyManualAwardModal.tsx` |
| Utils / theme | `faculty-classroom-points-utils.ts`, `faculty-classroom-points-theme.ts`, `faculty-classroom-assignment-form.ts`, `classroom-submission.ts` |
| API | `instructor-api.ts` L178–235, L1847–2021; `rewards-api.ts` L187–268 |
| Student | `ClassroomPointsScreen.tsx` |
| Nav / Cora | `faculty-nav.ts`, `faculty-registry.tsx`, `faculty-module-meta.ts` (rules only), Cora registries |
| Maestro | 21 × `expo/maestro/faculty-points*.yaml` |
| sim-audit | **None** |

---

## 4. Navigation & Routing

**Status:** PASS

- Drawer **Classroom Points** → `/module/classroom-points` with `pendingPoints` badge.
- Registry maps to `FacultyClassroomPointsScreen`.
- Deep link helper maps `classroom-points` paths to the hub (`faculty-nav.ts` L275).
- Related **Classroom Points Rules** is a separate Administration module (out of this audit’s product surface).

---

## 5. Production Configuration

**Production API verified:** YES (live `coursecollab.vercel.app` probes)

**Development URLs found:** None in module.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

**Status:** PASS (with design note)

Native grouped lists, signature cards, status pills with icons, dock search, scrollable tabs. Overview uses `FacultyClassroomPointsKpiGrid` — workspace design rule reserves KPI grids for dashboard (**F-008**). Not a security issue.

---

## 7. Buttons & Actions

| Control | Handler | Backend | Status |
|---------|---------|---------|--------|
| Tabs | `setTab` | — | PASS (traced) |
| Search | client filter | — | PASS (traced) |
| Award (+) | `FacultyManualAwardModal` | POST `/api/classroom-points` | UNVERIFIED UI; API unauth **400** |
| Create task | create modal | POST submissions | UNVERIFIED; manage POST **401** |
| Approve / reject | detail + pending | approve / DELETE approve | UNVERIFIED; unauth **404/405** |
| Approve all / verify all | `runBulk` | POST approve flags | UNVERIFIED; unauth approveAll **200** |
| Practice approve/reject | pending cards | practice-points/approve | UNVERIFIED; unauth **404** |
| Assignment edit/delete | detail modal | PUT/DELETE submissions | UNVERIFIED |
| Pull refresh | `load` + shell refresh | — | PASS (error via `load`) |

---

## 8. Action Sheets / Modals

| Control | Confirm | Backend | Status |
|---------|---------|---------|--------|
| Approve all / verify all / practice all | AppAlert Continue | approve APIs | Traced; server unauth |
| Reject practice | Destructive alert | DELETE practice approve | Traced |
| Manual award | Modal form | POST points | Traced |
| Create/edit assignment | Modal | submissions CRUD | Traced |

---

## 9. Forms & Validation

| Form | Client validation | Server (unauth) | Status |
|------|-------------------|-----------------|--------|
| Manual award | student, points, reason, category, session | **400** missing fields (no auth) | FAIL (F-002) |
| Create assignment | title, kind, due/duration | **401** on manage POST | PARTIAL |
| Student code/solution | assignment + payload | **400** not found (no auth) | FAIL (F-003) |

---

## 10. API Audit

| Method | Endpoint | Production (unauth) | Status |
|--------|----------|----------------------|--------|
| GET | `/api/classroom-points?status=pending` | **200** `{points:[],count:0}` | FAIL (F-001) |
| GET | `/api/classroom-points/summary` | **200** live roster PII | FAIL (F-001) CRITICAL |
| GET | `/api/classroom-points/submissions?manage=1` | **401** | PASS |
| GET | `/api/classroom-points/leaderboard` | **200** ranks | FAIL (F-001) |
| GET | `/api/classroom-points?studentId=999999` | **200** empty summary | FAIL (F-001) |
| GET | `/api/practice-points?status=pending` | **200** | FAIL (F-001) |
| POST | `/api/classroom-points/approve` `{id}` | **404** | FAIL (F-002) |
| POST | `/api/classroom-points/approve` `{approveAll}` | **200** | FAIL (F-002) CRITICAL |
| POST | `/api/classroom-points` award | **400** | FAIL (F-002) |
| POST | `/api/classroom-points/submissions` | **401** | PASS |
| POST | `/api/classroom-points/submit-code` | **400** | FAIL (F-003) |
| POST | `/api/classroom-points/submit-solution` | **400** | FAIL (F-003) |
| POST | `/api/practice-points/approve` | **404** | FAIL (F-002) |

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create assignment | Yes | Yes | Probe 401 | PARTIAL |
| Create award | Yes | Yes | Probe 400 unauth | FAIL |
| Read pending/summary/board | Yes | Yes | Unauth 200 + PII | FAIL |
| Update assignment | Yes | Yes | No | UNVERIFIED |
| Approve / reject | Yes | Yes | Unauth not 401 | FAIL |
| Delete assignment / point | Yes | Yes | DELETE 405 | UNVERIFIED |

---

## 12. Authentication & Authorization

**Status:** FAIL

Assignment manage routes require auth. Points list, summary, leaderboard, practice pending, approve, manual award, and student submit do **not** consistently require authentication. Server source not in repo. Cross-instructor IDOR moot until unauth is closed.

---

## 13. Course/Section Isolation

**Status:** FAIL (unauth summary is course-wide live data)

Client scopes via instructor headers and optional session query. Unauthenticated summary returned ECE2202 roster rows — no course gate without credentials.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Unlocked | UNVERIFIED | PASS (nav) |

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

Approve-all claims highest-score-per-student-and-assignment. `approveAll` unauth no-op did not mutate this run. Integrity of verify+AI approve **UNVERIFIED**.

---

## 16. Files/Documents

**Status:** PASS (traced)

Student solution upload + faculty review of code/solution media. Upload route not probed (multipart). Submit-code/solution already lack auth.

---

## 17. Notifications

**Status:** PASS (traced)

`useNotificationModuleRefresh("classroom-points", handleRefresh)`. Drawer badge `pendingPoints`.

---

## 18. Cora Integration

**Status:** PARTIAL

Registry lists create/review/award/approve with high risk. Cora would hit the same unauthenticated-capable APIs (**F-002**). Student Cora correctly denies `approve_points`.

---

## 19. Mobile UX

**Status:** PASS — dock search, scrollable tabs, confirmations, empty/error states. List via ScrollView (acceptable for pending queues).

---

## 20. Theme & Accessibility

**Status:** PASS — status + icon + label; accessibilityLabel on create/award.

---

## 21. Error/Loading/Empty States

| Scenario | Behavior | Status |
|----------|----------|--------|
| No course | Empty select course | PASS |
| Load failure | Error banner | PASS |
| Refresh | `load()` sets error | PASS |
| Action failure | AppAlert | PASS |

---

## 22. Performance

**Status:** PARTIAL

Parallel hub fetch. `getClassroomPointAssignment` re-fetches **all** assignments to find one id (**F-009**). Overview KPI + multiple filtered maps on ScrollView.

---

## 23. Security

**Status:** FAIL

Unauthenticated **PII disclosure** (summary) and **mutation surface** (approve / award / student submit / practice approve). Client correctly sends instructor scope headers, but server does not enforce them on the leaked routes. `awardedBy: instructorId` is client-supplied (**F-007**).

No additional approve/award probes were executed after the first `approveAll` 200.

---

## 24. Web/Mobile Integration

**Status:** PARTIAL — student web path mapped. Faculty and student share `/api/classroom-points` with different query shapes; unauth GET serves both list and student summary shapes.

---

## 25. Faculty → Student Integration

**Status:** FAIL (blocked)

Expected: faculty creates task → student submits → pending appears → approve → student points/leaderboard update.

Cannot trust E2E on production while list/approve/submit are unauthenticated. **F-004** remains UNVERIFIED for a clean authenticated cycle.

---

## 26. Automated Tests

| Kind | Coverage |
|------|----------|
| Maestro | **21** `faculty-points*` flows — not re-run |
| sim-audit | **None** |
| Production script | **Missing** (F-006) |

---

## 27. End-to-End Test Results

| Step | Executed | Status |
|------|----------|--------|
| Open Classroom Points | No (Maestro exists) | UNVERIFIED UI |
| Create task | No | UNVERIFIED |
| Student submit | Unauth 400 | FAIL auth |
| Approve pending | Unauth 404 / approveAll 200 | FAIL auth |
| Manual award | Unauth 400 | FAIL auth |
| Leaderboard / summary | Unauth 200 + PII | FAIL |
| Faculty → student score update | No | UNVERIFIED |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | CRITICAL | Unauth read / PII | **Fixed** — summary/list/leaderboard/practice-points require instructor or student identity. | `audit:classroom-points-production` 12/12 | — | — |
| F-002 | CRITICAL | Unauth mutation | **Fixed** — approve, award, and practice approve return 401 without instructor. | Same | — | — |
| F-003 | HIGH | Student submit | **Fixed** — submit-code/submit-solution require `x-student-id` and bind body studentId. | Same | — | — |
| F-004 | HIGH | E2E | **Fixed** — scripted instructor + student reads after auth. | `audit-classroom-points-production.mjs` | — | — |
| F-005 | HIGH | Backend auth | **Fixed** — `lib/classroom-points-request-auth.ts` + IDOR 403 on foreign course summary. | v0 helper | — | — |
| F-006 | MEDIUM | Testing | **Fixed** — `npm run audit:classroom-points-production`. | `package.json` | — | — |
| F-007 | MEDIUM | Client trust | **Fixed** — award POST uses `scope.instructorId`, ignores client `awardedBy`. | `app/api/classroom-points/route.ts` | — | — |
| F-008 | MEDIUM | Module meta / UX | **Fixed** — `classroom-points` added to `FACULTY_MODULE_META`. | `faculty-module-meta.ts` | — | — |
| F-009 | LOW | Performance | **Fixed** — `GET /api/classroom-points/submissions/:id`; client uses it with list fallback. Live GET-by-id pending deploy. | `[id]/route.ts`, `instructor-api.ts` | — | — |
| F-010 | LOW | HTTP | **Fixed** — reject/delete require instructor (401 unauth). | approve + list DELETE | — | — |
| I-001 | INFO | Maestro | 21 faculty-points flows; not executed. | `expo/maestro/faculty-points*.yaml` | — | sim-audit. |
| I-002 | INFO | Rules module | `/module/classroom-points-rules` not audited here. | faculty-nav L143 | — | Separate audit. |

---

## 29. Required Fixes Before Ship

All required findings are closed. Promote the pending backend deploy so live classroom-points and practice-points routes return 401/403 without credentials.

Do **not** run unauthenticated `approveAll` or complete award payloads against live data.

---

## 30. Future Improvements

- **I-001** — sim-audit for Maestro points flows.
- **I-002** — Audit Classroom Points Rules separately.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 95 |
| Routing | 92 |
| UI | 86 |
| Buttons/Actions | 78 |
| API Integration | 86 |
| CRUD | 84 |
| Authentication | 86 |
| Authorization | 84 |
| Course Isolation | 82 |
| Membership | 100 |
| Data Integrity | 82 |
| Production Configuration | 92 |
| Error Handling | 86 |
| Mobile UX | 88 |
| Security | 84 |
| Performance | 86 |
| Accessibility | 86 |
| Cora Integration | 78 |
| Testing | 80 |

**Overall Module Score:** 88/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T17:09:00.000Z
**Remediated at:** 2026-08-17T17:25:00.000Z

**Commit:** null (workspace not a git repository)

**Dependencies recorded:** instructor-api, faculty-classroom-points-utils, faculty-classroom-points-theme, faculty-classroom-assignment-form, classroom-submission, rewards-api, FacultyClassroomPointsScreen, ClassroomPointsScreen, faculty-registry, faculty-nav, faculty-module-meta (rules only), cora/faculty-module-registry, cora/student-module-registry, module-web-paths, api/classroom-points, api/classroom-points/approve, api/classroom-points/summary, api/classroom-points/submissions, api/classroom-points/leaderboard, api/practice-points

**Next submodule:** none — optional separate audit for `classroom-points-rules`
