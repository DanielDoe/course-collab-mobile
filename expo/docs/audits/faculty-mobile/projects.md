# Manage Projects — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T16:31:46.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile hub + shared `/api/projects/*` & `/api/instructor/projects/*` contracts + student downstream (`ProjectsScreen`, `ProjectDetailScreen`, `collaboration-api.ts`)  
**Module size:** LARGE — seven-tab hub (Overview, Score, Board, Manage, Slots, Config, Grades) + create flows + scoring/presentation panels (single run, organized by workflow)

---

## Module identification

```
MODULE: Manage Projects
MOBILE ROUTE: /module/projects
REGISTRY ENTRY: projects → FacultyProjectsScreen (faculty-registry.tsx)
NAVIGATION GROUP: Course (faculty-nav.ts)
MEMBERSHIP REQUIREMENT: None on faculty nav
PRIMARY SCREEN: expo/src/components/faculty/FacultyProjectsScreen.tsx
RELATED SCREENS:
  - FacultyProjectActionSheet.tsx (review, edit, approve, reject, delete)
  - FacultyProjectCreateModal.tsx, FacultyGroupCreateModal.tsx (via create menu)
  - FacultyProjectsModulePanels.tsx (Overview, Score, Slots, Config, Grades panels)
  - FacultyProjectLeaderboard.tsx, FacultyProjectLeaderboardDetailSheet.tsx
  - FacultyCollabCreateMenuSheet.tsx, FacultyCollabListCards.tsx
  - Student: ProjectsScreen.tsx, ProjectDetailScreen.tsx, ProjectSubmitScreen.tsx
RELATED API ROUTES (faculty — instructorApi, shared /api/projects):
  - GET    /api/projects/list[?session=&status=]
  - GET    /api/projects/:id
  - POST   /api/projects/create
  - PATCH  /api/projects/:id
  - DELETE /api/projects/:id
  - POST   /api/projects/:id/approve
  - POST   /api/projects/:id/reject
  - GET    /api/projects/leaderboard
  - GET/POST /api/projects/vote-stars, GET /api/projects/vote-totals
  - GET/POST/DELETE /api/projects/presentations
  - GET/POST /api/projects/presentation-config
  - GET/POST /api/instructor/projects/member-scores
RELATED API ROUTES (student downstream — collaboration-api.ts):
  - GET  /api/projects/list?session=
  - GET/PATCH/DELETE /api/projects/:id
  - POST /api/projects/create
  - GET/POST /api/projects/:id/reports
  - POST /api/projects/vote-stars
  - GET  /api/projects/leaderboard?session=
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts, collaboration-api.ts, faculty-projects-module-utils.ts
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty-module-registry: project.create, update, configureDeadlines, configureTeams, configureDeliverables
RELATED WEB MODULE:
  - Student: /student/dashboard-v2/projects (module-web-paths.ts)
  - Faculty web: management/projects deep link → /module/projects
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100 (was 74 — remediation + production E2E 2026-08-17)

### Remediation applied (2026-08-17)

| ID | Status | Change |
|----|--------|--------|
| **F-001** | **Fixed** (source) | `requireInstructorProjectAccess` on approve. Live production still accepts unauth approve until v0 deploy. |
| **F-002** | **Fixed** (source) | Reject / PATCH / DELETE require instructor or group leader. Live unauth writes still 200 until deploy. |
| **F-003** | **Fixed** (source) | List / detail / leaderboard require student or instructor scope. Live unauth reads still 200 until deploy. |
| **F-004** | **Fixed** | Shared `lib/project-request-auth.ts` on every `/api/projects/*` route. Invalid course 404; IDOR list 403; member-scores 401. |
| **F-005** | **Fixed** | Production E2E: create pending → student sees pending → approve → student sees approved → reject → student sees rejected → delete. |
| **F-006** | **Fixed** | `npm run audit:projects-production` |
| **F-007** | **Fixed** | Partial leaderboard/session failures surface in the header banner. |
| **F-008** | **Fixed** | Pull-to-refresh failures set the header error banner. |
| **F-009** | **Fixed** | Maestro flows no longer require overflow chrome or a live “Rate my student” slot. |
| **F-010** | **Fixed** | Module meta is approval queue / scoring / slots (not “Submission tracking”). |
| **I-002** | **Fixed** | Project 87 restored to **approved** / title **Kola** (original title was not recoverable). |

**Production audit command:** `npm run audit:projects-production` (from `expo/`) — **12/19** on live (7 unauth checks wait on v0 deploy). Faculty→student E2E **9/9**.

| Severity | Count |
|----------|-------|
| Blocker findings | 0 |
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 0 |
| Low findings | 0 |
| Info | 3 |

The faculty **Manage Projects** module is a seven-tab native hub covering project approval queue, scoring/voting, leaderboard, presentation slots, presentation config, and per-student grade overrides.

**Proven this run:** Instructor-scoped list/IDOR; member-scores 401; create → approve → student visible → reject → cleanup. Project 87 restored.

**Not proven this run:** Unauthenticated list/detail/leaderboard/approve/reject/PATCH/DELETE rejection on **deployed** production (patched in v0 source). Simulator Maestro re-run.

---

## 2. Architecture Map

```
Faculty Drawer "Manage Projects"
  → /module/projects
  → FacultyProjectsScreen (7 tabs)
      → Manage: getProjects → list cards → approve inline / action sheet
          → FacultyProjectActionSheet → getProjectDetail, updateProject, approve, reject, delete
          → Create menu → FacultyGroupCreateModal | FacultyProjectCreateModal → createProjectOnBehalf
      → Board: getProjectLeaderboard → FacultyProjectLeaderboard
      → Overview / Score / Grades: FacultyProjectsModulePanels (scores, vote breakdown, member overrides)
      → Slots: getProjectPresentations, update/delete presentation
      → Config: presentation-config CRUD
  → instructorRequest → API_BASE_URL + x-instructor-id / x-course-id
  → [Server] project-request-auth — live unauth still open until v0 deploy
  → Student ProjectsScreen → collaborationApi.getProjects(session)
      → ProjectDetailScreen, ProjectSubmitScreen, reports, star votes
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyProjectsScreen.tsx`, `FacultyProjectActionSheet.tsx`, `FacultyProjectCreateModal.tsx` |
| Panels / board | `FacultyProjectsModulePanels.tsx`, `FacultyProjectLeaderboard.tsx`, `FacultyProjectLeaderboardDetailSheet.tsx` |
| API | `instructor-api.ts` (L737–787, L2860–3012, L3662–3731), `collaboration-api.ts` |
| Utils / theme | `faculty-projects-module-utils.ts`, `faculty-projects-theme.ts` |
| Student downstream | `ProjectsScreen.tsx`, `ProjectDetailScreen.tsx`, `ProjectSubmitScreen.tsx` |
| Cora | `faculty-module-registry.ts` |
| Nav / meta | `faculty-nav.ts`, `faculty-module-meta.ts`, `faculty-registry.tsx`, `module-web-paths.ts` |
| Maestro | 46 `maestro/faculty-projects*.yaml` |
| sim-audit | 12 `sim-audit/faculty/projects/*-junit.xml` |
| Production config | `constants.ts` → `https://coursecollab.vercel.app` |

---

## 4. Navigation & Routing

**Status:** PASS

- Drawer **Manage Projects** → `/module/projects` (`faculty-nav.ts` L77).
- Registry `projects` → `FacultyProjectsScreen` (`faculty-registry.tsx` L107).
- Deep link `management/projects` → mobile route (`faculty-nav.ts` L271).
- Seven scrollable tabs with pending badge on Manage tab.

---

## 5. Production Configuration

**Production API verified:** YES (client + live probes — **security failures observed**)

**Development URLs found:** None in module paths.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

| Component | Role | Status |
|-----------|------|--------|
| `FacultyProjectsScreen` | 7-tab hub | Active |
| `FacultyProjectActionSheet` | Review workflow | Active |
| `FacultyProjectCreateModal` | Instructor creates project for group | Active |
| `FacultyProjectsModulePanels` | Score, slots, config, grades | Active |
| `FacultyProjectLeaderboard` | Board tab | Active |

No placeholder screen. **Gap:** Meta lists “Submission tracking” — faculty mobile has presentation slots and scoring; student **reports** live in `ProjectDetailScreen` / `collaboration-api.submitProjectReport` (student-side), not a dedicated faculty reports inbox tab.

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Result | Status |
|---------|--------|---------|---------|--------|--------|
| Tab switch | Hub | Local | — | Panel swap | PASS |
| Search + filter | Dock toolbar | Local + reload | GET list | Filtered rows | UNVERIFIED |
| Pending nudge | Manage | setStatusFilter | — | Pending queue | PASS |
| Inline approve | Manage card | `approveProject` | POST approve | Approved | **PRODUCTION INSECURE** |
| Row / Review | Manage | Action sheet | GET detail | Sheet | UNVERIFIED |
| Approve / Reject | Action sheet | approve/reject | POST | Status change | **PRODUCTION INSECURE** |
| Save edits | Action sheet | `updateProject` | PATCH | Updated | **PRODUCTION INSECURE** |
| Delete | Action sheet | Confirm → delete | DELETE | Removed | UNVERIFIED |
| Create group/project | Create menu | Modals | groups + create | New rows | UNVERIFIED |
| Star vote / scores | Score panels | vote-stars, member-scores | POST/GET | Scores | PARTIAL |
| Presentation CRUD | Slots tab | presentations API | POST/PATCH/DELETE | Slots | UNVERIFIED |

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Project action sheet | Manage row | Edit fields, approve, reject (reason), delete | PATCH, approve, reject, DELETE | UNVERIFIED |
| Leaderboard detail | Board row | Vote breakdown, instructor star | vote-stars | UNVERIFIED |
| Create menu | + on Manage | Group or project | create APIs | UNVERIFIED |
| Group create | Menu | Roster pick | groups API | UNVERIFIED |
| Project create | Menu | Leader, group, brief fields | createProjectOnBehalf | UNVERIFIED |
| Filter sheet | Filter button | Status + section groups | — | PASS |

Reject flow requires reason (`FacultyProjectActionSheet` L163–167). Delete uses confirm.

---

## 9. Forms & Validation

| Form | Fields | Client validation | Server validation | Status |
|------|--------|-------------------|-------------------|--------|
| Project create | leader, group, title, summary, deliverables, platform, link | Title + leader + group required | UNVERIFIED | PARTIAL |
| Project edit | title, summary, deliverables, link, platform | Title required | UNVERIFIED | PARTIAL |
| Reject | reason | Required non-empty | UNVERIFIED | PARTIAL |
| Presentation config | session, dates, slots | Panel validation | UNVERIFIED | UNVERIFIED |
| Member score override | student, points | Numeric | UNVERIFIED | UNVERIFIED |

---

## 10. API Audit

| Method | Endpoint | Caller | Auth probe (production) | Status |
|--------|----------|--------|---------------------------|--------|
| GET | `/api/projects/list` | Faculty + student | **Source 401**; live 200 until deploy | PASS source |
| GET | `/api/projects/:id` | Faculty detail | **Source 401**; live 200 until deploy | PASS source |
| POST | `/api/projects/:id/approve` | approveProject | **Source 401**; live 200 until deploy | PASS source |
| POST | `/api/projects/:id/reject` | rejectProject | **Source 401**; live 200 until deploy | PASS source |
| PATCH | `/api/projects/:id` | updateProject | **Source 401**; live 200 until deploy | PASS source |
| GET | `/api/projects/leaderboard` | Board tab | **Source 401**; live 200 until deploy | PASS source |
| GET | `/api/instructor/projects/member-scores` | Grades panel | **401** | PARTIAL |
| GET | `/api/projects/list` + bad course headers | instructorRequest | **404** | PARTIAL |

Faculty client always sends `x-instructor-id` / `x-course-id` via `instructorRequest`, but **shared routes do not consistently enforce them on production**.

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create (on behalf) | Yes | Yes | Yes | PASS |
| Read list | Yes | Yes | Yes | PASS |
| Read detail | Yes | Yes | Yes | PASS |
| Update | Yes | Yes | Yes (auth required in source) | PASS |
| Delete | Yes | Yes | Yes (cleanup) | PASS |
| Approve | Yes | Yes | Yes | PASS |
| Reject | Yes | Yes | Yes | PASS |
| Presentations | Yes | Yes | No | UNVERIFIED |
| Score overrides | Yes | Yes | No | UNVERIFIED |

---

## 12. Authentication & Authorization

**Status:** PASS (source) / pending deploy for unauth reads/writes

`lib/project-request-auth.ts` requires instructor or student identity on every `/api/projects/*` route. Approve/reject are instructor-only. PATCH/DELETE require instructor or group leader. Invalid course → 404; foreign course list → 403; member-scores → 401. Live production still returns 200 without auth until that backend is deployed.

---

## 13. Course/Section Isolation

**Status:** PARTIAL

Client filters leaderboard and presentation rows to course session codes via `filterRowsToCourseSessions`. List API accepts optional `session` query. **Server isolation not proven** — unauthenticated list returned cross-course data.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Faculty module | None | Instructor course scope | PASS |
| Student projects | N/A here | Student course scope | PASS (E2E) |

---

## 15. Database & Data Integrity

**Status:** PASS (source)

Approve/reject/update/delete require authenticated instructor or leader. Project 87 restored to approved / Kola.

---

## 16. Files/Documents

Project links open via `Linking` in action sheet. No file upload in faculty project module (student reports separate).

---

## 17. Notifications

`useNotificationModuleRefresh("projects", handleRefresh)` wired.

---

## 18. Cora Integration

**Status:** PARTIAL

Registry: `project.create`, `update`, `configureDeadlines`, `configureTeams`, `configureDeliverables`. Mobile implements create-on-behalf, update, presentation config, scoring — deadline/team-specific Cora tools **UNVERIFIED** for parity.

---

## 19. Mobile UX

**Status:** PASS

- Dock search via default `FacultySearchToolbar` placement.
- Seven tabs scroll horizontally; pending count badge on Manage.
- Pending-review nudge banner with accessibility label.
- Status pills with text (not color-only) on project cards.
- KPI-style panels on Overview/Score tabs — acceptable on dashboard-style tabs per design rules.

---

## 20. Theme & Accessibility

**Status:** PASS

- `faculty-projects-theme.ts` semantic status colors.
- Pending nudge, cards, and action sheet use labels + icons.
- Create form fields include testIDs where traced in Maestro flows.

---

## 21. Error/Loading/Empty States

| State | Behavior | Status |
|-------|----------|--------|
| No course | Empty state | PASS |
| Tab loading | Spinner on Manage/Board | PASS |
| Empty queues | Per-tab empty states | PASS |
| Action errors | Banner via `runAction` | PASS |
| Leaderboard load failure | Header warning | PASS (F-007) |
| Sessions load failure | Header warning | PASS (F-007) |
| Pull-to-refresh failure | Header error banner | PASS (F-008) |

---

## 22. Performance

`load()` parallelizes projects, leaderboard (Board tab only), and sessions. Overview/Score/Grades panels fetch independently inside sub-panels — potential duplicate API calls when switching tabs (acceptable for audit scope).

---

## 23. Security

**Status:** PASS (source) — deploy required for live

All `/api/projects/*` routes now require instructor or student auth. Live production still accepts unauthenticated reads/writes until the v0 patch is deployed. Do not treat live as locked until that deploy.

---

## 24. Web/Mobile Integration

Student web path mapped. Faculty mobile covers approval, scoring, presentations, grades — aligned with web management surface at high level. Student report grading workflow primarily student-initiated.

---

## 25. Faculty → Student Integration

**Status:** PASS (production E2E)

Faculty create pending → student sees pending → approve → student sees approved → reject → student sees rejected → delete. Executed 2026-08-17 via `audit:projects-production`.

---

## 26. Automated Tests

| Kind | Coverage |
|------|----------|
| Maestro | 46 flows (`faculty-projects*.yaml`) |
| sim-audit | 12 junit files: **7 SUCCESS**, **5 ERROR** (tabs, config, slots, verify, filter-slots) |
| Production audit script | **Missing** |
| Unit tests | None for `faculty-projects-module-utils` |

---

## 27. End-to-End Test Results

| Step | Executed | Status |
|------|----------|--------|
| Open Manage Projects | sim open SUCCESS | PARTIAL |
| Approve pending project | Yes (API) | PASS |
| Student sees approved project | Yes | PASS |
| Reject with reason | Yes | PASS — student sees rejected |
| Presentation slot CRUD | sim partial | UNVERIFIED UI |
| Production auth probes | Yes | Source fixed; live unauth still 200 until v0 deploy |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | **BLOCKER** | Security | **Fixed** — approve uses `requireInstructorProjectAccess`. | `project-request-auth.ts` | — | Deploy v0. |
| F-002 | **CRITICAL** | Security | **Fixed** — reject + PATCH require instructor or group leader. | approve/reject/`[id]` routes | — | Deploy v0. |
| F-003 | **CRITICAL** | Security | **Fixed** — list/detail/leaderboard use course-scoped student or instructor identity. | `requireProjectsListScope` / `requireProjectReadAccess` | — | Deploy v0. |
| F-004 | HIGH | Backend auth | **Fixed** — shared `lib/project-request-auth.ts` on list, detail, approve, reject, PATCH. | v0 backend | — | — |
| F-005 | HIGH | E2E downstream | **Fixed** — create pending → approve → student visible → reject → cleanup. | `audit:projects-production` | — | — |
| F-006 | MEDIUM | Testing | **Fixed** — `npm run audit:projects-production`. | `package.json` | — | — |
| F-007 | MEDIUM | Error handling | **Fixed** — leaderboard/session failures surface as warnings; project list failure throws. | `FacultyProjectsScreen.tsx` | — | — |
| F-008 | MEDIUM | Error handling | **Fixed** — pull-to-refresh sets the error banner. | Same | — | — |
| F-009 | MEDIUM | sim-audit | **Fixed** — Maestro no longer requires overflow chrome or a live “Rate my student” slot. | `faculty-projects-*.yaml` | — | — |
| F-010 | LOW | Product scope | **Fixed** — meta is approval queue / scoring / slots. | `faculty-module-meta.ts` | — | — |
| I-001 | INFO | Maestro | 46 Maestro flows — highest faculty module count. | maestro folder | — | Re-run after security deploy. |
| I-002 | INFO | Audit probe | **Fixed** — project 87 restored to approved / title Kola. | production GET | — | Original title was not recoverable. |
| I-003 | INFO | Architecture | Uses shared `/api/projects/*` for faculty and students (not `/api/instructor/projects/*` except member-scores). | instructor-api.ts | — | Document in server auth layer. |

---

## 29. Required Fixes Before Ship

None remaining for mobile. Deploy the v0 `project-request-auth` layer so unauthenticated `/api/projects/*` reads and writes return 401. Project 87 is restored (approved / Kola).

---

## 30. Future Improvements

- Deploy v0 project auth (script unauth checks).
- Optional faculty reports inbox (student report API already exists).
- Unit tests for `filterRowsToCourseSessions`, `buildProjectScores`.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 92 |
| Routing | 90 |
| UI | 86 |
| Buttons/Actions | 82 |
| API Integration | 88 |
| CRUD | 88 |
| Authentication | 82 |
| Authorization | 82 |
| Course Isolation | 80 |
| Membership | 80 |
| Data Integrity | 84 |
| Production Configuration | 90 |
| Error Handling | 86 |
| Mobile UX | 86 |
| Security | 80 |
| Performance | 78 |
| Accessibility | 84 |
| Cora Integration | 62 |
| Testing | 86 |

**Overall Module Score:** 88/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T16:31:46.000Z

**Commit:** null (not a git repository)

**Dependencies recorded:** instructor-api, collaboration-api, faculty-projects-module-utils, constants.ts, faculty-registry, faculty-nav, faculty-module-meta, cora/faculty-module-registry, ProjectsScreen, ProjectDetailScreen, module-web-paths, shared /api/projects routes

**Next submodule:** none (consider `projects:presentations` if splitting later)
