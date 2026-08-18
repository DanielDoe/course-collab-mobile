# Recommendation Letters — Student Mobile Production Audit

```
MODULE: Recommendation Letters
STUDENT ROUTE: /module/recommendations
NAVIGATION GROUP: Course Info. student-nav id recommendations, label Recommendation Letters, icon bookmark-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS.recommendations → RecommendationsModuleScreen → RecommendationsScreen
FACULTY ROUTE: /module/recommendations
FACULTY NAVIGATION GROUP: Students. faculty-nav id recommendations. No minTier / locked.
FACULTY REGISTRY: faculty-registry recommendations → FacultyRecommendationsScreen
PRIMARY SCREEN (this scope): expo/src/components/faculty/FacultyRecommendationsScreen.tsx
RELATED SCREENS:
  Faculty: FacultyRecommendationsListCards, FacultyRecommendationWorkspaceModal, FacultyRecommendationCreateModal, FacultyGuestAccountRequestsPanel
  Student: RecommendationsScreen (list + new only). No enrolled-student detail screen.
  Guest: GuestRecommendationsScreen, GuestRecommendationDetailScreen (/recommendation/[id])
SUBROUTES: /recommendation/[id] is guest-only
API ROUTES:
  GET|POST /api/instructor/recommendations
  GET|PATCH|DELETE /api/instructor/recommendations/:id
  PATCH /api/instructor/recommendations/:id/request-details
  POST /api/instructor/recommendations/:id/ai-suggest
  GET /api/instructor/recommendations/:id/pdf
  GET /api/instructor/recommendations/settings
  GET /api/instructor/recommendation-guest-account-requests
  GET|POST /api/student/recommendations
  GET|PATCH /api/student/recommendations/:id
  GET /api/student/recommendations/meta
  GET /api/student/recommendations/:id/pdf
  GET|PATCH|POST /api/student/recommendations/:id/brief
SERVICES: instructor-api.ts (session-proof instructorRequest), student-api.ts / course-info-api.ts (session-proof list/create/detail), recommendation-letter-url.ts (header-only PDF), guest-api.ts (header-only brief)
DATABASE MODELS: UNVERIFIED directly. Inferred: recommendation_requests, recommendation_profiles, recommendation_drafts, recommendation_files, recommendation_settings, recommendation_audit_log, recommendation_attachments
MEMBERSHIP: Unlocked all student tiers. Faculty Free includes this row.
CORA INTEGRATION: Faculty recommendation.read/draft/updateStatus; send denied. Student read/create/submit/cancel; denied read_confidential_faculty_letter. No mobile tool implementations.
FACULTY DEPENDENCY: Faculty Expo is the upstream writer (create-on-behalf, approve, request info, finalize, notify, delete).
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: /student/dashboard-v2/recommendations
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Recommendation Letters**. Scope is Faculty Expo Recommendation Letters plus required backend and student Recommendation Letters downstream.

Execution: production HTTPS with Alex ECE `910000001` / db `722`, Jordan `723`, faculty `mchen` / instructor `15`, course `16`, session `497`. Simulator UI: **UNVERIFIED**. Created disposable request **id 17** (`AUDIT-DELETE`), then DELETE 200. Header-only instructor PATCH mutated 17 to `info_requested` before delete.

Prior faculty report `expo/docs/audits/faculty-mobile/recommendations.md` claimed READY 88 and marked F-001–F-003 fixed. `audit-recommendations-production.mjs` treats header-only **200/400/404/405** as PASS. **Rejected.**

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **48/100**  
Blockers: 0  
Critical: 3  
High: 3  
Medium: 3  
Low: 2

Faculty Expo client already uses session-proof `instructorRequest`. Student list/create/detail clients already use `studentAuthenticatedRequest`. Cookie create-on-behalf → Alex list/detail works.

Production **server** still treats `x-instructor-id` as enough when `x-course-id` is omitted. Live: instructor-only GET list **200**; GET id 17 **200** (Alex name + email); PATCH **200** (`info_requested`); PDF reached handler (**400** no letter text). Guest inbox and create POST require a session when both course headers are present.

Student PDF and brief resolve identity from query `studentId` / `studentDatabaseId` with **no** session. Unauth PDF on id 17 returned **403** delivery-mode (auth passed). Unauth brief returned **200** `{brief:null}`.

Enrolled students have no mobile letter workspace. Cards are not pressable. `/recommendation/[id]` is the guest screen.

---

## Architecture

Faculty Drawer (`Students` → Recommendation Letters)  
→ `/module/recommendations`  
→ `FacultyRecommendationsScreen`  
→ `instructorRequest` (cookies + MFA + refresh; fail-closed)  
→ instructor recommendation APIs  

**Server GET/PATCH/DELETE/AI/PDF/settings** still parse `x-instructor-id` via local `instructorId()` and only call `requireInstructorCourse` when `x-course-id` is present.

Student Drawer (`Course Info` → Recommendation Letters)  
→ `RecommendationsScreen`  
→ `courseInfoApi` → `studentApi` (session-proof)  
→ `/api/student/recommendations*` (`requireBoundStudentCaller` on list/create/detail/meta)  

PDF/brief routes do **not** use `requireBoundStudentCaller`.

---

## Files Inspected

- `expo/src/constants/faculty-nav.ts` L104, L305–309
- `expo/src/constants/student-nav.ts` L114
- `expo/src/modules/faculty-registry.tsx` L126
- `expo/src/modules/registry.tsx` L74
- `expo/src/components/faculty/FacultyRecommendationsScreen.tsx`
- `expo/src/components/faculty/FacultyRecommendationCreateModal.tsx`
- `expo/src/components/faculty/FacultyRecommendationWorkspaceModal.tsx`
- `expo/src/components/course-info/RecommendationsScreen.tsx`
- `expo/app/(app)/recommendation/[id].tsx`
- `expo/src/lib/instructor-api.ts` L2295–2314, L3369–3432
- `expo/src/lib/student-api.ts` L755–906
- `expo/src/lib/course-info-api.ts` L201–218
- `expo/src/lib/recommendation-letter-url.ts`
- `expo/src/lib/guest-api.ts` L401–460
- `expo/scripts/audit-recommendations-production.mjs`
- `v0-coursecollabv3/app/api/instructor/recommendations/route.ts`
- `v0-coursecollabv3/app/api/instructor/recommendations/[requestId]/route.ts`
- `v0-coursecollabv3/app/api/instructor/recommendations/[requestId]/pdf/route.ts`
- `v0-coursecollabv3/app/api/instructor/recommendations/[requestId]/ai-suggest/route.ts`
- `v0-coursecollabv3/app/api/instructor/recommendations/[requestId]/request-details/route.ts`
- `v0-coursecollabv3/app/api/instructor/recommendations/settings/route.ts`
- `v0-coursecollabv3/app/api/student/recommendations/route.ts`
- `v0-coursecollabv3/app/api/student/recommendations/[requestId]/route.ts`
- `v0-coursecollabv3/app/api/student/recommendations/[requestId]/pdf/route.ts`
- `v0-coursecollabv3/app/api/student/recommendations/[requestId]/brief/route.ts`
- `v0-coursecollabv3/lib/optional-instructor-course-scope.ts`
- `v0-coursecollabv3/lib/instructor-session-auth.ts`

---

## Navigation & Routing

Faculty Students row and student Course Info row match registries. `?open=` opens the faculty workspace; `?tab=guest-requests` opens the guest inbox. Student `/recommendation/[id]` mounts `GuestRecommendationDetailScreen`. Invalid student deep links to that guest UI. PASS for faculty nav. FAIL student detail routing (RL4).

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`.  
Development URLs: none in recommendation clients.  
Mock dependencies: none.  
PDF builders do not use `assertProductionHttpsUrl`.

---

## Screens

| Screen | Class | Notes |
|--------|-------|-------|
| FacultyRecommendationsScreen | ACTIVE | Filters + dock search + create |
| FacultyRecommendationWorkspaceModal | ACTIVE | Patch / AI / delete |
| FacultyRecommendationCreateModal | ACTIVE | Create on behalf; deadline optional in UI |
| FacultyGuestAccountRequestsPanel | ACTIVE | Shared account-request approve/reject |
| RecommendationsScreen | ACTIVE | List + new request; cards not pressable |
| Student letter detail | MISSING | — |
| GuestRecommendationDetailScreen | ACTIVE | Guest portal only |

Simulator: **UNVERIFIED**.

---

## Components

Faculty letter cards, workspace tabs, create sheet, guest panel: **ACTIVE**.  
Student RequestCard: **ACTIVE** but no handler.  
Student withdraw/download: **DEAD** (API exists, no UI).  
`audit-recommendations-production.mjs` `expectDenied`: **LEGACY / dishonest**.

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Letter filters | Faculty hub | client filter | none | Filter | Code-traced | PASS |
| Open letter | Faculty card | workspace | GET :id | Detail | Cookie 200; instructor-only 200 | FAIL RL1 |
| Create | Faculty modal | `createRecommendationOnBehalf` | POST instructor | Create | Cookie 200 id 17 with deadline; 400 without | PASS w/ RL7 |
| Workspace patches | Faculty modal | `patchRecommendation` | PATCH action | Mutate | Cookie client; instructor-only PATCH 200 | FAIL RL1 |
| AI suggest | Faculty modal | `suggestRecommendationLetter` | POST ai-suggest | Draft | Unauth+both-headers 401; instructor-only unprobed (same helper) | FAIL RL1 |
| Delete | Faculty modal | `deleteRecommendationRequest` | DELETE | Remove | Cookie 200 id 17 | PASS cookie |
| Guest approve/reject | Guest tab | account-requests | POST | Gate | Unauth/header-both 401 | PASS |
| Student card | Student list | none | — | Open detail | No onPress | FAIL RL4 |
| Student submit | New tab | `createRecommendation` | POST student | Create | Client session-proof; header-only 401 | PASS |
| Student PDF | none on enrolled UI | header-only builder | GET pdf | Session | Unauth 403 on id 17 | FAIL RL2 |

---

## Menus / Action Sheets

Faculty workspace sheet + create sheet + guest filter + delete sheet. Decline uses confirm. Create has no deadline required flag despite server `require_purpose_deadline` (RL7).

---

## Modals

Create and workspace reset on close via `visible` effect / `onClose`. Android back **UNVERIFIED**.

---

## Forms

Faculty create: student + section required. Deadline optional in UI; production settings require it (400). Purpose chips. Student new request: purpose / session / instructor / optional deadline+description. Server purpose enum + semester cap.

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/instructor/recommendations` | faculty | Unauth 401. Both headers 401. **Instructor-only 200**. Cookie 200 n=0 then 1 | `instructor_id` from header | none | Optional; cookie+course 1 → 403 | FAIL RL1 |
| POST | same | faculty | Both headers 401. Cookie 200 id 17 | `requireInstructorCourse` + roster | none | session must belong to course | PASS |
| GET | `/api/instructor/recommendations/:id` | faculty | Instructor-only **200** id 17 (name+email) | header instructor owns row | none | optional | FAIL RL1 |
| PATCH | same | faculty | Instructor-only **200** `info_requested` | same | none | optional | FAIL RL1 |
| DELETE | same | faculty | Cookie 200 | same | none | optional | PASS cookie / FAIL pattern RL1 |
| GET | `.../:id/pdf` | faculty PDF builder | Instructor-only **400** (reached handler) | header instructor | none | optional | FAIL RL1 |
| POST | `.../:id/ai-suggest` | faculty | Both headers 401 | header instructor | none | optional | FAIL pattern RL1 |
| GET | guest-account-requests | faculty | Both headers 401. Cookie 200 n=10 | `requireInstructorCourse` | none | course | PASS |
| GET/POST | `/api/student/recommendations` | student | Header-only 401. Cookie 200 | caller bind | none | student-owned rows | PASS |
| GET | `/api/student/recommendations/:id` | student | Cookie 200 id 17 | caller + owner | none | owner | PASS |
| GET | `/api/student/recommendations/:id/pdf` | PDF URL | Unauth query id **403** (not 401) | studentId param only | none | owner id | FAIL RL2 |
| GET | `.../:id/brief` | guest client | Unauth **200** `{brief:null}` | query studentDatabaseId | none | owner id | FAIL RL3 |

---

## CRUD

Faculty cookie create (deadline required) → Alex list n=1 → detail 200 → DELETE 200. Instructor-only PATCH mutated status before delete. Finalize / notify / AI **UNVERIFIED** (would write letter text). Student withdraw API exists; no UI.

---

## Authentication

Student list/create/detail/meta: session required on production.  
Faculty create + guest inbox: session required when `x-course-id` present.  
Faculty list/detail/patch/pdf/settings: `x-instructor-id` is enough if `x-course-id` is omitted.  
Student PDF/brief: query id is enough.

---

## Student Authorization

Student cookie cannot call faculty list (**401**). Faculty cookie cannot call student list (**401**). Student cannot PATCH faculty actions through the student route (withdraw only). PASS for role isolation on session-bound routes.

---

## Cross-Student Isolation

Alex + Jordan `studentId` on list → **403**. Jordan query PDF on Alex’s id 17 → **404**. Anyone who knows Alex’s roster/db id can hit PDF/brief without a session (RL2/RL3).

---

## Course / Section Isolation

Faculty cookie + course `1` list **403** (because both headers trigger `requireInstructorCourse`). Instructor-only list is **all letters for instructor 15**, not the selected course (by design in comments). Create binds session to selected course.

---

## Membership Enforcement

Unlocked. N/A beyond intended Free.

---

## Security

CRITICAL: header-only instructor read/write. CRITICAL: unauth student PDF/brief. Faculty letter body returned on instructor-only GET. Do not log letter text.

---

## Assessment Security

N/A.

---

## Cora Security

No mobile tools. Faculty `recommendation.send` denied. Student denied `read_confidential_faculty_letter`. Tool-level enforcement **UNVERIFIED** (no implementations).

---

## Database Integrity

Id 17 inserted `requested`, patched to `info_requested` via header-only, deleted. Direct SQL **UNVERIFIED**.

---

## Files / Documents

PDF routes generate letterhead from `final_letter_text`. Student PDF client sends only `x-student-id`. Faculty PDF client sends only instructor headers.

---

## Notifications

`useNotificationModuleRefresh("recommendations")`. Student notify “download PDF” has no enrolled-student download UI (RL4).

---

## Mobile UX

Faculty: native tabs, dock search, workspace sheet. Student: tabbed list + form; no detail. Light/dark **UNVERIFIED**.

---

## Theme

`NATIVE` + recommendations theme. Status uses icon + label on faculty filters.

---

## Accessibility

Create trailing action labeled. Student cards have no button role. Full pass **UNVERIFIED**.

---

## Errors / Loading / Empty States

Faculty load/refresh banner. Create 400 deadline surfaces if the API returns it. Student list error banner. Empty copy present.

---

## Performance

Letter list is ScrollView. Guest inbox n=10 fine.

---

## Web / Mobile Integration

Web path mapped. Web workspace parity **UNVERIFIED**.

---

## Faculty → Student Integration

Executed: faculty cookie create id 17 → Alex cookie list contains 17 → detail 200 `info_requested`. Delete removed it. Student cannot open or download the letter in the Expo student module.

---

## Tests

`audit-recommendations-production.mjs` is dishonest (`expectDenied` passes 200/400/404/405). No Expo contract tests for recommendation auth.

---

## End-to-End Results

| Step | Result |
|------|--------|
| Faculty cookie list | 200 n=0 |
| Faculty cookie create no deadline | 400 Deadline is required |
| Faculty cookie create + deadline | 200 id 17 |
| Alex list / detail | 200 has 17 |
| Instructor-only GET/PATCH 17 | 200 / 200 |
| Unauth student PDF 17 | 403 delivery mode |
| Unauth brief 17 | 200 |
| Faculty DELETE 17 | 200 |
| Simulator | UNVERIFIED |

---

## Security Attack Results

| Probe | Result |
|-------|--------|
| Unauth faculty GET/POST | 401 |
| Header both course+instructor | 401 |
| Header instructor-only list | **200** |
| Header instructor-only GET 17 | **200** name+email |
| Header instructor-only PATCH 17 | **200** mutated |
| Header instructor-only PDF 17 | **400** (auth passed) |
| Header-only student list/create | 401 |
| Unauth PDF query studentId | **403** (auth passed) |
| Unauth brief | **200** |
| Alex + Jordan list | 403 |
| Course 1 faculty cookie | 403 |
| Cross-role cookies | 401 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| **RL1** | CRITICAL | Faculty backend | **Locally repaired** (v0 undeployed). GET/PATCH/DELETE/AI/PDF/settings **and settings/upload** now call `requireInstructorSession` first and use `session.instructorId`. POST create unchanged. Production still leaked on instructor-only GET/PATCH id 17. | Live 200/200; local `requireInstructorSession` + `session.instructorId` | `v0-coursecollabv3/app/api/instructor/recommendations/**` | Deploy v0. Never authorize from the header alone. |
| **RL2** | CRITICAL | Student PDF | **Locally repaired** (v0 undeployed). PDF binds `requireBoundStudentCaller` then `bound.studentDbId`. Sibling student routes (request-details/generate/upload/submit-letter/select-draft/mark-downloaded/polish/letter-metadata/intake) now bind the same helper. Production unauth id 17 still 403 delivery-mode. | live 403; local `requireBoundStudentCaller` | `v0-coursecollabv3/app/api/student/recommendations/**` | Deploy v0. Header/query-only must become 401. |
| **RL3** | CRITICAL | Brief | **Locally repaired** (v0 undeployed). Brief GET/PATCH/POST bind `requireBoundStudentCaller`. Guest client uses `studentApi` + `guestAsStudentSession` (session-proof). Production unauth still 200 `{brief:null}`. | live 200; local bind + `studentApi.getRecommendationBrief` | brief route + `guest-api.ts` | Deploy v0. |
| **RL4** | HIGH | Student UX | **Locally repaired.** Enrolled cards press to `/recommendations/[id]`. Withdraw uses session-proof `DELETE`. Notification/`?request=` deep links open enrolled detail. Guest workspace maps questionnaire/letter/download/cancel to real sibling routes (not invented PATCH actions). Guest `/recommendation/[id]` unchanged. | RequestCard `onPress`; `student-api` dispatcher; `notification-link.ts` | student screen + guest detail + student-api | Keep guest route separate. |
| **RL5** | HIGH | Clients | **Locally repaired.** PDF builders are async and use `studentAuthenticatedHeaders` / `instructorAuthenticatedHeaders`. | `recommendation-letter-url.ts` | same | Do not restore header-only PDF objects. |
| **RL6** | HIGH | Tests | **Locally repaired.** Honest script: 200/201/500/404 fail for unauth/header-only including instructor-only. Cookie `AUDIT-DELETE` + deadline + DELETE in `finally`. | `expectAuthRejected`; `AUDIT-DELETE` | `audit-recommendations-production.mjs` | Run after v0 deploy. |
| **RL7** | MEDIUM | Faculty UX | **Locally repaired.** Empty deadline `setError("Deadline is required.")` and blocks POST. | modal submit guard | `FacultyRecommendationCreateModal.tsx` | Keep required before submit. |
| **RL8** | MEDIUM | Tests | **Locally repaired.** `recommendations-auth.contract.test.ts` wired into `package.json` `test`. | contract file | `expo/src/lib/recommendations-auth.contract.test.ts` | Keep on `instructorRequest` / `studentRequest`. |
| **RL9** | LOW | Performance | Letter list is ScrollView. | hub L199 | optional | FlashList if volume grows. |
| **RL10** | LOW | Guest inbox | Guest approve shares directory account-request routes. Already session-gated when course headers present. | guest panel | — | Keep; do not weaken. |

Prior F-001/F-002 student list/create session bind is **live** (header-only 401). Do not re-fix those. Faculty Expo `instructorRequest` is already fail-closed. Do not invent a third faculty client.

---

## Required Before Ship

1. RL1 — instructor session on every instructor recommendation route (including no `x-course-id`).
2. RL2 — student PDF session bind.
3. RL3 — brief session bind.
4. RL4 — enrolled student can open / download / withdraw.
5. RL5 — PDF clients send session proof.
6. RL6 — honest production script.

Any unresolved CRITICAL blocks shipment.

---

## Future Improvements

Cora tools with confirm; FlashList; student notification deep link to the new detail route.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 88 |
| Routing | 62 |
| UI | 70 |
| Buttons | 58 |
| API | 45 |
| CRUD | 64 |
| Authentication | 32 |
| Authorization | 55 |
| Student Isolation | 60 |
| Course Isolation | 70 |
| Membership | 95 |
| Production Configuration | 88 |
| Data Integrity | 58 |
| Security | 28 |
| Assessment Security | N/A |
| Cora Security | N/A |
| Error Handling | 78 |
| Mobile UX | 68 |
| Performance | 80 |
| Accessibility | 70 |
| Testing | 20 |

OVERALL SCORE: 48/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE
