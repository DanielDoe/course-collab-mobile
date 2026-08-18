# Schedule Adjustment — Student Mobile Production Audit

```
MODULE: Schedule Adjustment
STUDENT ROUTE: /module/schedule-adjustment
NAVIGATION GROUP: Course Info. student-nav id schedule-adjustment, label Schedule Adjustment, icon swap-horizontal-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS["schedule-adjustment"] → ScheduleAdjustmentModuleScreen → ScheduleAdjustmentScreen
FACULTY ROUTE: /module/schedule-adjustment
FACULTY NAVIGATION GROUP: Administration. faculty-nav id schedule-adjustment. No minTier / locked.
FACULTY REGISTRY: faculty-registry "schedule-adjustment" → FacultyScheduleAdjustmentScreen
PRIMARY SCREEN (this scope): expo/src/components/faculty/admin/FacultyScheduleAdjustmentScreen.tsx
RELATED SCREENS:
  Faculty: FacultyAdminCourseGate, FacultyAdminScreen, ScheduleAdjustmentStepper, ScheduleAdjustmentNoticeBanner
  Student: ScheduleAdjustmentScreen, ScheduleAdjustmentDetailScreen (/schedule-adjustment/[id]), MobileAvailabilityPicker
SUBROUTES: /schedule-adjustment/[id]
API ROUTES:
  GET|POST /api/instructor/schedule-adjustments
  GET /api/instructor/schedule-adjustments/:id
  GET|POST /api/instructor/schedule-adjustments/:id/actions
  GET /api/instructor/schedule-adjustments/:id/approval-file
  GET /api/student/schedule-adjustments
  GET /api/student/schedule-adjustments/:id
  GET|POST /api/student/schedule-adjustments/:id/availability
  POST /api/student/schedule-adjustments/:id/consent
SERVICES: instructor-schedule-adjustment-api.ts (header-only local fetch), schedule-adjustment-api.ts (studentAuthenticatedRequest)
DATABASE MODELS: UNVERIFIED directly. Inferred from v0 handlers: schedule_adjustment_requests, schedule_enrollment_snapshots, schedule_availability_responses, schedule_consents, schedule_candidates, schedule_audit_logs, schedule_approval_records, course_schedule_versions
MEMBERSHIP: Unlocked all student tiers. Faculty Free includes this admin row.
CORA INTEGRATION: No student or faculty mobile Cora tool. Web has read-only buildScheduleAdjustmentCoraSummary.
FACULTY DEPENDENCY: Faculty Expo Schedule Adjustment is the upstream writer (create, start poll, select candidate, department record, consent, finalize, cancel).
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: /student/dashboard-v2/schedule-adjustment
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Schedule Adjustment**. Scope is Faculty Expo Schedule Adjustment plus required backend and student Schedule Adjustment downstream.

Execution: production HTTPS probes with review roster (Alex ECE `910000001` / db `722`, Jordan `723`, ELEG `734`, faculty `mchen` / instructor `15`, course `16` ECE2202, IDOR course `1`). Simulator UI: **UNVERIFIED**. Created disposable request **id 2** (`AUDIT-DELETE Schedule Adjustment probe — do not keep`), started availability, Alex listed + detailed + submitted one slot, then faculty cancelled. Did not finalize a live request.

Prior faculty report `expo/docs/audits/faculty-mobile/schedule-adjustment.md` claimed READY TO SHIP 84. That report did not probe production session auth and did not notice the Expo faculty client is a private header-only `fetch`. **Rejected.**

---

## Executive Summary

Readiness: **REQUIRES FIXES BEFORE SHIP**  
Score: **66/100**  
Blockers: 0  
Critical: 0  
High: 1 (SA1 faculty Expo client)  
Medium: 6  
Low: 2  
Info: 1

Production **server** auth is in good shape. Unauth and header-only instructor/student reads and writes returned **401**. Cookie faculty create → start → student list/detail/grid/submit → cancel completed on live ECE2202. Course `1` faculty list **403**. Alex cookie + Jordan/ELEG ids **403**. Cross-role cookies **401**.

The faculty Expo module cannot use that backend. `instructor-schedule-adjustment-api.ts` sends only `x-instructor-id` / `x-course-id`, with no cookies, MFA trust, refresh header, `credentials: "include"`, or HTTPS assert. The shared `instructorRequest` in `instructor-api.ts` already fail-closes. This client will 401 on production, so instructors cannot run the primary workflow from the app.

Student mobile already uses `studentAuthenticatedRequest`. Downstream visibility after `start_availability` was proven (Alex list n=1, detail 200, availability POST 200).

---

## Architecture

Faculty Drawer (`Administration` → Schedule Adjustment)  
→ `/module/schedule-adjustment`  
→ `FacultyScheduleAdjustmentScreen`  
→ **local header-only fetch** (`instructor-schedule-adjustment-api.ts`)  
→ `/api/instructor/schedule-adjustments*`  
→ `requireCoursePermission` → `requireInstructorCourse` → `requireInstructorSession`

Student Drawer (`Course Info` → Schedule Adjustment)  
→ `/module/schedule-adjustment` → `ScheduleAdjustmentScreen`  
→ `studentAuthenticatedRequest` (cookies + MFA + refresh; fail-closed)  
→ `/api/student/schedule-adjustments*`  
→ `requireStudentIdParamMatchesCaller` then `resolveStudentCourseContextFromRequest`

Faculty create/start snapshots enrollment and notifies students. Student detail/grid/submit require `schedule_enrollment_snapshots`. Student **list** does not join that snapshot.

---

## Files Inspected

- `expo/src/constants/faculty-nav.ts` L137
- `expo/src/constants/student-nav.ts` L111
- `expo/src/modules/faculty-registry.tsx` L144
- `expo/src/modules/registry.tsx` L71
- `expo/src/modules/native-screens.tsx` L201
- `expo/app/(app)/module/[id].tsx`
- `expo/app/(app)/schedule-adjustment/[id].tsx`
- `expo/src/components/faculty/admin/FacultyScheduleAdjustmentScreen.tsx`
- `expo/src/components/course-info/ScheduleAdjustmentScreen.tsx`
- `expo/src/components/course-info/ScheduleAdjustmentDetailScreen.tsx`
- `expo/src/components/schedule-adjustment/MobileAvailabilityPicker.tsx`
- `expo/src/components/schedule-adjustment/ScheduleAdjustmentStepper.tsx`
- `expo/src/components/schedule-adjustment/ScheduleAdjustmentNoticeBanner.tsx`
- `expo/src/lib/instructor-schedule-adjustment-api.ts`
- `expo/src/lib/schedule-adjustment-api.ts`
- `expo/src/lib/instructor-api.ts` `instructorRequest` L1483–1552
- `expo/src/lib/student-api.ts` `studentAuthenticatedRequest`
- `expo/scripts/test-admin-modules-api.mjs` L47–56, L280–286
- `v0-coursecollabv3/app/api/instructor/schedule-adjustments/route.ts`
- `v0-coursecollabv3/app/api/instructor/schedule-adjustments/[id]/route.ts`
- `v0-coursecollabv3/app/api/instructor/schedule-adjustments/[id]/actions/route.ts`
- `v0-coursecollabv3/app/api/instructor/schedule-adjustments/[id]/approval-file/route.ts`
- `v0-coursecollabv3/app/api/student/schedule-adjustments/route.ts`
- `v0-coursecollabv3/app/api/student/schedule-adjustments/[id]/route.ts`
- `v0-coursecollabv3/app/api/student/schedule-adjustments/[id]/availability/route.ts`
- `v0-coursecollabv3/app/api/student/schedule-adjustments/[id]/consent/route.ts`
- `v0-coursecollabv3/lib/instructor-session-auth.ts`
- `v0-coursecollabv3/lib/student-api-auth.ts`
- `v0-coursecollabv3/lib/schedule-adjustment/workflow-service.ts`
- `v0-coursecollabv3/lib/schedule-adjustment/approval-attachment.ts`

---

## Navigation & Routing

Faculty Administration row label, icon, and route match the registry. Student Course Info row matches. `/module/[id]` selects faculty vs student renderer from `session.portal`. Deep link `/schedule-adjustment/[id]` is student-only. Invalid `id` (`NaN` / `<= 0`) returns `null` — blank screen (SA6). Membership unlocked. Course gate: `FacultyAdminCourseGate` requires a selected course.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app` via `expo/src/config/api.ts` `PRODUCTION_API_BASE_URL`.  
Development URLs: none in schedule-adjustment clients.  
Mock dependencies: none found.  
Faculty client does **not** call `assertProductionHttpsUrl` (SA1). Student client does.

---

## Screens

| Screen | Class | Notes |
|--------|-------|-------|
| FacultyScheduleAdjustmentScreen | ACTIVE | List + create form + detail workflow |
| ScheduleAdjustmentScreen | ACTIVE | Student list |
| ScheduleAdjustmentDetailScreen | ACTIVE | Availability + consent |
| MobileAvailabilityPicker | ACTIVE | Day chips + slot cycle |
| ScheduleAdjustmentStepper | ACTIVE | Shared status steps |
| ScheduleAdjustmentNoticeBanner | ACTIVE | Auto-dismiss institutional notice |

Simulator light/dark/safe-area: **UNVERIFIED**.

---

## Components

Classify ACTIVE / LEGACY / DEAD / PLACEHOLDER / UNVERIFIED.

- Faculty create form, request list, detail stats, candidate rows, department fields, consent actions: **ACTIVE**
- Faculty close-poll / remind-availability / reanalyze controls: **DEAD** (API exists, no UI) — SA2
- Faculty approval-file upload: **DEAD** on mobile (multipart route exists, no picker)
- Student list / detail / picker: **ACTIVE**
- No Coming Soon / TODO core path found

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| New request | Faculty list | `setSelectedId(-1)` | none | Open form | Code-traced | PASS |
| Start poll | Faculty form | `createRequest` | POST create + `start_availability` | Snapshot + student notify | Cookie API 200; Expo client will 401 | FAIL SA1 |
| Request row | Faculty list | `loadDetail` | GET :id + candidates | Open detail | Cookie 200; Expo client 401 | FAIL SA1 |
| Select candidate | Faculty detail | `select_candidate` | POST actions | Select slot | Code-traced; no confirm | PASS w/ note |
| Record department | Faculty detail | `record_department` | POST actions | Save approval | Sends `instructorNotes`; server reads `notes` | FAIL SA3 |
| Start consent | Faculty detail | `start_consent` | POST actions | Open student consent | Code-traced | PASS |
| Send consent reminder | Faculty detail | `remind_consent` | POST actions | Notify pending | Code-traced | PASS |
| Finalize | Faculty detail | confirm → `finalize` + `CONFIRM` | POST actions | Publish schedule | Confirm exists | PASS |
| Cancel request | Faculty detail | `cancel` no confirm | POST actions | Cancel + notify class | One tap, no dialog | FAIL SA4 |
| Close poll | Faculty detail | missing | `close_availability` exists | Early close | No control | FAIL SA2 |
| Student row | Student list | `router.push` | none | Open detail | Code-traced | PASS |
| Submit availability | Student detail | `submitAvailability` | POST availability | Save slots | Cookie 200 on id 2 | PASS |
| Agree and Sign | Student detail | `submitConsent(true)` | POST consent | Require ack + name | Client + server | PASS |
| Submit disagreement | Student detail | `submitConsent(false)` | POST consent | Require reason | Client allows empty; server 400 | FAIL SA11 |

---

## Menus / Action Sheets

None. Faculty create uses inline form, not a sheet.

---

## Modals

`AppAlert.alert` for finalize confirm, create validation, and save/error toasts. Cancel has no alert. Android back / outside tap: **UNVERIFIED** (simulator).

---

## Forms

Faculty create: reason + deadline required client-side; server also requires reason and `availabilityEndsAt`. BETA section rejected server-side. Weekdays / makeup dates validated on client. Department confirmation checkbox required before record. Student signature required to agree. Decline reason required server-side only (SA11).

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/instructor/schedule-adjustments` | faculty client | Session required. Header-only 401. Cookie 200 n=0 then n=1 | Owner / TA perms | none | `x-course-id` required; course 1 → 403 | PASS server / FAIL client SA1 |
| POST | same | faculty client | Header-only 401. Cookie 200 id 2 DRAFT | Owner only | none | course scoped | PASS server / FAIL client SA1 |
| GET | `/api/instructor/schedule-adjustments/:id` | faculty client | Header-only 401. Cookie 200 enrolled=12 | course match 404 | none | `row.course_id === ctx.course.id` | PASS server |
| GET | `.../:id/actions?view=candidates` | faculty client | 401 header-only. Cookie 200 n=0 | course match | none | scoped | PASS server |
| GET | `.../:id/actions?view=availability` | faculty client | 401 header-only | returns peer `availability_data` to instructors | none | scoped | PASS (faculty-intended) |
| POST | `.../:id/actions` | faculty client | Header-only 401. Cookie start/cancel 200 | owner-only action set; TA 403 | none | scoped | PASS server / FAIL client SA1 |
| GET | `.../:id/approval-file` | unused on mobile | 401 unauth/header-only | course match | none | scoped | PASS server |
| GET | `/api/student/schedule-adjustments` | student client | Session required. Header-only 401. Alex cookie 200 | query studentId must match caller | none | course from session student; list not snapshot-filtered | FAIL SA5 |
| GET | `/api/student/schedule-adjustments/:id` | student client | 401 header-only. Alex cookie 200 on id 2 | snapshot 403 if not enrolled | none | course + snapshot | PASS |
| GET/POST | `.../:id/availability` | student client | 401 header-only. Alex POST 200 | snapshot + status + deadline | none | scoped | PASS |
| POST | `.../:id/consent` | student client | 401 header-only | snapshot + COLLECTING_CONSENT + ack/name/reason | none | scoped | PASS server |

---

## CRUD

Faculty create → start → student read/write availability → cancel **executed** on production with cookies. Draft is hidden from students (`status NOT IN ('DRAFT', ...)`). After start, Alex saw id 2. After cancel, request is CANCELLED (student list excludes it). Finalize / department / consent collection **UNVERIFIED** end-to-end (would mutate live calendar). Select-candidate and finalize confirmed in source.

---

## Authentication

Production rejects anonymous and header-only identity on every schedule-adjustment route probed (faculty + student, GET + POST).  
`requireInstructorSession` and `requireStudentIdParamMatchesCaller` resolve identity from refresh cookie/header or MFA trust. `x-instructor-id` / `x-student-id` only detect mismatch (403).

Faculty Expo client does not send that proof (SA1). Student Expo client does.

---

## Student Authorization

Student cookie cannot call faculty list (**401** Instructor authentication required). Student APIs do not expose create/finalize/cancel. Faculty cookie cannot call student list (**401** Student authentication required). PASS.

---

## Cross-Student Isolation

Alex cookie + `studentId=723` (Jordan) → **403**.  
Alex cookie + `studentId=734` (ELEG) → **403**.  
Detail/grid/submit bind `resolved.ctx.studentDbId` and snapshot row. Faculty availability view can list peer slots — instructor-only. PASS.

---

## Course / Section Isolation

Faculty cookie + `x-course-id: 1` → **403**. Missing `x-course-id` → **400**.  
Create uses first non-BETA session on the course; explicit BETA `sectionId` rejected.  
Student list is course-wide and does **not** require a snapshot row (SA5). Detail does.

---

## Membership Enforcement

No tier lock on nav or APIs. N/A beyond “unlocked”. Tamper headers ignored because session is the identity source.

---

## Security

Header-only instructor create/action **401**. Header-only student availability/consent **401**. Finalize requires `confirmText === "CONFIRM"` and consent threshold. Approval attachments must be owned blob keys or empty. No answer-key surface.

---

## Assessment Security

N/A. This module is not a graded assessment.

---

## Cora Security

No mobile Cora tools. Web summary is read-only and states Cora cannot select/approve/consent/finalize. INFO SA10.

---

## Database Integrity

Create persisted id 2 DRAFT then COLLECTING_AVAILABILITY with enrollment snapshot 12. Availability upsert on `(request_id, student_id)` executed (Alex POST 200). Cancel 200. Direct SQL **UNVERIFIED**. Department notes field dropped by contract mismatch (SA3).

---

## Files / Documents

Approval-file GET is session-gated. Mobile has no upload UI. N/A for student files.

---

## Notifications

`startAvailabilityCollection` and cancel notify enrolled students (source). Mobile list refreshes on `schedule-adjustment` / `calendar` notification events. Push delivery **UNVERIFIED**.

---

## Mobile UX

Grouped faculty admin + student course-info cards. Shared stepper and safeguard banner. No bottom search dock (SA9). Faculty cancel is one-tap destructive. Student invalid-id route is blank. Simulator chrome **UNVERIFIED**.

---

## Theme

Uses `FacultyAdminScreen` / `NATIVE` tokens and course-info theme. Light/dark **UNVERIFIED** on simulator.

---

## Accessibility

Banner has label + dismiss. Date pickers have `accessibilityLabel`. Slot cells have text labels (Available / No / Tap), not color-only. Icon-only chevron on student rows. Full a11y pass **UNVERIFIED**.

---

## Errors / Loading / Empty States

Faculty list load/refresh surfaces `ApiError`. Faculty `loadDetail` catch sets error (prior F-004). Student list sets error. Student detail error/empty has Go back. Student refresh does not separately catch (load does). Decline empty reason shows alert only after 400 (SA11).

---

## Performance

Student detail always fetches availability grid even when status is not `COLLECTING_AVAILABILITY`. Faculty list is unbounded. Cookie E2E was fast. N+1 on student list `syncRequestStatus` per row (source).

---

## Web / Mobile Integration

Shared production APIs. Web path `/student/dashboard-v2/schedule-adjustment`. Web UI parity **UNVERIFIED**.

---

## Faculty → Student Integration

Executed: faculty cookie create + `start_availability` → Alex cookie list included id 2 (`COLLECTING_AVAILABILITY`) → detail 200 → grid days `MO|WE` → availability POST 200. Cancel 200. This is the required downstream contract. It works **only** if the faculty client sends a session (SA1).

---

## Tests

No Expo schedule-adjustment tests. Backend has `v0-coursecollabv3/lib/schedule-adjustment/availability-analysis.test.ts` (status/window math, not HTTP auth). `test-admin-modules-api.mjs` GET list uses header-only `scoped()` and does not persist login cookies — dishonest / will 401 (SA7).

---

## End-to-End Results

| Step | Result |
|------|--------|
| Faculty login mchen | 200 cookie + refresh; `requiresPasswordChange=false` |
| Faculty cookie list ECE | 200 n=0 |
| Faculty cookie create AUDIT-DELETE | 200 id=2 DRAFT |
| start_availability | 200 COLLECTING_AVAILABILITY |
| Faculty dashboard | 200 enrolled=12 rate=0 |
| Alex login | 200 cookie + refresh |
| Alex list | 200 n=1 hasCreated=true |
| Alex detail / grid / submit | 200 / 200 / 200 |
| Faculty cancel | 200 |
| Simulator UI | UNVERIFIED |

---

## Security Attack Results

| Probe | Result |
|-------|--------|
| Unauth faculty GET/POST | 401 |
| Header-only faculty GET/POST | 401 |
| Unauth student GET/POST | 401 |
| Header-only student GET/POST | 401 |
| Faculty cookie + course 1 | 403 |
| Faculty cookie, no course | 400 |
| Alex + Jordan studentId | 403 |
| Alex + ELEG 734 | 403 |
| Student cookie → faculty list | 401 |
| Faculty cookie → student list | 401 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| **SA1** | HIGH | Faculty client | **Locally repaired** — faculty client now calls exported `instructorAuthenticatedRequest` (session-proof `instructorRequest`). Production app still ships the old client until Expo is rebuilt. | `instructor-schedule-adjustment-api.ts` imports `instructorAuthenticatedRequest`; no local fetch | `expo/src/lib/instructor-schedule-adjustment-api.ts` | Deploy Expo with this client. |
| **SA2** | MEDIUM | Faculty UX | **Locally repaired** — Close poll + confirm posts `{ action: "close_availability" }` when `COLLECTING_AVAILABILITY`. | `FacultyScheduleAdjustmentScreen.tsx` Close poll `AppAlert` | `FacultyScheduleAdjustmentScreen.tsx` | — |
| **SA3** | MEDIUM | API contract | **Locally repaired** — `record_department` sends `notes: deptForm.notes`. | Screen `notes: deptForm.notes` | `FacultyScheduleAdjustmentScreen.tsx` | — |
| **SA4** | MEDIUM | Faculty UX | **Locally repaired** — Cancel uses destructive `AppAlert` then `{ action: "cancel", reason: "Cancelled by instructor" }`. | Screen cancel confirm | `FacultyScheduleAdjustmentScreen.tsx` | — |
| **SA5** | MEDIUM | Student scope | **Locally repaired in v0** — list inner-joins `schedule_enrollment_snapshots` on `auth.studentDbId`. Production unpatched until v0 deploy. | `student/.../route.ts` INNER JOIN | `v0-coursecollabv3/app/api/student/schedule-adjustments/route.ts` | Deploy v0. |
| **SA6** | MEDIUM | Student routing | **Locally repaired** — invalid id renders “Request not found.” + Go back. | `[id].tsx` `InvalidScheduleAdjustment` | `expo/app/(app)/schedule-adjustment/[id].tsx` | — |
| **SA7** | MEDIUM | Tests | **Locally repaired** — `audit-schedule-adjustment-production.mjs` + npm script. Header-only 200/500/404 fail. Cookie AUDIT-DELETE + cancel in `finally`. | `expo/scripts/audit-schedule-adjustment-production.mjs` | same | Run after deploys. |
| **SA8** | LOW | Tests | **Locally repaired** — `schedule-adjustment-auth.contract.test.ts` in `package.json` `test`. `npx tsx --test` 2/2 pass. | contract test | `expo/src/lib/schedule-adjustment-auth.contract.test.ts` | — |
| **SA9** | LOW | Faculty UX | Request list has no search/filter. | Screen list | optional | Skipped — optional dock search. |
| **SA10** | INFO | Cora | No mobile Cora registry entry. | no registry match | — | Skipped — INFO only. |
| **SA11** | MEDIUM | Student UX | **Locally repaired** — decline disabled when blank; `submitConsent(false)` alerts if `declineReason` empty. | Detail disable + AppAlert | `ScheduleAdjustmentDetailScreen.tsx` | — |

Already closed on the server / faculty UI (do not re-fix): finalize destructive confirm + `CONFIRM`; BETA section excluded; `loadDetail` error banner. Faculty **server** session proof is already `requireInstructorSession`. Student **client** session proof is already `studentAuthenticatedRequest`.

---

## Required Before Ship

1. SA1 — faculty Expo client must use session-proof `instructorRequest`.
2. SA3 — persist department notes (`notes`).
3. SA4 — confirm cancel.
4. SA5 — snapshot-filter student list.
5. SA6 — invalid id UI.
6. SA7 — honest production audit script.
7. SA2 / SA11 — close-poll control and decline validation.

Do not mark READY because the faculty-mobile report file exists or because cookie probes succeeded from this audit harness.

---

## Future Improvements

- Mobile approval-file upload if department evidence is required
- Remind availability + reanalyze on faculty detail
- Student list search if many concurrent requests
- Cora read-only summary on mobile if product wants it

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 92 |
| Routing | 82 |
| UI | 78 |
| Buttons | 68 |
| API | 70 |
| CRUD | 72 |
| Authentication | 70 |
| Authorization | 90 |
| Student Isolation | 90 |
| Course Isolation | 92 |
| Membership | 95 |
| Production Configuration | 92 |
| Data Integrity | 78 |
| Security | 88 |
| Assessment Security | N/A |
| Cora Security | N/A |
| Error Handling | 76 |
| Mobile UX | 74 |
| Performance | 82 |
| Accessibility | 70 |
| Testing | 38 |

OVERALL SCORE: 66/100

FINAL STATUS: REQUIRES FIXES BEFORE SHIP

---

## Registry entry

```json
{
  "schedule-adjustment": {
    "status": "requires_fixes",
    "score": 66,
    "auditedAt": "2026-08-18T03:30:00-05:00",
    "commit": "dba7f46",
    "blockers": 0,
    "critical": 0,
    "high": 1
  }
}
```
