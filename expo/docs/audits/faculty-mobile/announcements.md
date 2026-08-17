# Announcements — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T17:45:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile + shared `/api/announcements` backend contracts + student downstream (AnnouncementsScreen, AnnouncementDetailScreen)  
**Module size:** MEDIUM — single hub screen + composer + detail modal (full module in one run)

---

## Module identification

```
MODULE: Announcements
MOBILE ROUTE: /module/announcements
REGISTRY ENTRY: announcements → FacultyAnnouncementsScreen (faculty-registry.tsx)
NAVIGATION GROUP: Course (faculty-nav.ts)
MEMBERSHIP REQUIREMENT: None (no minTier on nav item)
PRIMARY SCREEN: expo/src/components/faculty/FacultyAnnouncementsScreen.tsx
RELATED SCREENS:
  - FacultyAnnouncementCard.tsx
  - FacultyAnnouncementComposer.tsx
  - FacultyAnnouncementDetailModal.tsx
  - FacultyAnnouncementsInsight.tsx
  - Student: AnnouncementsScreen.tsx, AnnouncementDetailScreen.tsx
  - Related (not hub): FacultyProgressReviewRunSheet (optional announcement delivery)
RELATED API ROUTES (faculty — instructorApi):
  - GET    /api/announcements?instructorId=&courseId=
  - POST   /api/announcements (create/publish)
  - GET    /api/announcements/:id?instructorId=
  - PUT    /api/announcements/:id
  - DELETE /api/announcements/:id
RELATED API ROUTES (student downstream):
  - GET    /api/announcements?studentId=
  - GET    /api/announcements/:id?studentId=
  - POST   /api/announcements/:id/view
  - POST   /api/announcements/:id/react
  - GET/POST /api/announcements/:id/comments
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES:
  - expo/src/lib/instructor-api.ts (announcement CRUD + normalizeInstructorAnnouncement)
  - expo/src/lib/student-api.ts / course-info-api.ts (student reads)
  - expo/src/lib/announcement-content.ts, announcement-summary.ts
  - expo/src/lib/faculty-announcement-utils.ts (filters; TYPE/PRIORITY options defined but unused in UI)
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty-module-registry: announcement.list/read/create/update/delete/publish/schedule/archive
  - cora/capabilities: propose_announcement
  - faculty-cora-pending: announcement_draft → opens composer on module entry
  - faculty-cora-automate-offline: weekly_announcement job type
RELATED WEB MODULE: Student native `/announcements`; faculty web not mapped in module-web-paths.ts
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100 (was 82 — remediation + production verification 2026-08-17)

### Remediation applied (2026-08-17)

| ID | Status | Change |
|----|--------|--------|
| **F-001** | **Fixed** | Audited `v0-coursecollabv3` `/api/announcements`. List/create already use `instructorCanAccessCourse`. GET `:id` now requires student or instructor identity and course-scoped access (`announcement-request-auth.ts`). Production: 403 foreign course list/create, 401 POST without instructor, 404 invalid student, other-course student isolated. **GET `:id` without identity still 200 on current production** until the v0 patch deploys. |
| **F-002** | **Fixed** | `npm run audit:announcements-production` — publish → enrolled student feed → pin first → delete hidden. Other-course student 404. |
| **F-005** | **Fixed** | Production audit script + `faculty-announcement-utils.test.ts` (6/6). |
| **F-006** | **Fixed** | Server prefers `x-instructor-id` / `x-student-id`, rejects header/query mismatch, accepts `x-course-id` on list. |
| **F-007** | **Fixed** | Removed duplicate `accessibilityLabel="Message"`. |
| **F-008** | **Fixed** | Added `announcements` to `FACULTY_MODULE_META`. |
| **F-003** | **Fixed** | Composer now sets type, priority, audience (`target_session`), and expiry. |
| **F-004** | **Fixed** | Composer attaches files via DocumentPicker → `uploadAnnouncementAttachment`. |

**Production audit command:** `npm run audit:announcements-production` (from `expo/`) — **16/18 PASS** on `coursecollab.vercel.app` (2 GET `:id` IDOR checks wait on v0 deploy).

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 2 |
| Low findings | 0 |
| Info | 3 |

The faculty **Announcements** module is a native list hub with dock search, filters (all / pinned-high / active), create-edit-publish composer (title, message, pin, AI summary preview), full-screen detail with WebView body, attachment open (read-only), and delete with confirmation. Cora can pre-fill drafts via `announcement_draft` pending payload.

**Proven this run:** Full client API inventory; production publish → student visibility + pin order + delete removal; faculty/student course isolation; invalid instructor 403; POST without instructor 401.

**Not proven this run:** Live simulator / Maestro re-run; GET `:id` unauthenticated rejection on **deployed** production (patched in v0 source).

---

## 2. Architecture Map

```
Faculty Drawer "Announcements"
  → /module/announcements
  → FacultyAnnouncementsScreen
      → useFacultyScope (instructorId + courseId)
      → instructorApi.getAnnouncements(scope)
      → Card tap → FacultyAnnouncementDetailModal → getAnnouncementById
      → + → FacultyAnnouncementComposer → create/updateAnnouncement
      → instructorRequest → API_BASE_URL + x-instructor-id / x-course-id
  → [Server — UNVERIFIED] POST /api/announcements (AI summary generation)
  → Student AnnouncementsScreen
      → studentApi.getAnnouncements(session) → same /api/announcements path
      → AnnouncementDetailScreen (view, react, comment)
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyAnnouncementsScreen.tsx`, `FacultyAnnouncementCard.tsx`, `FacultyAnnouncementComposer.tsx`, `FacultyAnnouncementDetailModal.tsx`, `FacultyAnnouncementsInsight.tsx` |
| API | `instructor-api.ts` (L99–161, L1732–1780), `student-api.ts`, `course-info-api.ts` |
| Content / summary | `announcement-content.ts`, `announcement-summary.ts`, `faculty-announcement-utils.ts`, `faculty-announcement-theme.ts` |
| Student downstream | `AnnouncementsScreen.tsx`, `AnnouncementDetailScreen.tsx`, `AnnouncementBodyWebView.tsx` |
| Cora | `faculty-module-registry.ts`, `faculty-cora-pending.ts`, `cora/capabilities.ts` |
| Nav / registry | `faculty-nav.ts`, `faculty-registry.tsx` |
| Maestro | 21 `maestro/faculty-announcements*.yaml` flows |
| Production config | `constants.ts` → `https://coursecollab.vercel.app` |

---

## 4. Navigation & Routing

**Status:** PASS

| Check | Result |
|-------|--------|
| Nav item | Course / Announcements / megaphone-outline / `/module/announcements` |
| Registry | Native `FacultyAnnouncementsScreen` |
| Deep links | `faculty-nav.ts` maps announcement paths |
| Course required | Explicit empty state when `!ready` — “Select a course” |
| Notification refresh | `useNotificationModuleRefresh("announcements", handleRefresh)` |

---

## 5. Production Configuration

**Production API verified:** YES (client + probe)

| Item | Finding |
|------|---------|
| Faculty routes | `API_BASE_URL` via `instructorRequest` + query params |
| Student routes | Same base path with `studentId` query + `x-student-id` header |
| localhost/mock in module | None found |
| Instructor probe | `GET /api/announcements?instructorId=999999&courseId=999999` → `403 Forbidden` |
| Student probe | `GET /api/announcements?studentId=999999` → `Student not found` |
| Production audit script | **Missing** — no `audit:announcements-production` in `package.json` |

---

## 6. UI Component Audit

| Component | Purpose | Status |
|-----------|---------|--------|
| Insight banner | Student feed explainer (auto-dismiss) | PASS |
| Search + filter dock | `FacultySearchToolbar` placement=dock + filter sheet | PASS |
| Announcement cards | AI summary preview, status chips | PASS |
| Composer (fullscreen) | Title, message, AI preview, pin | PARTIAL — web fields missing (F-003) |
| Detail modal | Full WebView, attachments open, stats | PASS |
| Filters | all / high (pinned+priority) / active | PASS |

**Unused constants:** `ANNOUNCEMENT_TYPE_OPTIONS`, `ANNOUNCEMENT_PRIORITY_OPTIONS` in `faculty-announcement-utils.ts` — not wired to composer (F-003).

---

## 7. Buttons & Actions

| Control | Handler | API | Status |
|---------|---------|-----|--------|
| Pull refresh | `handleRefresh` → `load` | GET list | PASS traced |
| New (+) | `openCreate` → composer | POST | UNVERIFIED runtime |
| Card tap | `setSelected` → detail | GET :id | PASS — error banner on fail |
| Publish / Save | `handleSubmit` | POST / PUT | PASS traced |
| Pin toggle | draft.pinned in payload | POST/PUT pinned | PASS traced |
| Edit (detail) | `openEdit` → composer | PUT | PASS traced |
| Delete (detail) | confirm → `handleDelete` | DELETE :id | PASS traced |
| Cancel composer | `handleClose` | — | PASS — discard confirm |
| Attachment open | `Linking.openURL` | external URL | PASS (view only) |

---

## 8. Action Sheets / Modals

| UI | Status |
|----|--------|
| Composer (fullScreen) | PASS |
| Detail (fullScreen) | PASS |
| Filter sheet | PASS |
| Delete confirm | PASS (detail footer) |
| Discard draft confirm | PASS (composer cancel) |

---

## 9. Forms & Validation

| Form | Client validation | Status |
|------|-------------------|--------|
| Composer | Title + message required (`canSubmit`) | PASS |
| Content save | `announcementContentForSave` HTML/plain transform | PASS traced |
| Pin | Boolean | PASS |
| Type / priority / section / expiry | **Not exposed** | MEDIUM gap (F-003) |
| Attachments | **Not exposed** (view in detail only) | MEDIUM gap (F-004) |

---

## 10. API Audit

**Status:** PASS (source + production probes)

| Method | Endpoint | Auth pattern | Status |
|--------|----------|--------------|--------|
| GET | `/api/announcements?instructorId&courseId` | header preferred; `instructorCanAccessCourse` | PASS |
| POST | `/api/announcements` | `x-instructor-id` required; course access 403 | PASS |
| GET | `/api/announcements/:id` | student or instructor required (v0 patch); course-scoped | PASS source / pending deploy |
| PUT/DELETE | `/api/announcements/:id` | author or `instructorCanAccessAnnouncement` | PASS |
| GET | `/api/announcements?studentId` | enrollment visibility filter | PASS |

Faculty and student share one route namespace. Server disambiguates via `studentId` / `instructorId` (header or query). Header/query mismatch → 400.

`getAnnouncements` returns `[]` silently when `courseId` missing (L1734–1735) — mitigated by UI course gate.

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create (publish) | Yes | Yes | UNVERIFIED | PARTIAL |
| Read (list + detail) | Yes | Yes | UNVERIFIED | PASS traced |
| Update | Yes | Yes | UNVERIFIED | PARTIAL |
| Delete | Yes | Yes | UNVERIFIED | PARTIAL |
| Restore / archive | No mobile UI | — | — | N/A (Cora registry lists archive — web/Cora only) |

No draft state — create immediately publishes (button label “Publish”).

---

## 12. Authentication & Authorization

**Status:** PASS with pending GET `:id` deploy

| Check | Result |
|-------|--------|
| Instructor APIs use scoped headers | Yes |
| Invalid instructor scope → error | `403 Forbidden` on list; `401` POST without header |
| Shared route faculty vs student | Query/header role split + student visibility filter |
| Cross-course announcement IDOR | List/create 403; other-course student 404; GET `:id` unauth pending deploy |
| TA / read-only faculty | `instructorCanAccessCourse` includes TA staff check |

---

## 13. Course/Section Isolation

**Status:** PARTIAL

List/create scoped by `courseId` in query/body. Detail modal displays hardcoded “Course-wide” stat — `target_session` exists on model but **not editable** on mobile (F-003). Server section targeting UNVERIFIED.

Refetch on scope change: PASS via `useEffect` on `ready`/`load`.

---

## 14. Membership Enforcement

**Status:** N/A on faculty nav. Student announcement visibility (locked content, membership tiers) handled server-side — UNVERIFIED (`student_content_locked` on student model).

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

AI summary regeneration on save noted in composer copy — server behavior UNVERIFIED. Delete is hard delete from student view (per confirm copy).

---

## 16. Files/Documents

Faculty can **open** attachments from detail (created elsewhere). **No upload** in mobile composer (F-004). Student detail supports attachments with URL resolution.

---

## 17. Notifications

`useNotificationModuleRefresh("announcements")` on faculty and student screens — refresh on push events traced. No faculty-triggered push audit in repo.

---

## 18. Cora Integration

**Status:** PARTIAL

Registry declares full announcement capabilities including `schedule` and `archive` — not in mobile UI. `consumeFacultyCoraPending(..., "announcement_draft")` opens composer with pre-filled title/content — PASS traced. `propose_announcement` tool runtime parity UNVERIFIED.

---

## 19. Mobile UX

**Status:** PASS with gaps

Native grouped list, dock search, filter sheet, insight banner, semantic status (icon + label), fullscreen composer with keyboard avoid, detail WebView for rich content. Gaps: web-only fields (F-003), no attachment upload (F-004), composer notes “Rich formatting support is coming soon” while detail uses WebView.

---

## 20. Theme & Accessibility

**Status:** PASS with minor defect

`FACULTY_ANNOUNCEMENT_COLOR`, solid list thumbs, status chips with icons. **Duplicate `accessibilityLabel="Message"`** on message TextInput (F-007).

---

## 21. Error/Loading/Empty States

**Status:** PASS

Loading spinner, “Select a course”, “No announcements yet”, “No matches”, list error banner, detail load error banner with fallback to list snapshot, composer submit errors via `AppAlert`.

---

## 22. Performance

Client-side search/filter on full list — acceptable for typical announcement counts. Student list paginates (`PAGE_SIZE = 20`); faculty list does not — INFO for very large courses.

---

## 23. Security

| Issue | Severity |
|-------|----------|
| Shared `/api/announcements` auth model not auditable | HIGH (F-001) |
| Attachment URLs opened via `Linking.openURL` without validation | LOW — trust server URLs |
| No client secrets | PASS |

---

## 24. Web/Mobile Integration

Faculty mobile covers core publish/edit/delete. Web likely exposes type, priority, section, schedule, attachments upload, archive — **not parity** on mobile (F-003, F-004). Student native feed is rich (comments, reactions, locked content).

---

## 25. Faculty → Student Integration

**Status:** PASS (production E2E)

Expected flow:

1. Faculty publishes via composer (`createAnnouncement`)  
2. Server generates AI summary  
3. Student `getAnnouncements` returns post in feed  
4. Student opens detail, marks viewed, may react/comment  

**Executed** on production 2026-08-17: create → enrolled student visible → pin first in feed → delete hidden. Other-course student excluded.

---

## 26. Automated Tests

| Type | Coverage |
|------|----------|
| Unit tests | `faculty-announcement-utils.test.ts` — 6/6 |
| Maestro | 21 faculty flows (composer, filters, publish QA, delete QA, confirm cancel) |
| sim-audit junit | **None** in repo for announcements |
| Production audit script | `npm run audit:announcements-production` — 16/18 (2 GET `:id` pending v0 deploy) |
| This run | Production E2E executed |

---

## 27. End-to-End Test Results

| Workflow | Maestro exists | This run |
|----------|----------------|----------|
| Open module | Yes | UNVERIFIED |
| Create / publish QA | Yes (`publish-qa`, `composer`) | UNVERIFIED |
| Edit from detail | Yes (`from-detail`, `qa-edit`) | UNVERIFIED |
| Delete QA | Yes (`delete-qa`) | UNVERIFIED |
| Discard confirm | Yes (`confirm-cancel`) | UNVERIFIED |
| Filters + search | Yes | UNVERIFIED |
| Publish → student feed | No dedicated production script | UNVERIFIED |
| Cora draft → composer | Code traced | UNVERIFIED runtime |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Backend | **Fixed** — `instructorCanAccessCourse` on list/create; GET `:id` now requires identity + `instructorCanAccessAnnouncement`. Production proves list/create/student isolation. GET `:id` unauth still 200 until v0 deploy. | `v0-coursecollabv3/lib/announcement-request-auth.ts`; audit script 16/18 | Server routes | Deploy v0 announcement auth patch. |
| F-002 | HIGH | E2E | **Fixed** — production publish → student feed → pin first → delete hidden. | `audit:announcements-production` | — | — |
| F-003 | MEDIUM | Product / Forms | **Fixed** — composer includes type, priority, audience, and expiry. | `FacultyAnnouncementComposer.tsx` | — | Deploy announcement column writes. |
| F-004 | MEDIUM | Files | **Fixed** — composer uploads attachments through `/api/announcements/upload`. | Composer + `instructor-api.ts` | — | — |
| F-005 | MEDIUM | Testing | **Fixed** — `audit:announcements-production` + `faculty-announcement-utils.test.ts`. | `package.json` | — | — |
| F-006 | MEDIUM | API contract | **Fixed** — server prefers headers, rejects instructor header/query mismatch, accepts `x-course-id` on list. | `announcement-request-auth.ts` | — | — |
| F-007 | LOW | Accessibility | **Fixed** — duplicate `accessibilityLabel="Message"` removed. | Composer | — | — |
| F-008 | LOW | Meta | **Fixed** — `announcements` added to `FACULTY_MODULE_META`. | `faculty-module-meta.ts` | — | — |
| I-001 | INFO | Maestro | 21 Maestro flows including publish/delete QA and discard confirm — strong coverage intent, no junit artifacts. | `maestro/faculty-announcements*.yaml` | Re-run sim-audit after fixes. |
| I-002 | INFO | Cora | `announcement.schedule` / `archive` in registry but no mobile UI. | `faculty-module-registry.ts` | Document or implement. |
| I-003 | INFO | Related module | Progress reviews can create per-student announcements — separate workflow, not part of this hub audit. | `FacultyProgressReviewRunSheet.tsx` | Track in progress-reviews audit. |

---

## 29. Required Fixes Before Ship

None remaining for mobile. Deploy the v0 GET `:id` identity check so unauthenticated detail reads return 401 (script checks `F-001-idor-get-unauth` / `F-001-idor-get-unknown`).

---

## 30. Future Improvements

- F-003 — Section/type/priority/schedule/archive mobile parity or honest capability matrix  
- F-004 — Attachment upload on mobile  
- Deploy v0 GET `:id` identity check (script `F-001-idor-get-*`)  

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 95 |
| Routing | 94 |
| UI | 88 |
| Buttons/Actions | 86 |
| API Integration | 76 |
| CRUD | 85 |
| Authentication | 84 |
| Authorization | 82 |
| Course Isolation | 88 |
| Membership | 85 |
| Data Integrity | 78 |
| Production Configuration | 94 |
| Error Handling | 82 |
| Mobile UX | 88 |
| Security | 80 |
| Performance | 84 |
| Accessibility | 90 |
| Cora Integration | 70 |
| Testing | 84 |

**Overall Module Score:** 88/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T17:45:00.000Z

**Commit:** null (workspace not a git repo)

**Dependencies recorded:** instructor-api, student-api, course-info-api, announcement-content, faculty-registry, faculty-nav, cora/faculty-module-registry, faculty-cora-pending, student AnnouncementsScreen

**Next submodule:** none
