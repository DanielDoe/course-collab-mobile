# My Notes — Student Mobile Production Audit

```
MODULE: My Notes
STUDENT ROUTE: /module/notes
NAVIGATION GROUP: Learning Center. student-nav id notes, label My Notes, icon journal-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS.notes → NotesScreen
PRIMARY SCREEN: NotesScreen in expo/src/components/notes/NotesScreen.tsx
RELATED SCREENS: NoteEditorScreen, CourseNoteViewerScreen, NoteListCard, DigitalNoteRichEditor, MarkdownNotePreview, DigitalNoteBodyView, CircuitWorkspaceEditor/Viewer (ink). Faculty Course Notes is downstream only (not a faculty-module audit).
SUBROUTES: /notes/[id] (personal / shared editor), /notes/course/[id] (instructor note, read-only)
API ROUTES:
  GET|POST /api/student/digital-notes
  GET|PATCH|DELETE /api/student/digital-notes/:noteId
  GET|PUT /api/student/digital-notes/:noteId/share
  POST /api/student/digital-notes/upload-image (client calls; production 405)
  GET /api/student/course-notes
  GET /api/student/roster (share sheet classmates)
  GET|POST|PATCH|DELETE /api/instructor/course-notes (+ topics / configuration / deleted)
SERVICES: expo/src/lib/digital-notes-api.ts, note-image-insert.ts, instructor-content-api.ts (faculty writer)
DATABASE MODELS: UNVERIFIED directly. Inferred from v0: student_digital_notes, student_digital_note_shares, course_digital_notes, students, sessions
MEMBERSHIP: All tiers. No minTier. Live review student: Scholar. Cora propose_personal_note uses the same digital-notes client.
CORA INTEGRATION: student-module-registry notes.denied includes edit_instructor_course_notes. local-proposals personalNotes.create → digitalNotesApi.createNote
FACULTY DEPENDENCY: Faculty Expo Course Notes publishes typed/ink notes; student Course tab lists published + topic-available rows
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: web student digital-notes hub exists in v0; mobile is a native twin
```

Size: MEDIUM  
Audited: 2026-08-17  
Commit: `f710215f` plus uncommitted notes/faculty-content clients in the working tree  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **My notes**. The “Faculty Expo only” scope line is treated as faculty Course Notes → student Course tab downstream only. This is **not** a faculty Course Notes UI audit. Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **44/100**  
Blockers: 0  
Critical: 3  
High: 3  
Medium: 3  
Low: 2

The student My Notes hub is reachable, points at production HTTPS, docks search correctly, and can create / edit / share / delete personal notes. Faculty published ECE notes (7) appear on the Course tab; unpublished draft id 41 does not. Shared-note read-only is enforced once a header identity is accepted.

**Production still treats `x-student-id` / `x-instructor-id` as a login.** Header-only created personal note 160 and faculty draft 54 (both deleted in the same run). Unauthenticated `GET /api/student/roster` returns the full ECE review roster (names + roster ids). An ELEG header plus `courseId=16` returns the seven ECE published notes.

Local v0 digital-notes / course-notes routes already import `requireCallerStudentDbId`, and `requireInstructorCourse` already requires an instructor session. **Production responses prove those locks are not live.** The Expo notes client and faculty content client still send header-only identity, so they would break after a real session deploy and they are the current attack path.

---

## Architecture

Student Drawer (`Learning Center` → My Notes)  
→ `/module/notes`  
→ `registry.tsx` `notes`  
→ `NotesScreen` (tabs My Notes / Course Notes + dock search)  
→ `/notes/[id]` editor or `/notes/course/[id]` viewer  
→ `digitalNotesApi` (`x-student-id` + query `studentDatabaseId`, no cookies)  
→ production `student_digital_notes` / `course_digital_notes`  
→ faculty writer: `FacultyCourseNotesScreen` → `instructorCourseNotesApi` (`x-instructor-id` + `x-course-id`, no cookies)

---

## Files Inspected

- `expo/src/constants/student-nav.ts`, `faculty-nav.ts`
- `expo/src/modules/registry.tsx`
- `expo/app/(app)/notes/[id].tsx`, `expo/app/(app)/notes/course/[id].tsx`
- `expo/src/components/notes/NotesScreen.tsx`, `NoteEditorScreen.tsx`, `CourseNoteViewerScreen.tsx`, `NoteListCard.tsx`
- `expo/src/lib/digital-notes-api.ts`, `note-image-insert.ts`, `instructor-content-api.ts`, `instructor-api.ts` (session-proof pattern)
- `expo/src/lib/cora/student-module-registry.ts`, `local-proposals.ts`, `capabilities.ts`
- `expo/src/components/faculty/FacultyCourseNotesScreen.tsx`
- `v0-coursecollabv3/app/api/student/digital-notes/**`, `course-notes/route.ts`, `roster/route.ts`
- `v0-coursecollabv3/app/api/instructor/course-notes/route.ts`
- `v0-coursecollabv3/lib/student-api-auth.ts`, `instructor-course-scope.ts`, `course-digital-notes.ts`

---

## Navigation & Routing

**PASS** for happy path. Drawer label My Notes → `/module/notes` → `NotesScreen`. Subroutes remap titles (“Edit note”, “Course note”). No faculty screen leak.

Invalid `/notes/abc`: editor shows “Invalid note.”  
Invalid `/notes/course/abc`: viewer `useEffect` returns early while `loading` stays `true` → **infinite spinner** (N7).

---

## Production Configuration

Production API verified: **YES** — `https://coursecollab.vercel.app`  
Development URLs: none in notes clients  
Mock dependencies: none in notes UI

---

## Screens

| Screen | Status | Notes |
|--------|--------|-------|
| NotesScreen | ACTIVE | Mine + Course tabs, dock search, create +, filters (mine only) |
| NoteEditorScreen | ACTIVE | Typed + ink, autosave, share sheet, delete, export |
| CourseNoteViewerScreen | ACTIVE | Read-only; cache then list lookup; no GET-by-id |
| FacultyCourseNotesScreen | ACTIVE (downstream writer) | Not re-audited as faculty UI |

---

## Components

| Component | Class |
|-----------|-------|
| NoteListCard | ACTIVE |
| DigitalNoteRichEditor | ACTIVE |
| CircuitWorkspaceEditor / Viewer | ACTIVE |
| StudentSearchToolbar (dock) | ACTIVE |
| StudentGroupedFilterSheet | ACTIVE |
| Faculty share sheet chrome | ACTIVE (reused) |
| upload-image remote | PLACEHOLDER (405 → data URL fallback) |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Create + | NotesScreen dock | `createNote` | POST digital-notes | New note + editor | Header-only 200 created 160 | WORKS / INSECURE |
| Note row | Mine list | `router.push /notes/:id` | GET digital-notes/:id | Open editor | Works when header matches owner/share | PASS* |
| Course row | Course list | `router.push /notes/course/:id` | listCourseNotes | Open viewer | Works for published ECE | PASS |
| Save (debounce) | Editor | `updateNote` | PATCH | Persist | Header-only as owner | WORKS / INSECURE |
| Share | Editor | `updateShares` | PUT …/share | Classmates only | Header-only owner PUT 200; non-owner 403 | WORKS / INSECURE |
| Delete | Editor | `deleteNote` | DELETE | Remove | Header-only owner 200 | WORKS / INSECURE |
| Export JSON/text | Editor | local export | none | Share sheet file | Code-traced | UNVERIFIED sim |
| Faculty publish | FacultyCourseNotesScreen | `createNote`/`updateNote` | instructor course-notes | Draft hidden / published visible | Header-only create 54; student list omitted unpublished 41 | WORKS / INSECURE |

\*Once a spoofed header is accepted, isolation by note id is real (see Security).

---

## Menus / Action Sheets

Mine filter sheet: ownership / sort / content — client-side only. Share modal: roster + checkboxes + Save sharing. Export alert: JSON / plain text / Cancel.

---

## Modals

Share sheet resets on open via `loadShareDialog`. Android back: `onRequestClose` closes. Duplicate save: `shareSaving` disables the button.

---

## Forms

Title + rich body + ink workspace. Empty title coerced to “Untitled note” server-side. Shared notes: `readOnly` + PATCH 403. Publish-from-student: no student write to course notes.

---

## API Routes

| Method | Route | Caller | Authentication (production) | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|-----------------------------|---------------|------------|--------------|--------|
| GET | /api/student/digital-notes | digitalNotesApi | Header `x-student-id` enough; no header 401 | Lists that id’s notes + shares | n/a | n/a | CRITICAL |
| POST | /api/student/digital-notes | digitalNotesApi | Header-only 200 (created 160) | Writes as header id | n/a | n/a | CRITICAL |
| GET/PATCH/DELETE | /api/student/digital-notes/:id | digitalNotesApi | Header-only | Owner-only mutate; share read | n/a | n/a | CRITICAL / IDOR-by-id PASS |
| GET/PUT | …/:id/share | digitalNotesApi | Header-only | Owner only | n/a | Classmates same session | CRITICAL |
| GET | /api/student/course-notes | digitalNotesApi | Header-only 200 | Published only | n/a | **Query courseId wins** | CRITICAL + HIGH |
| GET | /api/student/roster | listClassmates | **None** — unauth 200 | Section+course query | n/a | Query-trusted | CRITICAL |
| POST | /api/student/digital-notes/upload-image | note-image-insert | n/a | n/a | n/a | n/a | 405 |
| GET/POST/PATCH/DELETE | /api/instructor/course-notes | instructorCourseNotesApi | Header instructor+course 200 | Foreign course 403 | n/a | Header course | CRITICAL |
| GET | /api/student/lecture-notes | none in My Notes UI | Query studentId 200 | n/a | n/a | n/a | INFO (adjacent) |

Local v0 digital-notes/course-notes already call `requireCallerStudentDbId`. Production header-only 200 proves that lock is **not deployed**.

---

## CRUD

Create / read / update / delete / share proven on production with header-only Alex `722`. Cleanup deleted 160, 161, faculty 54. Shared Jordan read-only proven.

---

## Authentication

| Probe | Result |
|-------|--------|
| No identity GET digital-notes | 401 Student authentication required |
| Query `studentDatabaseId` only | 401 |
| `x-student-id: 722` no cookies | **200** list/create/get/delete |
| `x-student-id: 15` + `x-course-id: 16` faculty | **200** list/create/delete |
| Student headers + faculty headers | **200** faculty list (10 notes incl. drafts) |
| Faculty no headers | 401 Unauthorized |
| Student login POST (node fetch) | 200 body, **no Set-Cookie observed** — cookie+mismatch **UNVERIFIED** |

---

## Student Authorization

Student cannot PATCH/DELETE instructor course notes through student APIs (no write route). Student **can** call faculty course-notes with instructor headers and receive **drafts** (id 41 Bode plot). Cora registry denies `edit_instructor_course_notes`; enforcement is server-side only if faculty routes require a real instructor session.

---

## Cross-Student Isolation

With attacker header `723` vs Alex note 160 (unshared): GET 404, PATCH 403, share GET/PUT 403.  
After owner shared 161 with 723: Jordan GET 200 `isOwner: false`; PATCH 403.  
**Header spoofing is the isolation bypass** — anyone who sends `x-student-id: 722` is Alex.

---

## Course / Section Isolation

Without `courseId`, production binds enrollment: ECE `722` → course 16 / 7 notes; ELEG `734` → course 15 / 0 notes.  
**With `courseId=16`**, ELEG header `734` received the **same 7 ECE published notes**. Local `GET /api/student/course-notes` uses the query param when present. Faculty ELEG course 15 list is empty (demo clone gap).

---

## Membership Enforcement

No notes minTier. Scholar review student can CRUD. N/A for premium gates. Tampering `tier` not applicable.

---

## Security

Header-as-auth (student + faculty), public roster PII, courseId override. Unpublished instructor notes stay off the honest student list. Share targets filtered to same `session_id` classmates **after** owner identity is accepted.

---

## Assessment Security

N/A.

---

## Cora Security

Registry denies instructor-note edits. `personalNotes.create` confirms then calls `digitalNotesApi.createNote` — same header-only client. Tool-level faculty/admin registry access: **UNVERIFIED** this run.

---

## Database Integrity

Writes persist (create 160 listed immediately; delete → 404). Direct SQL: **UNVERIFIED**.

---

## Files / Documents

Image insert tries `POST /api/student/digital-notes/upload-image` then falls back to data URLs. Production upload: **405**. No signed blob for personal notes.

---

## Notifications

`useNotificationModuleRefresh(["notes", "ai-notetaker"])` — push deep-link **UNVERIFIED**.

---

## Mobile UX

Grouped lists, dock search (`placement` default `dock`), Title Case sections, empty states. Invalid course-note id spinner. Simulator chrome: **UNVERIFIED**.

---

## Theme

Uses `NATIVE` + themed student tokens. Light/dark: **UNVERIFIED** on device.

---

## Accessibility

Share/delete/export have labels. Filter sheet and ink editor: **UNVERIFIED**.

---

## Errors / Loading / Empty States

Load/refresh errors set a banner. Create/save/delete use `AppAlert`. Empty mine/course copy is intentional. Invalid course id spinner is not.

---

## Performance

Hub fans out 2 GETs (mine + course). Editor may GET note + GET shares. Course viewer may re-list all course notes. List cap 100.

---

## Web / Mobile Integration

Parity **UNVERIFIED** this run. Shared production tables.

---

## Faculty → Student Integration

| Faculty action | Student result (production) |
|----------------|-----------------------------|
| Published ECE notes 42,43,45,46,47,48,50 | Visible on Course tab (7) |
| Draft 41 Bode plot | Hidden from student list |
| Header-only faculty create | Works; cleaned up 54 |
| ELEG Course Notes | 0 rows — student ELEG Course tab empty |
| Topic disable | Previously proven by `audit:course-notes-production`; **not re-run** this session (would require live publish) |

---

## Tests

No Expo digital-notes contract tests. v0 has `student-api-auth.test.ts` (generic session helpers), not notes/roster/course-bind cases. Faculty `audit-course-notes-production.mjs` still treats header-only instructor as the happy path.

---

## End-to-End Results

List → create → get → share → classmate read-only → delete: **works** on production via header identity. Course tab shows published ECE notes. Session-bound identity: **FAIL** on production.

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| No session, query studentDatabaseId | 401 |
| Header-only student id | **200** full CRUD |
| Change noteId to another student’s unshared note | 404/403 |
| Header-only as owner, share then read as classmate | 200 read-only |
| Change courseId to ECE from ELEG header | **200 + 7 ECE notes** |
| Unauth roster | **200 + 12 names/ids** |
| Faculty header-only CRUD | **200** |
| Student headers + faculty headers | **200 faculty drafts** |
| Faculty header course 1 | 403 |
| Upload image | 405 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| N1 | CRITICAL | Authentication | Production student digital-notes accepts `x-student-id` as identity. Unauth without header is 401; header-only created/read/deleted note 160. | 2026-08-17 probes | `digital-notes-api.ts`; v0 `app/api/student/digital-notes/**` (local already `requireCallerStudentDbId`, **not on production**) | Deploy session bind. Expo client must send cookies / `x-cc-refresh` / MFA trust and refuse header-only (copy `student-api.ts`). |
| N2 | CRITICAL | Authentication | Production faculty course-notes CRUD accepts `x-instructor-id` + `x-course-id`. Created/deleted note 54. Student+faculty headers listed drafts. | 2026-08-17 probes | `instructor-content-api.ts`; v0 `requireInstructorCourse` (session locally, **not on production**) | Deploy instructor session. Faculty content client must send cookies like `instructor-api.ts` `instructorRequest`. |
| N3 | CRITICAL | Privacy | `GET /api/student/roster` is unauthenticated and returns `id`, `student_id`, `full_name` for the section. | Unauth 200, 12 ECE rows incl. Alex Rivera / 910000001 | v0 `app/api/student/roster/route.ts`; `digitalNotesApi.listClassmates` | Require session; bind section/course to the caller’s enrollment. |
| N4 | HIGH | Course isolation | Student course-notes honors query `courseId`. ELEG `734` + `courseId=16` → 7 ECE notes. No `courseId` → course 15 / 0 notes. | 2026-08-17 probes; v0 route uses `courseIdParam` over enrollment | v0 `app/api/student/course-notes/route.ts` | Ignore client courseId/session; use enrollment from the authenticated student only. |
| N5 | HIGH | Client auth | `digitalNotesApi` and `uploadNoteImage` send only `x-student-id`. After a real server lock, My Notes and Cora note-create will 401. | `digital-notes-api.ts` `headers()`; `note-image-insert.ts` | same | Use `studentAuthenticatedHeaders` / `studentRequest` from `student-api.ts`. |
| N6 | HIGH | Client auth | Faculty `instructor-content-api.ts` `instructorRequest` is header-only. After instructor session deploy, Course Notes mobile writes die. | `instructor-content-api.ts` L51–65 vs `instructor-api.ts` L1502–1512 | `instructor-content-api.ts` | Same cookie + MFA trust + fail-closed proof as `instructor-api.ts`. |
| N7 | MEDIUM | Routing | `/notes/course/[id]` with a non-numeric id never leaves the loading spinner. | `CourseNoteViewerScreen.tsx` effect early-return | same | Show the existing error/back state when `noteId` is invalid. |
| N8 | MEDIUM | Files | Image upload route missing (405); client embeds data URLs. | Production POST 405 | `note-image-insert.ts`; no v0 upload-image route | Keep fallback; do not invent a new upload API in this pass. |
| N9 | MEDIUM | Faculty downstream | ELEG review course has 0 course notes; ECE has 7. | Faculty list course 15 empty; student 734 enrollment-bound empty | demo seed | Demo clone — do not fabricate notes. |
| N10 | LOW | Testing | No notes/roster/course-bind contract tests. | grep | expo + v0 | Add targeted tests after repairs. |
| N11 | LOW | Performance | Course viewer re-lists all notes when cache misses; list cap 100. | `CourseNoteViewerScreen.tsx` | same | Optional GET-by-id later. |

---

## Required Before Ship

1. Deploy student session bind for digital-notes + course-notes; re-prove query-only/header-only → 401.  
2. Deploy instructor session bind for course-notes; re-prove header-only → 401.  
3. Lock roster behind the caller session.  
4. Bind student course-notes to enrollment (ignore client `courseId`).  
5. Expo `digitalNotesApi` + faculty `instructor-content-api` must send session proof or they will break after (1)/(2).  
6. Fix invalid course-note id spinner.

Do **not** treat empty ELEG notes or leftover review notes as ship blockers.

---

## Future Improvements

Signed image upload; GET course-note by id; cookie+mismatch re-prove after login Set-Cookie is visible; Cora tool execution on production.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 72 |
| UI | 78 |
| Buttons | 80 |
| API | 35 |
| CRUD | 70 |
| Authentication | 22 |
| Authorization | 40 |
| Student Isolation | 68 |
| Course Isolation | 28 |
| Membership | 85 |
| Production Configuration | 90 |
| Data Integrity | 72 |
| Security | 24 |
| Assessment Security | 100 |
| Cora Security | 62 |
| Error Handling | 70 |
| Mobile UX | 74 |
| Performance | 72 |
| Accessibility | 58 |
| Testing | 18 |

OVERALL SCORE: **44/100**

FINAL STATUS: **BLOCKED BY SECURITY / DATA ISSUE**

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` key `my-notes`.
