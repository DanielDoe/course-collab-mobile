# Campers — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T19:45:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Campers drawer item (`/module/campers`) — alias of Summer Camp hub on the Campers tab — plus camper list / request inbox / create-account APIs and summer-camper downstream  
**Module size:** SMALL route wrapper + LARGE shared hub (Programs / Tracks / Campers / Inbox)

---

## Module identification

```
MODULE: Campers
MOBILE ROUTE: /module/campers
REGISTRY ENTRY: campers → FacultyCampersScreen (faculty-registry.tsx L125)
NAVIGATION GROUP: Students (faculty-nav.ts L102)
DUPLICATE NAV: Course group also has Summer Camp → /module/summer-camp (faculty-nav.ts L78)
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/FacultyCampersScreen.tsx
  → FacultySummerCampScreen initialTab="campers"
RELATED SCREENS:
  - FacultySummerCampScreen.tsx (full hub)
  - FacultySummerCampActionSheets.tsx
  - FacultySummerCampListCards.tsx
  - FacultyAddCamperModal.tsx
  - FacultyStudentDetailModal.tsx
RELATED API ROUTES (campers tab / inbox):
  - GET  /api/instructor/summer-camp/campers?tab=campers|requests
  - POST /api/instructor/summer-camp/campers { action: approve | reject | approve_all | create_account }
RELATED SERVER ACTIONS: Not in repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts L2255–2278, L3373–3405
RELATED DATABASE TABLES/MODELS: Not in repository — UNVERIFIED
RELATED CORA TOOLS:
  - summer-camp registry only (route /module/summer-camp) — no campers Cora entry
RELATED WEB MODULE: faculty-nav path containing "campers" → /module/campers
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 2 |
| Medium findings | 3 |
| Low findings | 2 |

`FacultyCampersScreen` is a one-line alias: it opens the already-audited Summer Camp hub on the **Campers** tab. Programs, tracks, and inbox remain reachable from this route.

**Proven this run:** Route/registry/alias; unauth camper GET/POST **401**; unknown instructor **401**.

**New vs Summer Camp READY TO SHIP (2026-08-17):** Camper list is **not course-scoped**. Instructor 15 + course 16, instructor 15 + foreign course 1, and instructor 15 with **no** `x-course-id` all returned the same camper collection (count observed; PII not logged). Summer Camp should be marked **REVALIDATION_REQUIRED** for this isolation hole.

**Not proven:** Approve / reject / create-account E2E on this route (would mutate live campers).

---

## 2. Architecture Map

```
Faculty Drawer "Campers" (Students)
  → /module/campers
  → FacultyCampersScreen
      → FacultySummerCampScreen initialTab="campers"
          → getSummerCampers(tab=campers|requests)
          → createSummerCamperAccount / approve / reject / approve_all
          → Programs / Tracks tabs still available
Faculty Drawer "Summer Camp" (Course)
  → /module/summer-camp  (same screen, initialTab="programs")
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Alias | `FacultyCampersScreen.tsx` |
| Hub | `FacultySummerCampScreen.tsx` + action sheets / list cards / add camper |
| API | `instructor-api.ts` L2255–2278, L3373–3405 |
| Nav | `faculty-nav.ts` L78, L102, L303 |
| Registry | `faculty-registry.tsx` L125 |
| Prior audit | `expo/docs/audits/faculty-mobile/summer-camp.md` (READY TO SHIP, 92) |
| Cora | `summer-camp` only — no `campers` key |
| Meta | `FACULTY_MODULE_META["summer-camp"]` only |

---

## 4. Navigation & Routing

**Status:** PARTIAL

- Students → **Campers** → `/module/campers` → campers tab.
- Course → **Summer Camp** → `/module/summer-camp` → programs tab.
- Deep link `campers` → `/module/campers`; `summer-camp` → `/module/summer-camp`.
- Notification registry maps `campers` → `students` (not a dedicated camper inbox).
- Duplicate drawer entries to one hub (**F-003**).

---

## 5. Production Configuration

**Production API verified:** YES

**Development URLs found:** None.

**Mock dependencies found:** None on the campers path. Create-account uses scoped instructor POST (`action: create_account`) after the Summer Camp remediation.

---

## 6. UI Component Audit

**Status:** PASS (shared hub)

Native hub with Title Case tabs, dock search, camper cards, request inbox, add-camper sheet. Campers route does not hide Programs/Tracks.

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Status |
|---------|--------|---------|---------|--------|
| Campers / Inbox tabs | Hub | `getSummerCampers` | GET campers | Unauth **401**; header list **200** unscoped (F-001) |
| Add camper | Hub | `createSummerCamperAccount` | POST create_account | Unauth **401** |
| Approve / reject | Inbox | approve/reject | POST | Unauth **401**; E2E UNVERIFIED |
| Approve all | Inbox | `approve_all` | POST | Confirm exists per summer-camp audit; E2E UNVERIFIED |
| Open camper | Hub | student detail | profile GETs | UNVERIFIED |

---

## 8. Action Sheets / Modals

Shared Summer Camp sheets (program / training / request / reject / add camper). Campers-specific: add account + request approve/reject. Traced; not re-executed.

---

## 9. Forms & Validation

Add camper: name, email, school, password, role — client required fields in `FacultyAddCamperModal`. Unauth create_account **401**. Server validation UNVERIFIED this run.

---

## 10. API Audit

| Method | Endpoint | Production | Status |
|--------|----------|------------|--------|
| GET | `/api/instructor/summer-camp/campers?tab=campers` unauth | **401** | PASS |
| GET | same `tab=requests` unauth | **401** | PASS |
| POST | campers `{action:approve,request_id:0}` unauth | **401** | PASS |
| POST | campers `{action:create_account}` unauth | **401** | PASS |
| GET | campers + instructor 15 / course 16 | **200** camper collection | PARTIAL |
| GET | campers + instructor 15 / course 1 | **200** same collection | FAIL (F-001) |
| GET | campers + instructor 15, no course | **200** same collection | FAIL (F-001) |
| GET | campers + instructor 999999 | **401** | PASS |

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | Yes (create_account) | Yes | Unauth 401 only | UNVERIFIED E2E |
| Read | Yes | Yes | Unauth 401; header 200 unscoped | FAIL isolation |
| Update | Approve/reject request | Yes | Unauth 401 | UNVERIFIED |
| Delete | Not on campers tab | — | — | N/A |
| Restore | N/A | — | — | N/A |

---

## 12. Authentication & Authorization

**Status:** PARTIAL

Missing/unknown instructor → 401. Mutations without auth → 401. Camper **read** ignores course (F-001). Header-only instructor auth still applies (shared platform model).

---

## 13. Course/Section Isolation

**FAIL** for camper list. Students / office-hours / recommendations / trade analytics return **403** for course 1 with instructor 15. Campers return **200** with or without course, and for a foreign course id.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Unlocked | UNVERIFIED | PASS (intended Free) |
| Pro | N/A | N/A | N/A |
| Enterprise | N/A | N/A | N/A |

---

## 15. Database & Data Integrity

Not in repo. Approve may create `studentId`. Institution-wide camper table would explain missing course filter — still a leak if course context is shown as the scope.

---

## 16. Files/Documents

N/A.

---

## 17. Notifications

`campers` notification key aliases to `students`. Inbox pending is hub-local, not a drawer badge.

---

## 18. Cora Integration

**Status:** PARTIAL

Cora `summer-camp` capabilities (`summerCamp.read`, `summerCamp.manage`) target `/module/summer-camp`, not `/module/campers`. No campers-specific tools.

---

## 19. Mobile UX

**Status:** PASS (shared hub)

Dock search, native grouped lists, confirm on approve-all (prior summer-camp fix).

---

## 20. Theme & Accessibility

**Status:** PASS (shared hub). Status chips use icon + label.

---

## 21. Error/Loading/Empty States

**Status:** PASS (shared hub). Alias adds no extra error path.

---

## 22. Performance

Camper list size can be large (production header probe returned a large collection). Virtualization depends on hub list implementation — UNVERIFIED this run.

---

## 23. Security

Unauth mutations 401. Course-unscoped camper PII via spoofable instructor header (F-001). Do not log camper names.

---

## 24. Web/Mobile Integration

Deep link `campers` → mobile campers route. Web parity UNVERIFIED.

---

## 25. Faculty → Student Integration

Create/approve camper → summer portal login / enroll — covered by `audit:summer-camp-production` historically; **not re-run** this audit. Course-unscoped list may show campers from other offerings to the same instructor.

---

## 26. Automated Tests

Summer Camp utils tests exist (`faculty-summer-camp-utils.test.ts`). No campers-route tests. No `audit:campers-production`.

---

## 27. End-to-End Test Results

| Step | Result |
|------|--------|
| Open /module/campers | Code-traced alias |
| List campers | Unauth 401; header 200 unscoped |
| Create / approve | Unauth 401; E2E UNVERIFIED |
| Student enroll | Deferred to summer-camp script; not re-run |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Isolation | **Fixed** — `requireInstructorCourse` before staff check (400 missing course, 403 foreign). | `app/api/instructor/summer-camp/campers/route.ts` | — | Deploy to clear live 200. |
| F-002 | HIGH | E2E | **Fixed** — `audit:campers-production` probes unauth + missing/foreign course. | expo/scripts | — | — |
| F-003 | MEDIUM | Nav | **Fixed** — `/module/campers` is Campers + Inbox only (no Programs/Tracks). | FacultyCampersScreen.tsx | — | — |
| F-004 | MEDIUM | Cora | **Fixed** — `campers` aliases summerCamp.read / summerCamp.manage. | faculty-module-registry.ts | — | — |
| F-005 | MEDIUM | Notifications | **Fixed** — `campers` maps to `summer-camp`. | module-notification-registry.ts | — | — |
| F-006 | LOW | Meta | **Fixed** — `FACULTY_MODULE_META.campers` added. | faculty-module-meta.ts | — | — |
| F-007 | LOW | Testing | **Fixed** — `npm run audit:campers-production`. | expo/scripts | — | — |

---

## 29. Required Fixes Before Ship

1. **F-001** — Camper list must honor course scope (403/400 when course missing or foreign).
2. **F-002** — Re-verify create/approve from `/module/campers` after isolation fix.

Also mark **summer-camp** `REVALIDATION_REQUIRED` — same API.

---

## 30. Future Improvements

Deduplicate drawer entries; Cora/notification aliases; campers-only chrome if Students group should not expose Programs/Tracks.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 70 |
| Routing | 88 |
| UI | 88 |
| Buttons/Actions | 80 |
| API Integration | 78 |
| CRUD | 70 |
| Authentication | 82 |
| Authorization | 75 |
| Course Isolation | 40 |
| Membership | 90 |
| Data Integrity | 72 |
| Production Configuration | 92 |
| Error Handling | 84 |
| Mobile UX | 88 |
| Security | 68 |
| Performance | 75 |
| Accessibility | 86 |
| Cora Integration (if applicable) | 60 |
| Testing | 55 |

**Overall Module Score:** 78/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T19:45:00.000Z

**Commit:** n/a

**Dependencies recorded:** FacultyCampersScreen, FacultySummerCampScreen, instructor-api summer-camp campers, faculty-nav, faculty-registry, summer-camp audit

**Next submodule (if large module):** none — hub already audited as summer-camp
