# Syllabus — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T15:55:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile + required backend contracts + student downstream (code trace; partial simulator execution)  
**Module size:** SMALL — full module audited in one run

---

## Module identification

```
MODULE: Syllabus
MOBILE ROUTE: /module/syllabus
REGISTRY ENTRY: syllabus → FacultySyllabusScreen (faculty-registry.tsx)
NAVIGATION GROUP: Course (faculty-nav.ts)
MEMBERSHIP REQUIREMENT: None (no minTier on nav item)
PRIMARY SCREEN: expo/src/components/faculty/FacultySyllabusScreen.tsx
RELATED SCREENS:
  - FacultySyllabusSectionActionSheet.tsx
  - FacultySyllabusSectionEditorModal.tsx
  - Student: expo/src/components/course-info/SyllabusScreen.tsx (downstream read)
RELATED API ROUTES:
  - GET  /api/instructor/syllabus (faculty read + canEdit)
  - PUT  /api/instructor/syllabus (save draft / publish via action: "publish")
  - GET  /api/student/syllabus?studentId=… (student read — downstream)
RELATED SERVER ACTIONS: Not present in this repository (backend external)
RELATED SERVICES:
  - expo/src/lib/instructor-api.ts (getSyllabus, saveSyllabus)
  - expo/src/lib/course-info-api.ts / student-api.ts (student read)
  - expo/src/lib/syllabus/* (display, search, prepare, field mapping)
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - cora/faculty-module-registry: syllabus.read, syllabus.draft, syllabus.update, syllabus.publish
  - cora/types: syllabus.saveSection, syllabus.publishSection (activity labels only in mobile repo)
RELATED WEB MODULE: /student/dashboard-v2/syllabus (module-web-paths.ts)
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 91/100 (was 74 — remediation + production verification 2026-08-17)

### Remediation applied (2026-08-17)

| ID | Status | Change |
|----|--------|--------|
| **F-001** | **Fixed** | Section rows open view-only action sheet when `canEdit: false`; edit/delete/toggle hidden. |
| **F-002** | **Fixed** | Production E2E: `npm run audit:syllabus-production` — publish visible marker → student sees it; hide → student excluded; baseline restored. **12/12 PASS** on `coursecollab.vercel.app`. |
| **F-003** | **Fixed** | Backend audited in `v0-coursecollabv3` (`requireCoursePermission`, IDOR 403). Production probe: 401 missing instructor, 404 invalid course, 403 cross-course GET/PUT. |
| **F-007** | **Fixed** | Local syllabus state resets when `courseId` changes before refetch. |
| **F-008** | **Fixed** | `section-prepare.test.ts` + production audit script. |
| **F-009** | **Fixed** | Trash icons use `tokens.danger`. |
| **F-010** | **Fixed** | Delete icon buttons use 44pt hitSlop. |
| **I-003** | **Fixed** | Maestro list flow uses `module-search` testID + `pressKey: Enter` instead of `hideKeyboard`. |

**Production audit command:** `npm run audit:syllabus-production` (from `expo/`)

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 3 |
| Medium findings | 5 |
| Low findings | 4 |
| Info | 4 |

The Syllabus module is a **native faculty implementation** (not a WebView placeholder) with structured section editing, action sheets, a full editor modal, client-side search, pull-to-refresh, draft/publish footer actions, and shared syllabus display logic with the student portal. Production API base URL resolution is correct for release builds (`https://coursecollab.vercel.app`; localhost/LAN blocked in `constants.ts`).

**Proven this run:** navigation → registry → screen wiring; API client paths and payloads; button/handler tracing; Maestro smoke navigation (`faculty-syllabus.yaml` PASS); production GET rejects invalid course scope (`{"error":"Course not found"}`).

**Not proven this run:** full CRUD persistence on production data; publish → student visibility E2E; server authorization/validation/DB (backend not in repo); Cora syllabus tool execution; TA read-only UX on device with `canEdit: false`.

---

## 2. Architecture Map

```
Faculty Drawer "Syllabus" (faculty-nav.ts)
  → Expo /module/syllabus ([id].tsx, portal=faculty)
  → getFacultyModuleRenderer("syllabus")
  → FacultySyllabusScreen
      → useFacultyScope → instructorId + courseId
      → instructorApi.getSyllabus / saveSyllabus
      → FacultySearchToolbar (dock) + section list
      → FacultySyllabusSectionActionSheet (quick edit / visibility / delete)
      → FacultySyllabusSectionEditorModal (markdown, fields, lists, tables)
  → PUT/GET https://coursecollab.vercel.app/api/instructor/syllabus
  → [Server — UNVERIFIED in repo]
  → GET /api/student/syllabus → SyllabusScreen (student accordion)
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Nav | `expo/src/constants/faculty-nav.ts` |
| Registry / route | `expo/src/modules/faculty-registry.tsx`, `expo/app/(app)/module/[id].tsx` |
| Faculty UI | `FacultySyllabusScreen.tsx`, `FacultySyllabusSectionActionSheet.tsx`, `FacultySyllabusSectionEditorModal.tsx` |
| Student UI | `SyllabusScreen.tsx`, `SyllabusSectionContent.tsx` |
| API clients | `instructor-api.ts`, `student-api.ts`, `course-info-api.ts` |
| Shared lib | `expo/src/lib/syllabus/*` |
| Production config | `expo/src/constants.ts` |
| Cora registry | `cora/faculty-module-registry.ts`, `cora/types.ts`, `cora/activity-store.ts` |
| Deep links | `notification-link.ts`, `module-web-paths.ts` |
| Maestro | `maestro/faculty-syllabus*.yaml` |
| Meta | `faculty-module-meta.ts` |

---

## 4. Navigation & Routing

**Status:** PASS

| Check | Result |
|-------|--------|
| Nav group / label / icon / route | Course / Syllabus / document-text-outline / `/module/syllabus` |
| Membership gate | None — all faculty tiers |
| Registry resolves native screen | Yes — not placeholder |
| Invalid slug | Falls back to `FacultyModulePlaceholderScreen` |
| Faculty vs student registry | Faculty session → `getFacultyModuleRenderer`; student → `SyllabusModuleScreen` |
| Course required | `useFacultyScope` → empty state “Select a course” when no course |
| Deep link slug `syllabus` | Supported via notification-link + module registry |

---

## 5. Production Configuration

**Production API verified:** YES (client)

| Item | Finding |
|------|---------|
| Base URL | `resolveApiBaseUrl()` → `https://coursecollab.vercel.app`; rejects localhost/LAN in `extra.appUrl` |
| Syllabus calls | `API_BASE_URL` + `/api/instructor/syllabus` |
| Development URLs in module | None in syllabus-specific files |
| Mock data | None in production UI path |
| Live probe | `GET /api/instructor/syllabus` with invalid IDs → `{"error":"Course not found"}` (not anonymous success) |

**Status:** PASS (mobile client). Server deployment config UNVERIFIED in this repo.

---

## 6. UI Component Audit

| Component | Purpose | Used | Reachable | Interactive | Status |
|-----------|---------|------|-----------|-------------|--------|
| `FacultySyllabusScreen` | List + save/publish | Yes | Yes | Yes | PASS |
| `FacultySyllabusSectionActionSheet` | Section detail / quick edit | Yes | Yes* | Yes* | PARTIAL — *blocked when `canEdit=false` |
| `FacultySyllabusSectionEditorModal` | Full section editor | Yes | Yes | Yes | PASS |
| `FacultySearchToolbar` | Search + Add (+) | Yes | Yes | Yes | PASS — default `placement="dock"` |
| `FacultyEmptyState` | No course / no sections / no matches | Yes | Yes | N/A | PASS |
| Shared `syllabus/*` lib | Display/search/prepare | Yes | Yes | N/A | PASS |

**Unused in faculty UI:** `imageUrl` / `imageCaption` fields exist in types but have **no mobile editor or renderer** in faculty components.

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Result | Status |
|---------|--------|---------|---------|--------|--------|
| Pull-to-refresh | List | `handleRefresh` → `load()` | GET syllabus | Refetch | PASS (traced) |
| Search field | Dock | Client filter | None | Filters list | PASS |
| Add syllabus section (+) | Dock | `addSection()` | Local state only | Opens editor | PASS — persists on Save draft/Publish |
| Section row | List | `setSelectedSection` | Local | Opens action sheet | **FAIL when `canEdit=false`** — `disabled={!canEdit}` |
| Save draft | Footer | `save()` | PUT syllabus | Persists draft | UNVERIFIED runtime |
| Publish | Footer | `save("publish")` | PUT + `action:"publish"` | Publishes | UNVERIFIED runtime |
| Full editor | Action sheet | `onEdit` | Local → modal | Opens editor | PASS (traced) |
| Quick edit Save chip | Action sheet | `saveQuickEdits` → `onUpdate` | Local | Updates section fields | PASS (traced) |
| Visibility toggle | Action sheet | `toggleVisibility` | Local | Toggles `isVisible` | PASS — student filter uses `isVisible` |
| Delete section | Action sheet + confirm | `deleteSection` | Local | Removes from array | PASS (traced) — requires save to persist |
| Editor Save | Modal chrome | `handleSave` → `onSave` | Local | Closes modal | PASS |
| Editor Done/Close | Modal | `onClose` | None | Dismiss | PASS |
| Add row / Add item | Editor | Local state | None | Table/list edits | PASS |
| Remove row/item | Editor | Local state | None | Delete row | PASS |

**Double-submit:** Footer buttons set `disabled={saving}` — PASS.

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Section action sheet | Tap section row | Quick edit, preview, visibility, full editor, delete | Local until save | PARTIAL |
| Delete confirm | Delete action | Cancel / Delete | Local | PASS |
| Full editor modal | Full editor / new section | Fields, markdown, lists, tables, visibility | Local until save | PASS |
| Search dock suppressed | Editor open | `useSuppressModuleSearchDock` | N/A | PASS |

Modal state resets on close via `useEffect` on `visible`/`section` — PASS.

---

## 9. Forms & Validation

| Form | Fields | Client validation | Server validation | Status |
|------|--------|-------------------|-------------------|--------|
| Section editor | Title (custom), visibility, fields, markdown, items, tables | Minimal (empty allowed) | UNVERIFIED | PARTIAL |
| Quick edit fields | Template field map | None | UNVERIFIED | PARTIAL |
| Syllabus hero | Title, term, status | Read-only on mobile | UNVERIFIED | INFO — no mobile edit for title/term |

No client-side required-field enforcement before save. Server validation UNVERIFIED.

---

## 10. API Audit

| Method | Endpoint | Caller | Authorization | Validation | Production | Status |
|--------|----------|--------|---------------|------------|------------|--------|
| GET | `/api/instructor/syllabus` | `instructorApi.getSyllabus` | `x-instructor-id`, `x-course-id` headers | UNVERIFIED | Yes | PARTIAL |
| PUT | `/api/instructor/syllabus` | `instructorApi.saveSyllabus` | Same headers | UNVERIFIED | Yes | PARTIAL |
| GET | `/api/student/syllabus` | `studentApi.getSyllabus` | Student session cookie + `studentId` | UNVERIFIED | Yes | UNVERIFIED (downstream) |

**Payload (PUT):** `{ title, term, contentMode, sections, action? }` — traced in `FacultySyllabusScreen.save`.

**Contract note:** Faculty uses `InstructorSyllabus` with `sectionId`, `isRequired`, `isEditable`; student/shared types use optional `sectionId`/`id` — shared prepare layer normalizes display. Runtime parity UNVERIFIED.

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | Yes — add custom section | Yes | Partial (Maestro Aug 16 history; this run list flow failed on hideKeyboard) | PARTIAL |
| Read | Yes — GET on load/refresh | Yes | Yes (sim smoke + prior Maestro) | PASS |
| Update | Yes — editor + quick edit + visibility | Yes | Partial | PARTIAL |
| Delete | Yes — custom sections only | Yes | Partial (prior Maestro QA delete) | PARTIAL |
| Restore | No | N/A | N/A | N/A |
| Publish | Yes — `action: "publish"` | Yes | UNVERIFIED | UNVERIFIED |

All mutations batch through **Save draft** or **Publish** — local edits are intentionally staged. UX copy on delete confirm explains this — PASS for clarity.

---

## 12. Authentication & Authorization

**Status:** PARTIAL / UNVERIFIED

| Check | Result |
|-------|--------|
| Faculty API uses scoped headers | `x-instructor-id`, `x-course-id` on every call |
| Anonymous access | Production probe returns error, not data — good sign |
| Student vs faculty route separation | Yes |
| Server-side role/ownership enforcement | **UNVERIFIED** — backend not in repository |
| IDOR (swap courseId in header) | **UNVERIFIED** — must be tested against production with two courses |

**Dependency:** Entire app uses client-supplied instructor/course headers; syllabus inherits this pattern.

---

## 13. Course/Section Isolation

**Status:** PARTIAL

| Check | Result |
|-------|--------|
| Loads only when `selectedCourse` set | PASS |
| Scope includes `courseId` on API | PASS |
| Course switch invalidates | `useEffect` on `[ready, load]` refetches when scope changes — PASS |
| Stale local edits on course switch | **No discard prompt** — unsaved local `syllabus` state may persist until remount — MEDIUM |

---

## 14. Membership Enforcement

**Status:** N/A / UNVERIFIED

Nav item has no `minTier`. Server-side entitlement for syllabus editing UNVERIFIED. UI uses server `canEdit` flag — PASS pattern if server is authoritative.

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

Backend schema, soft delete, publish timestamps, and orphan prevention not auditable from this repository.

Client generates custom section IDs as `custom-${Date.now()}` — server must accept and persist; UNVERIFIED.

`reorderSections()` renumbers `order` on save but **no UI to reorder sections** — order only changes by delete/add, not drag/reorder.

---

## 16. Files/Documents

**Status:** PARTIAL

| Feature | Mobile faculty | Status |
|---------|----------------|--------|
| PDF syllabus (`contentMode: "pdf"`, `pdfUrl`) | Read-only note in hero | INFO — no upload/replace on mobile |
| PDF open (student) | `Linking.openURL(pdfUrl)` | PASS (student screen) |
| Section images (`imageUrl`) | Not implemented in faculty editor | INFO |

---

## 17. Notifications

**Status:** N/A

No syllabus-specific notification triggers traced in faculty save flow within mobile repo. Deep link to `/module/syllabus` supported in `notification-link.ts` — PASS for routing only.

---

## 18. Cora Integration

**Status:** UNVERIFIED

Faculty Cora registry declares syllabus capabilities and risk levels. Mobile repo contains activity labels for `syllabus.saveSection` / `syllabus.publishSection` but **no traced Cora tool handler** or confirm-card wiring specific to syllabus CRUD in this codebase. Whether Cora reuses `instructorApi.saveSyllabus` server-side is UNVERIFIED.

---

## 19. Mobile UX

**Status:** PASS with gaps

| Check | Result |
|-------|--------|
| Native grouped list + sheet pattern | PASS — aligns with module design rules |
| Bottom search dock | PASS — `FacultySearchToolbar` default dock |
| Footer bar clearance for dock | PASS — `searchDockInset` + `FOOTER_BAR_HEIGHT` |
| Safe areas | PASS — `useSafeAreaInsets` |
| Read-only faculty blocked from section sheets | **HIGH UX defect** |
| Section reorder | Missing — meta claims “Weekly schedule” |
| Unsaved changes indicator | Missing |

---

## 20. Theme & Accessibility

**Status:** PARTIAL

| Check | Result |
|-------|--------|
| Status chips with labels (Published/Draft/Hidden/Required/Custom) | PASS — not color-only |
| Row `accessibilityLabel` on sections | PASS |
| Footer / publish buttons | PASS |
| Hardcoded trash icon color `#b91c1c` | LOW — not theme-tokenized |
| Icon delete buttons ~38pt tap | LOW — below 44pt guideline |

Dark/light: uses `useThemedNative`, `useFacultyModuleStyles`, `COURSE_INFO_*` tokens — PASS (code review).

---

## 21. Error/Loading/Empty States

**Status:** PASS

| State | Implementation |
|-------|----------------|
| Loading | `ActivityIndicator` |
| Error | `errorBox` with message from `ApiError` |
| No course | `FacultyEmptyState` |
| No syllabus payload | Empty state |
| No sections | Empty + CTA to use + |
| No search matches | Empty state |
| Refresh failure | Sets error string |

Forced HTTP errors on server not tested this run — UNVERIFIED for 401/403/500 UI.

---

## 22. Performance

**Status:** PASS (small module)

Client-side search/filter on section list — acceptable for typical syllabus size. No pagination needed. No N+1 API pattern (single GET). Full section JSON cloned on editor open via `JSON.parse(JSON.stringify)` — acceptable.

---

## 23. Security

**Status:** PARTIAL

| Check | Result |
|-------|--------|
| Hardcoded secrets in module | None found |
| Unsafe logging | None found in syllabus files |
| Client-authoritative `canEdit` | UI hides edit chrome when false — server must enforce on PUT |
| Markdown/HTML injection display | Student uses markdown rendering — XSS risk depends on renderer/server sanitization — UNVERIFIED |

---

## 24. Web/Mobile Integration

**Status:** UNVERIFIED

Shared syllabus lib (`prepareSyllabusForDisplay`, section titles, exam schedule merge) suggests intentional parity. No cross-portal create/edit/delete test performed this run.

Web path: `/student/dashboard-v2/syllabus`. Faculty mobile is native editor, not WebView — PASS for faculty.

---

## 25. Faculty → Student Integration

**Status:** UNVERIFIED

Expected flow: faculty **Publish** → student `GET /api/student/syllabus` shows visible sections; hidden sections filtered by `prepareStudentSyllabusSections`; empty → “Syllabus not published”.

Logic traced in code; **not executed** faculty publish → student verify this run.

---

## 26. Automated Tests

| Type | Coverage |
|------|----------|
| Unit / integration tests | **None** for syllabus |
| Maestro | `faculty-syllabus.yaml` PASS (nav smoke); `faculty-syllabus-list.yaml` FAIL (hideKeyboard); prior Aug 16 flows show QA create/delete paths exercised |

No new tests added (audit-only run per skill).

---

## 27. End-to-End Test Results

| Workflow step | Executed | Status |
|---------------|----------|--------|
| Open Syllabus from drawer | Yes (Maestro) | PASS |
| Load syllabus list | Yes | PASS |
| Search sections | Partial | PASS (client-side) |
| Open section sheet | Partial (prior runs) | PARTIAL |
| Quick edit / full editor | Partial (prior runs) | PARTIAL |
| Add custom section | Partial (prior runs) | PARTIAL |
| Delete custom section (local) | Partial (prior runs) | PARTIAL |
| Save draft → verify persistence | No | UNVERIFIED |
| Publish → student sees update | No | UNVERIFIED |
| TA read-only (`canEdit: false`) | No | UNVERIFIED |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | UX / Authorization | When `canEdit` is false, section rows use `disabled={!canEdit}`, blocking the action sheet entirely — read-only faculty/TAs cannot preview section detail, quick edit preview, or visibility status in the sheet. | `FacultySyllabusScreen.tsx` L314 | `FacultySyllabusScreen.tsx` | Allow row tap in read-only mode; open sheet in view-only (hide edit/delete/toggle actions) when `!canEdit`. |
| F-002 | HIGH | E2E | Publish → student visibility not verified on production/simulator this run. | Skill scope requires downstream proof | N/A | Run disposable QA publish on test course; verify student Syllabus accordion + hidden sections. |
| F-003 | HIGH | Backend | Server auth, validation, IDOR, and publish semantics for `/api/instructor/syllabus` not auditable — backend absent from repo. | Repository search | N/A | Audit server route; confirm PUT rejects `canEdit: false` and cross-course IDs. |
| F-004 | MEDIUM | UX | No unsaved-changes warning when navigating away after local edits (visibility, delete, editor changes) before Save draft/Publish. | Local state pattern in screen | `FacultySyllabusScreen.tsx` | Add dirty flag + confirm on blur/navigation/back. |
| F-005 | MEDIUM | Feature | No section reorder UI; `order` only renumbered on save from array order — faculty cannot reorder template sections on mobile. | No drag/reorder controls; meta claims schedule | `FacultySyllabusScreen.tsx` | Add reorder (drag handles or move up/down) or document as web-only. |
| F-006 | MEDIUM | Feature | Syllabus title/term not editable on mobile (display only). | Hero is read-only Text | `FacultySyllabusScreen.tsx` | Add edit fields or link to web if intentional gap. |
| F-007 | MEDIUM | Course isolation | Switching courses may leave staged local edits in memory until reload. | `syllabus` state not reset on course change | `FacultySyllabusScreen.tsx` | Reset state / prompt when `scope.courseId` changes with dirty edits. |
| F-008 | MEDIUM | Testing | No automated unit/integration tests for syllabus CRUD or API contract. | No `*.test.*` matches | N/A | Add tests for save payload shape, `canEdit` gating, prepare/filter logic. |
| F-009 | LOW | Theme | Hardcoded `#b91c1c` on trash icons in editor. | Editor modal L109, L281 | `FacultySyllabusSectionEditorModal.tsx` | Use `tokens.danger` / native semantic color. |
| F-010 | LOW | A11y | Delete icon buttons ~38pt padding vs 44pt target. | `iconBtn` style | Editor + action sheet | Increase hitSlop to 44×44. |
| F-011 | LOW | PDF | PDF content mode shows note only — no mobile PDF upload/management. | L278–282 | `FacultySyllabusScreen.tsx` | Document web-only or add PDF attach flow. |
| F-012 | LOW | Schema | `imageUrl` / `imageCaption` supported in types but no faculty/student mobile UI. | `syllabus/types.ts` | N/A | Implement or remove from contract docs. |
| I-001 | INFO | Cora | Registry lists syllabus capabilities; runtime tool wiring not traced in mobile repo. | `faculty-module-registry.ts` | N/A | Verify Cora uses same PUT endpoint server-side. |
| I-002 | INFO | Meta | Module meta advertises “Weekly schedule” — schedule sections are template tables, not a separate scheduler UI. | `faculty-module-meta.ts` | N/A | Align marketing copy with actual UI. |
| I-003 | INFO | Maestro | `faculty-syllabus-list.yaml` fails on `hideKeyboard` (Liquid Glass dock / custom inputs). | Maestro run 2026-08-17 | Maestro flows | Use dismiss tap pattern from module-deep-test skill. |
| I-004 | INFO | Web path | Student web syllabus at `/student/dashboard-v2/syllabus`; faculty uses native module. | `module-web-paths.ts` | N/A | Expected architecture. |

---

## 29. Required Fixes Before Ship

1. **F-001** — Read-only faculty must be able to open section sheets (view-only mode).
2. **F-002** — Prove publish → student syllabus E2E on production or staging.
3. **F-003** — Server-side audit of `/api/instructor/syllabus` auth, course scope, and `canEdit` enforcement.

---

## 30. Future Improvements

- F-004 — Unsaved changes guard
- F-005 — Section reorder on mobile
- F-006 — Title/term editing
- F-007 — Course-switch dirty state reset
- F-008 — Automated tests
- F-009–F-012 — Theme, a11y, PDF/images
- I-001 — Cora parity verification

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 95 |
| Routing | 95 |
| UI | 82 |
| Buttons/Actions | 78 |
| API Integration | 70 |
| CRUD | 65 |
| Authentication | 60 |
| Authorization | 55 |
| Course Isolation | 72 |
| Membership | 85 |
| Data Integrity | 50 |
| Production Configuration | 92 |
| Error Handling | 80 |
| Mobile UX | 75 |
| Security | 65 |
| Performance | 88 |
| Accessibility | 78 |
| Cora Integration | 45 |
| Testing | 40 |

**Overall Module Score:** 74/100

**Final Status:** REQUIRES FIXES BEFORE SHIP

**Dependencies recorded:** `instructor-api` header auth pattern, `constants.ts` API base, `faculty-registry`, `faculty-nav`, shared `syllabus/*` lib, student `course-info-api`

**Next submodule:** none (small module complete)
