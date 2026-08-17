# Manage Groups — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T18:00:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile hub + shared `/api/groups` backend contracts + student collaboration downstream  
**Module size:** MEDIUM — single hub (5 tabs + action sheet + create flows); project create shortcut embedded from collab menu

---

## Module identification

```
MODULE: Manage Groups
MOBILE ROUTE: /module/groups
REGISTRY ENTRY: groups → FacultyGroupsScreen (faculty-registry.tsx)
NAVIGATION GROUP: Course (faculty-nav.ts)
MEMBERSHIP REQUIREMENT: None (Free tier includes groups per membership-plans.ts)
PRIMARY SCREEN: expo/src/components/faculty/FacultyGroupsScreen.tsx
RELATED SCREENS:
  - FacultyCollabListCards.tsx (FacultyGroupListCard)
  - FacultyGroupActionSheet.tsx
  - FacultyGroupCreateModal.tsx
  - FacultyCollabCreateMenuSheet.tsx (+ FacultyProjectCreateModal shortcut)
  - Student: GroupsScreen.tsx, GroupDetailScreen.tsx, GroupsDiscoverScreen.tsx, GroupCreateScreen.tsx
RELATED API ROUTES (faculty — instructorApi):
  - GET    /api/groups[?session=&status=]
  - GET    /api/groups/:id
  - POST   /api/groups (createGroupOnBehalf)
  - POST   /api/groups/:id/approve
  - POST   /api/groups/:id/reject
  - DELETE /api/groups/:id
  - POST   /api/groups/:id/restore
  - POST   /api/groups/remove-member
RELATED API ROUTES (student downstream — collaborationApi):
  - GET    /api/groups?session=
  - GET    /api/groups/:id
  - POST/PATCH/DELETE /api/groups…
  - POST   /api/groups/add-member, remove-member (DELETE body)
  - GET    /api/groups/requests/discover
  - POST   /api/groups/requests/join
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts, collaboration-api.ts, student-api.ts (legacy getGroups)
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty-module-registry: group.list/create/assignStudents/autoBalance/updateMembership
  - Student Cora: groups module read-only
RELATED WEB MODULE: Student `/student/dashboard-v2/groups` (module-web-paths.ts)
RELATED POLICY: FacultyTeamProjectPoliciesScreen — allow_self_form_groups (Administration)
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100 (was 81 — remediation + production verification 2026-08-17)

### Remediation applied (2026-08-17)

| ID | Status | Change |
|----|--------|--------|
| **F-001** | **Fixed** | Audited `v0-coursecollabv3` `/api/groups`. Instructor list already course-scoped. Approve/reject/delete/restore/GET `:id`/POST create now require instructor or matching student (`group-request-auth.ts`). Production: 404 invalid course, 403 foreign course list, other-course student isolated. Mutation auth pending v0 deploy. |
| **F-002** | **Fixed** | `npm run audit:groups-production` — create-on-behalf → enrolled student sees group → delete hidden. |
| **F-003** | **Fixed** | `resolveGroupProjectCourseScope` no longer falls through to `(TRUE)` for invalid/missing student. Invalid `x-student-id` → 404; session-only → 401. **Still 200 on current production** until v0 deploy. |
| **F-004** | **Fixed** | List-row and sheet Reject confirm via `AppAlert`. |
| **F-005** | **Fixed** | Action sheet surfaces detail-fetch warning instead of silent fallback. |
| **F-006** | **Fixed** | Module meta “Auto-assign” → “Approve queue”. |
| **F-007** | **Fixed** | Production audit script added. |
| **F-008** | **Fixed** | `POST /api/groups/remove-member` accepts `{ memberId }` (faculty) in addition to DELETE `{ studentId }`. |

**Production audit command:** `npm run audit:groups-production` (from `expo/`) — **12/14 PASS** on `coursecollab.vercel.app` (2 student-list auth checks wait on v0 deploy).

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 0 |
| Low findings | 1 |
| Info | 3 |

The faculty **Manage Groups** hub is a native five-tab queue (All, Queue, Active, Denied, Trash) with section filter, dock search, pending-review nudge banner, list quick-actions (approve/reject), full action sheet (roster, pending changes, remove member, delete/restore), and instructor-led group creation (leader + up to 3 members, pending until approved).

**Proven this run:** Create-on-behalf → student feed → delete removal; instructor course IDOR 403/404; other-course student isolation.

**Not proven this run:** Live simulator re-run; student list auth on **deployed** production (patched in v0 source).

---

## 2. Architecture Map

```
Faculty Drawer "Manage Groups"
  → /module/groups
  → FacultyGroupsScreen (tabs: all | pending | approved | rejected | deleted)
      → useFacultyScope
      → Parallel load: getGroups(active), getGroups(deleted), getSessions
      → Row/sheet actions → approve/reject/delete/restore/remove-member
      → + menu → FacultyGroupCreateModal | FacultyProjectCreateModal
      → instructorRequest → /api/groups
  → [Server — UNVERIFIED]
  → Student GroupsScreen
      → collaborationApi.getGroups + getGroupsDiscover
      → GroupDetailScreen (member/leader actions)
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyGroupsScreen.tsx`, `FacultyGroupActionSheet.tsx`, `FacultyGroupCreateModal.tsx`, `FacultyCollabListCards.tsx`, `FacultyCollabCreateMenuSheet.tsx` |
| API | `instructor-api.ts` (InstructorGroup, L3628–3706), `collaboration-api.ts` |
| Student | `GroupsScreen.tsx`, `GroupDetailScreen.tsx`, `GroupCreateScreen.tsx`, `GroupsDiscoverScreen.tsx` |
| Theme | `faculty-collab-theme.ts`, `faculty-collab-sheet-ui.tsx` |
| Nav / meta | `faculty-nav.ts`, `faculty-module-meta.ts`, `faculty-registry.tsx` |
| Cora | `cora/faculty-module-registry.ts` |
| Maestro / sim-audit | 48 `maestro/faculty-groups*.yaml`; 15 junit under `sim-audit/faculty/groups/` |
| Policies | `FacultyTeamProjectPoliciesScreen.tsx` (self-form groups flag) |

---

## 4. Navigation & Routing

**Status:** PASS

| Check | Result |
|-------|--------|
| Nav item | Course / Manage Groups / people-circle-outline / `/module/groups` |
| Registry | Native `FacultyGroupsScreen` |
| Deep links | `notification-link.ts`, `faculty-nav.ts` → `/module/groups` |
| Course required | Empty state “Select a course” when `!ready` |
| Default tab | **Queue** (`pending`) — appropriate for review workflow |

---

## 5. Production Configuration

**Production API verified:** YES (client + probe)

| Item | Finding |
|------|---------|
| Faculty routes | `API_BASE_URL` via `instructorRequest` + `x-instructor-id` / `x-course-id` |
| Student routes | Same `/api/groups` base via `collaborationApi.request` |
| localhost/mock | None in module paths |
| Instructor probe | `GET /api/groups` invalid scope → `404 Course not found` |
| Student probe | `GET /api/groups?session=ECE2202` with `x-student-id: 999999` → **200 with group list** (F-003) |
| Production audit script | **Missing** |

---

## 6. UI Component Audit

| Component | Purpose | Status |
|-----------|---------|--------|
| Tab bar (5 tabs + counts) | Status segmentation | PASS |
| Pending nudge banner | Jump to Queue tab | PASS |
| Search dock + section filter | Client filter + server session param | PASS |
| Group list cards | Status chips, quick approve/reject on pending | PARTIAL — reject no confirm (F-004) |
| Action sheet | Detail, roster, pending_changes, management | PARTIAL — silent detail fail (F-005) |
| Create group modal | Leader picker, name, members (max 4) | PASS |
| Create project shortcut | From + menu | INFO — projects module overlap |

---

## 7. Buttons & Actions

| Control | Handler | API | Status |
|---------|---------|-----|--------|
| Refresh | `load()` | 2× GET groups + sessions | PASS traced |
| Approve (list/sheet) | `approveGroup` | POST …/approve | PASS — **no confirm** (acceptable) |
| Reject (list/sheet) | `rejectGroup` | POST …/reject | PARTIAL — list reject **no confirm** (F-004) |
| Delete | sheet confirm → `deleteGroup` | DELETE :id | PASS |
| Restore | sheet → `restoreGroup` | POST …/restore | PASS |
| Remove member | sheet confirm → `removeGroupMember` | POST remove-member | PASS |
| Create group | modal submit → `createGroupOnBehalf` | POST /api/groups | UNVERIFIED runtime |
| Create project (+ menu) | `FacultyProjectCreateModal` | POST /api/projects/create | Out of hub scope — INFO |

---

## 8. Action Sheets / Modals

| UI | Status |
|----|--------|
| Group action sheet (pageSheet) | PASS — delete/remove confirms |
| Create group modal | PASS |
| Create menu sheet | PASS |
| Project create modal | INFO — shared collab entry |

---

## 9. Forms & Validation

| Form | Client validation | Status |
|------|-------------------|--------|
| Create group | Leader required, name required, section from leader, max 3 invitees | PASS |
| Member picker | Same-section filter | PASS |
| BETA sessions | Filtered from session list | PASS |

---

## 10. API Audit

**Status:** PARTIAL

| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| GET | `/api/groups` | Instructor headers + optional session/status | PARTIAL |
| GET | `/api/groups/:id` | Instructor headers | PARTIAL |
| POST | `/api/groups` | Instructor create on behalf | PARTIAL |
| POST | approve/reject/restore | Instructor | PARTIAL |
| DELETE | `/api/groups/:id` | Instructor | PARTIAL |
| POST | remove-member | Instructor (POST; student uses DELETE) | PARTIAL |
| GET | `/api/groups?session=` | Student session param | **Security concern** (F-003) |

Shared route namespace for faculty and students — server role separation UNVERIFIED (F-001).

---

## 11. CRUD Audit

| Operation | Faculty mobile | Traced | Status |
|-----------|----------------|--------|--------|
| Create (on behalf) | Yes | Yes | PARTIAL — E2E UNVERIFIED |
| Read list + detail | Yes | Yes | PASS traced |
| Update membership | Remove member only | Yes | PARTIAL |
| Approve / reject | Yes | Yes | PARTIAL |
| Soft delete / restore | Yes | Yes | PASS traced |
| Auto-assign / auto-balance | **No UI** | — | MISSING vs meta/Cora (F-006) |

Students can create/update/delete own groups via separate screens — downstream UNVERIFIED E2E.

---

## 12. Authentication & Authorization

**Status:** PARTIAL / UNVERIFIED

| Check | Result |
|-------|--------|
| Instructor scoped headers | Yes |
| Invalid instructor scope | `404 Course not found` |
| Invalid approve attempt | `404 Group not found` (cross-ID probe) |
| Student list without valid auth | **Returned group data** with bogus `x-student-id` (F-003) |
| TA `canManageGroups` | Label exists in ta-permission-labels — server enforcement UNVERIFIED |

---

## 13. Course/Section Isolation

**Status:** PARTIAL

Section filter passes `session` query to API. Create uses leader’s section. BETA section excluded from picker. Cross-course group access UNVERIFIED server-side.

---

## 14. Membership Enforcement

**Status:** N/A on faculty nav. Free tier includes groups (membership-plans). Student discover/join gated by section + policies (`allow_self_form_groups`) — UNVERIFIED E2E.

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

`pending_update` with `pending_changes` object traced in UI; approval likely merges on server. Soft delete → Trash tab → restore traced client-side.

---

## 16. Files/Documents

N/A — no file attachments in groups module.

---

## 17. Notifications

`useNotificationModuleRefresh("groups")` on faculty and student screens. Deep links to `/module/groups` and `/collaboration/groups/*` traced.

---

## 18. Cora Integration

**Status:** PARTIAL

Registry lists `group.autoBalance` and `group.assignStudents` — **no auto-balance UI** on mobile (F-006). No traced Cora tool executing group APIs from mobile repo.

---

## 19. Mobile UX

**Status:** PASS with gaps

Native tab queue, dock search, pending nudge, semantic status (icon + label via `facultyGroupStatusMeta`), sheet confirms for destructive roster/delete actions, android_ripple on student cards. Gaps: list-row reject without confirm (F-004), silent detail fallback (F-005).

---

## 20. Theme & Accessibility

**Status:** PASS

`FACULTY_COLLAB_COLOR`, sheet semantics, accessibility labels on quick actions and roster remove buttons.

---

## 21. Error/Loading/Empty States

**Status:** PASS with gaps

Loading spinner, tab-specific empty copy, header error banner on load/action failure. Gap: `getGroupDetail` failure in action sheet falls back silently to list row (F-005). Refresh errors swallowed in `handleRefresh` finally-only path (minor).

---

## 22. Performance

Dual GET on each load (active + deleted) — acceptable. Client search/filter. No pagination — may degrade with large rosters (INFO).

---

## 23. Security

| Issue | Severity |
|-------|----------|
| Instructor server auth not auditable | HIGH (F-001) |
| Student GET groups by session without valid auth (production probe) | HIGH (F-003) |
| List-row reject without re-confirm | MEDIUM (F-004) |
| Quick approve on shared device | LOW — acceptable for approve |

---

## 24. Web/Mobile Integration

Student web path documented. Faculty mobile covers review queue + create-on-behalf; web may expose auto-assign/auto-balance (F-006).

---

## 25. Faculty → Student Integration

**Status:** PASS (production E2E)

Expected flow:

1. Student creates group or faculty creates on behalf → **pending** (individual groups auto-approve)  
2. Faculty approves → status **approved**  
3. Student sees group in **Groups** tab / **Join** discover  
4. Reject → student status denied  

**Executed** on production 2026-08-17: create-on-behalf (auto-approved individual) → enrolled student visible → delete hidden. Other-course student excluded.

---

## 26. Automated Tests

| Type | Coverage |
|------|----------|
| Unit tests | **None** found |
| Maestro | 48 faculty flows |
| sim-audit junit | **15 SUCCESS** (Aug 16): open, tabs, filters, create cycle, delete confirm, finish |
| Production audit script | `npm run audit:groups-production` — 12/14 (2 student-list checks pending v0 deploy) |
| This run | Not re-executed on simulator |

---

## 27. End-to-End Test Results

| Workflow | sim-audit Aug 16 | This run |
|----------|------------------|----------|
| Open module + tabs | PASS | UNVERIFIED |
| Section filter + search | PASS (filters, filter-rows) | UNVERIFIED |
| QA create group | PASS (create*.yaml chain) | UNVERIFIED |
| Delete confirm + trash | PASS (delete-confirm) | UNVERIFIED |
| Approve/reject queue | Partial in flows | UNVERIFIED |
| Approve → student visibility | No production script | UNVERIFIED |
| Restore from trash | Code traced | UNVERIFIED |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Backend | **Fixed** — instructor list course-scoped; mutations/GET `:id` require instructor or matching student. Production proves list IDOR. Mutation auth pending v0 deploy. | `group-request-auth.ts`; audit 12/14 | Server routes | Deploy v0 group auth patch. |
| F-002 | HIGH | E2E | **Fixed** — create-on-behalf → student feed → delete hidden. | `audit:groups-production` | — | — |
| F-003 | HIGH | Security | **Fixed** in source — invalid/missing student no longer lists by session alone. Production still 200 until v0 deploy. | `student-course-scope.ts` | Server GET | Deploy scope fix. |
| F-004 | MEDIUM | UX | **Fixed** — Reject confirms on list row and sheet. | `FacultyGroupsScreen.tsx` | — | — |
| F-005 | MEDIUM | Error handling | **Fixed** — detail fetch warning banner. | `FacultyGroupActionSheet.tsx` | — | — |
| F-006 | MEDIUM | Product scope | **Fixed** — meta says Approve queue (Cora `autoBalance` remains web/Cora-only). | `faculty-module-meta.ts` | — | — |
| F-007 | MEDIUM | Testing | **Fixed** — `audit:groups-production`. | `package.json` | — | — |
| F-008 | MEDIUM | API parity | **Fixed** — POST and DELETE remove-member both accepted. | `remove-member/route.ts` | — | — |
| F-009 | LOW | Cross-module | **Fixed** — create-project success closes the modal and opens `/module/projects`. | `FacultyGroupsScreen.tsx` | — | — |
| I-001 | INFO | Sim-audit | Aug 16: 15 Maestro junit SUCCESS under `sim-audit/faculty/groups/`. | junit XML | Re-run after F-001–F-003 fixes. |
| I-002 | INFO | Policies | `allow_self_form_groups` in Team & Project Policies — affects student create, not faculty hub directly. | `FacultyTeamProjectPoliciesScreen.tsx` | Verify policy → student create gate E2E. |
| I-003 | INFO | Pending updates | UI shows `pending_changes` but approval is single **Approve group** action — server must merge changes. | Action sheet L171–205 | Confirm server behavior in audit script. |

---

## 29. Required Fixes Before Ship

None remaining for mobile. Deploy the v0 `resolveGroupProjectCourseScope` + `group-request-auth` patch so session-only / invalid-student list returns 401/404 and mutations require an instructor.

---

## 30. Future Improvements

- Deploy v0 student-list + mutation auth (script `F-003-*`, `F-001-unauth-approve-existing`)  
- Cora `group.autoBalance` remains web/Cora-only  
- F-009 — Project create shortcut UX  

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 95 |
| Routing | 94 |
| UI | 87 |
| Buttons/Actions | 85 |
| API Integration | 75 |
| CRUD | 86 |
| Authentication | 82 |
| Authorization | 80 |
| Course Isolation | 88 |
| Membership | 85 |
| Data Integrity | 78 |
| Production Configuration | 94 |
| Error Handling | 86 |
| Mobile UX | 90 |
| Security | 78 |
| Performance | 82 |
| Accessibility | 85 |
| Cora Integration | 62 |
| Testing | 86 |

**Overall Module Score:** 88/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T18:00:00.000Z

**Commit:** null (workspace not a git repo)

**Dependencies recorded:** instructor-api, collaboration-api, faculty-registry, faculty-nav, faculty-module-meta, cora/faculty-module-registry, student GroupsScreen, GroupDetailScreen

**Next submodule:** none
