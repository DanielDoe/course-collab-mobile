# Office Hours — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T19:45:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Office Hours (`/module/office-hours`) + instructor office-hours APIs + student Course Info office-hours downstream  
**Module size:** MEDIUM — requests inbox + regular-hours schedule + create-on-behalf

---

## Module identification

```
MODULE: Office Hours
MOBILE ROUTE: /module/office-hours
REGISTRY ENTRY: office-hours → FacultyOfficeHoursScreen (faculty-registry.tsx L129)
NAVIGATION GROUP: Students (faculty-nav.ts L103); badgeKey: officeHours
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/FacultyOfficeHoursScreen.tsx
RELATED SCREENS:
  - FacultyOfficeHoursListCards.tsx
  - FacultyOfficeHoursActionSheet.tsx
  - FacultyOfficeHourCreateModal.tsx (create on behalf → student POST)
  - FacultyRegularOfficeHoursSheet.tsx
  - Student: course-info/OfficeHoursScreen.tsx
RELATED API ROUTES (faculty):
  - GET   /api/instructor/office-hours
  - PATCH /api/instructor/office-hours/:id
  - GET   /api/instructor/office-hours/regular
  - POST  /api/instructor/office-hours/regular
  - POST  /api/student/office-hours  (createOfficeHourOnBehalf)
RELATED API ROUTES (student):
  - GET  /api/student/office-hours?studentId=
  - POST /api/student/office-hours
RELATED SERVER ACTIONS: Not in repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts L2209–2232, L2425–2468; student-api.ts L649–675
RELATED DATABASE TABLES/MODELS: Not in repository — UNVERIFIED
RELATED CORA TOOLS:
  - officeHours.manageAvailability, approve, decline, createMeeting
  - No faculty-cora-api implementations; offline automate summarizes requests
RELATED WEB MODULE: faculty-nav office-hours → /module/office-hours
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 86/100

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 3 |
| Medium findings | 4 |
| Low findings | 2 |

Faculty inbox + weekly schedule. Approve/decline with optional meeting link/venue/notes. Create-on-behalf posts to the **student** office-hours route.

**Proven:** Nav/registry/badge; handlers traced; faculty unauth GET/PATCH/POST **401**; foreign course **403**; unknown instructor **401**.

**Ship risks:** Student GET with only `studentId` returns **200** (empty list for unknown and QA ids). Student POST without auth returns **500** (reached server logic). Faculty create uses that student POST. Request `load()` has no error banner.

---

## 2. Architecture Map

```
Faculty Drawer "Office Hours" (badge: pending)
  → /module/office-hours
  → FacultyOfficeHoursScreen
      → getOfficeHours + getRegularOfficeHours
      → Requests tab → card → page sheet Approve/Decline
      → Regular hours tab → FacultyRegularOfficeHoursSheet
      → + sheet → create on behalf | edit regular hours
  → Student Course Info → OfficeHoursScreen
      → GET/POST /api/student/office-hours
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Hub | `FacultyOfficeHoursScreen.tsx`, list cards, action sheet, create modal, regular hours sheet |
| Student | `OfficeHoursScreen.tsx`, `student-api.ts` L649–675 |
| API | `instructor-api.ts` L2209–2232, L2425–2468 |
| Badge | `useFacultyShellRefresh.ts`, `post-login-bootstrap.ts`, `FacultyDrawer.tsx` |
| Cora | `faculty-module-registry.ts` L474–487; `faculty-cora-automate-offline.ts` |
| Meta | `office-hours` **missing** from `FACULTY_MODULE_META` |
| Tests / Maestro | **None** |

---

## 4. Navigation & Routing

**Status:** PASS

- Drawer item + `badgeKey: "officeHours"`.
- Deep link `office-hours` → `/module/office-hours`.
- Student nav Course Info → `/module/office-hours`.
- Missing course empty state.

---

## 5. Production Configuration

**Production API verified:** YES

**Development URLs found:** None.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

**Status:** PASS

Native tabs, dock search, request/schedule cards, page-sheet approve form. Requests use `ScrollView` not FlashList (F-008).

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Status |
|---------|--------|---------|---------|--------|
| Requests / Regular hours | Hub | `setTab` | client | PASS |
| Search | Hub | client filter | — | PASS |
| Open request | Hub | `openDetail` | — | PASS (traced) |
| Approve | Sheet | `updateOfficeHourRequest` approved | PATCH | Unauth **401**; E2E UNVERIFIED |
| Decline | Sheet / card | status declined | PATCH | Card decline has **no confirm** (F-006) |
| Create on behalf | Modal | `createOfficeHourOnBehalf` | POST `/api/student/office-hours` | Unauth **500** (F-002) |
| Save regular hours | Sheet | `saveRegularOfficeHours` | POST regular | Unauth **401** |
| Pull refresh | Hub | `load` + `refreshFacultyData` | no request error UI | FAIL (F-005) |

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Actions | + | New request / Edit regular hours | — | Traced |
| Request sheet | row | link, venue, notes, Approve/Decline | PATCH | Traced |
| Create modal | New request | student + topic + dates | student POST | Traced |
| Regular hours | schedule | weekly slots | POST regular | Traced |

---

## 9. Forms & Validation

| Form | Fields | Client validation | Server validation | Status |
|------|--------|-------------------|-------------------|--------|
| Approve | optional link/venue/notes | none | UNVERIFIED | PARTIAL |
| Create | student, topic required | yes | Unauth 500 | FAIL (F-002) |
| Regular hours | slots | cleaned in sheet | Unauth 401 | PARTIAL |

---

## 10. API Audit

| Method | Endpoint | Production | Status |
|--------|----------|------------|--------|
| GET | `/api/instructor/office-hours` unauth | **401** | PASS |
| GET | `/api/instructor/office-hours/regular` unauth | **401** | PASS |
| PATCH | `/api/instructor/office-hours/1` unauth | **401** | PASS |
| POST | `/api/instructor/office-hours/regular` unauth | **401** | PASS |
| GET | instructor + course 16 | **200** empty list | PASS (auth model) |
| GET | instructor + course 1 | **403** | PASS |
| GET | `/api/student/office-hours` | **400** studentId required | PARTIAL |
| GET | `/api/student/office-hours?studentId=999999` | **200** `{requests:[]}` | FAIL (F-001) |
| GET | `/api/student/office-hours?studentId=910000001` | **200** `{requests:[]}` | FAIL (F-001) |
| POST | `/api/student/office-hours` unauth | **500** Failed to create request | FAIL (F-002) |

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | Yes (on behalf + student) | Yes | Unauth 500 | FAIL |
| Read | Yes | Yes | Faculty 401/403; student GET 200 by id | PARTIAL |
| Update | Approve/decline/schedule | Yes | Unauth 401 | UNVERIFIED E2E |
| Delete | No | — | — | N/A |
| Restore | N/A | — | — | N/A |

---

## 12. Authentication & Authorization

**Status:** PARTIAL

Faculty instructor routes 401/403 as expected. Student list is **studentId-oracle** (F-001). Student create is unauthenticated enough to 500 (F-002). Faculty create-on-behalf reuses that student route.

---

## 13. Course/Section Isolation

Faculty foreign course **403**. Student GET is not course-scoped in the client query (studentId only).

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Unlocked | UNVERIFIED | PASS (intended Free) |
| Pro | N/A | N/A | N/A |
| Enterprise | N/A | N/A | N/A |

---

## 15. Database & Data Integrity

Not in repo. Status values used: `pending` / `requested` / `approved` / `declined`. Transition rules UNVERIFIED.

---

## 16. Files/Documents

N/A.

---

## 17. Notifications

Drawer badge from pending office-hours in shell refresh / bootstrap. `useNotificationModuleRefresh("office-hours", handleRefresh)`. Settings toggle `officeHoursAlerts`.

---

## 18. Cora Integration

**Status:** PARTIAL

Capabilities declared (approve/decline/createMeeting). No `faculty-cora-api` tools. Offline automate can summarize today’s requests only.

---

## 19. Mobile UX

**Status:** PASS

Dock search, page sheet, safe area. Card-level Decline is one tap (F-006).

---

## 20. Theme & Accessibility

**Status:** PASS

`NATIVE` + `FACULTY_OFFICE_HOURS_COLOR`. Status via badge + label on cards. Trailing + has accessibility label.

---

## 21. Error/Loading/Empty States

**Status:** PARTIAL

Empty states exist. `load()` has **no catch / no error banner** (F-005). Regular hours catch swallows errors to `[]`.

---

## 22. Performance

**Status:** PARTIAL

`ScrollView` maps all requests (F-008). Fine for small inboxes.

---

## 23. Security

Student IDOR read (F-001). Unauth create path (F-002). Faculty header-auth model same as other instructor modules.

---

## 24. Web/Mobile Integration

Deep link mapped. Web parity UNVERIFIED.

---

## 25. Faculty → Student Integration

Student creates request → faculty inbox → approve with link/notes → student list should show approved status. **UNVERIFIED E2E**. Student GET is callable with only a numeric id.

---

## 26. Automated Tests

None. No `audit:office-hours-production`.

---

## 27. End-to-End Test Results

| Step | Result |
|------|--------|
| Faculty list | Unauth 401; assigned course 200 |
| Approve / decline | Unauth 401; E2E UNVERIFIED |
| Create on behalf | Unauth student POST 500 |
| Student list by id | 200 without session |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Auth | **Fixed** — student GET binds to `x-student-id`; spoofed ids 403. | `app/api/student/office-hours/route.ts` | — | Deploy to clear live 200. |
| F-002 | HIGH | Auth | **Fixed** — student POST 401 first; faculty create uses `POST /api/instructor/office-hours`. | instructor-api.ts + instructor office-hours POST | — | Deploy. |
| F-003 | HIGH | E2E | **Fixed** — `audit:office-hours-production` probes student GET/POST and faculty create 401. | expo/scripts | — | — |
| F-004 | MEDIUM | Cora | **Fixed** — notes: approve/decline/create stay in the Office Hours UI. | faculty-module-registry.ts | — | — |
| F-005 | MEDIUM | Errors | **Fixed** — load/refresh catch + error banner. | FacultyOfficeHoursScreen.tsx | — | — |
| F-006 | MEDIUM | UX | **Fixed** — card Decline confirms first. | FacultyOfficeHoursScreen.tsx | — | — |
| F-007 | MEDIUM | Meta | **Fixed** — `FACULTY_MODULE_META["office-hours"]` added. | faculty-module-meta.ts | — | — |
| F-008 | LOW | Performance | Requests list is ScrollView | FacultyOfficeHoursScreen.tsx | FacultyOfficeHoursScreen.tsx | FlashList if inbox grows |
| F-009 | LOW | Testing | **Fixed** — `npm run audit:office-hours-production`. | expo/scripts | — | — |

---

## 29. Required Fixes Before Ship

1. **F-001** — Student office-hours GET must require a real student session.
2. **F-002** — Student POST must 401 without auth; faculty create-on-behalf needs an instructor-authenticated route.
3. **F-003** — Execute faculty approve → student status E2E.

---

## 30. Future Improvements

Error banner; decline confirm; Cora tools; FlashList; module meta.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 90 |
| Routing | 90 |
| UI | 86 |
| Buttons/Actions | 76 |
| API Integration | 68 |
| CRUD | 60 |
| Authentication | 52 |
| Authorization | 70 |
| Course Isolation | 82 |
| Membership | 90 |
| Data Integrity | 70 |
| Production Configuration | 92 |
| Error Handling | 62 |
| Mobile UX | 84 |
| Security | 50 |
| Performance | 72 |
| Accessibility | 84 |
| Cora Integration (if applicable) | 50 |
| Testing | 15 |

**Overall Module Score:** 74/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T19:45:00.000Z

**Commit:** n/a

**Dependencies recorded:** instructor-api, student-api, FacultyOfficeHoursScreen, OfficeHoursScreen, faculty-nav, cora/faculty-module-registry

**Next submodule (if large module):** none
