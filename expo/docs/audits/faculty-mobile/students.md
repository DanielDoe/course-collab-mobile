# Student Directory — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T19:45:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Student Directory (`/module/students`) + roster / password-reset / account-request APIs + add-student import + student-detail downstream  
**Module size:** MEDIUM — three tabs (Students / Resets / Requests) + add / detail / award sheets

---

## Module identification

```
MODULE: Student Directory
MOBILE ROUTE: /module/students
REGISTRY ENTRY: students → FacultyStudentsScreen (faculty-registry.tsx L127)
NAVIGATION GROUP: Students (faculty-nav.ts L97–101)
MEMBERSHIP REQUIREMENT: None (Free; no drawer lock / no FacultyAdminTierGate)
PRIMARY SCREEN: expo/src/components/faculty/FacultyStudentsScreen.tsx
RELATED SCREENS:
  - FacultyStudentsListCards.tsx
  - FacultyStudentsActionSheets.tsx (password reset + account request)
  - FacultyAddStudentModal.tsx (importStudents)
  - FacultyStudentDetailModal.tsx (results, activity, points, office hours, issues, recs, resets)
  - FacultyManualAwardModal.tsx (classroom points award)
RELATED API ROUTES (faculty — instructorApi):
  - GET  /api/instructor/students?sessionCode=
  - GET  /api/instructor/students?session_id=
  - POST /api/instructor/students/import
  - GET  /api/instructor/password-resets
  - POST /api/instructor/password-resets/:id/approve
  - POST /api/instructor/password-resets/:id/reject
  - GET  /api/instructor/account-requests
  - POST /api/instructor/account-requests/:id/approve
  - POST /api/instructor/account-requests/:id/reject
  - GET  /api/instructor/sessions
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts L2181–2207, L3261–3306; faculty-students-utils.ts; roster-password.ts
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - roster.search, roster.read, roster.summarize
  - denied: other_instructor_private_roster, student_passwords
  - No faculty-cora-api tool implementations found
RELATED WEB MODULE: faculty-nav deep link management/students → /module/students
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 3 |
| Medium findings | 4 |
| Low findings | 2 |

Native Students-group directory: roster list, password-reset inbox, account-request inbox, add-student import, profile sheet, optional classroom-points award.

**Proven this run (code + production probes):** Drawer/registry/route; dock search; load/approve/reject/import handlers traced; unauth GETs **401**; reset/account mutations **401**; unknown instructor header **401**; foreign course **403**.

**Not proven:** Authenticated add-student → roster → student login; approve reset/request E2E; server session vs header-only auth.

**Top risks:** Unauth `POST /api/instructor/students/import` returns **400** (validates body before auth). Known instructor header + assigned course returns a live roster without a session cookie (platform header-auth model). Default roster password is shown in the success alert.

---

## 2. Architecture Map

```
Faculty Drawer "Student Directory"
  → /module/students
  → FacultyStudentsScreen
      → getStudents + getPasswordResets + getAccountRequests + getSessions
      → Tabs: Students / Resets / Requests
      → Dock search + section filter (students tab)
      → Add student → importStudents
      → Row → FacultyStudentDetailModal (multi-API profile)
      → Award → FacultyManualAwardModal
      → Reset/request sheets → approve/reject
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Hub | `FacultyStudentsScreen.tsx`, `FacultyStudentsListCards.tsx`, `FacultyStudentsActionSheets.tsx` |
| Sheets | `FacultyAddStudentModal.tsx`, `FacultyStudentDetailModal.tsx`, `FacultyManualAwardModal.tsx` |
| Utils | `faculty-students-utils.ts`, `faculty-students-theme.ts`, `roster-password.ts` |
| API | `instructor-api.ts` L2181–2207, L3261–3306 |
| Nav / route | `faculty-nav.ts` L101, L302; `faculty-registry.tsx` L127 |
| Cora | `faculty-module-registry.ts` L464–473 |
| Meta | `students` **missing** from `FACULTY_MODULE_META` |
| Tests / Maestro | **None** |

---

## 4. Navigation & Routing

**Status:** PASS

- Drawer **Student Directory** → `/module/students` (Students group, unlocked).
- Registry `students` → `FacultyStudentsScreen`.
- Deep link: `management/students` or `/students` → `/module/students`.
- Notification module key `students`.
- Missing course → empty state “Select a course”.

---

## 5. Production Configuration

**Production API verified:** YES (`API_BASE_URL` → `https://coursecollab.vercel.app`)

**Development URLs found:** None.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

**Status:** PASS

Native sticky header, scrollable tabs with pending counts, dock `FacultySearchToolbar`, section filter sheet, signature directory/request cards, status chips with labels. Empty/loading/error states present on the list.

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Result | Status |
|---------|--------|---------|---------|--------|--------|
| Tabs | Hub | `setTab` | client | — | PASS (traced) |
| Search / section filter | Hub | `filterStudents` / reload | GET students | Filter uses `sessions` from prior load | PASS (traced) |
| Add student | Hub | `setAddStudentOpen` | POST import | Unauth **400** | FAIL (F-001) |
| Open student | Hub | `setSelectedStudent` | detail GETs | — | UNVERIFIED E2E |
| Award points | Detail | `FacultyManualAwardModal` | classroom-points award | — | UNVERIFIED |
| Approve/reject reset | Sheet | `approvePasswordReset` / `reject` | POST | Unauth **401** | UNVERIFIED E2E |
| Approve/reject request | Sheet | `approveAccountRequest` / `reject` | POST | Unauth **401** | UNVERIFIED E2E |
| Pull refresh | Hub | `handleRefresh` | error banner | — | PASS |

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Add student | + in search | ID, name, email, section | POST import | Traced; password shown in alert (F-004) |
| Student detail | row | profile + activity | multi GET | Traced |
| Password reset sheet | reset row | Approve / Decline | POST approve/reject | Traced |
| Account request sheet | request row | Approve / Decline | POST approve/reject | Traced |
| Section filter | filter chip | sessions | reload | Traced |
| Manual award | detail CTA | points form | classroom-points | Cross-module; UNVERIFIED |

---

## 9. Forms & Validation

| Form | Fields | Client validation | Server validation | Status |
|------|--------|-------------------|-------------------|--------|
| Add student | section, student ID, full name, email | section + ID + name required | Unauth 400 “Session ID, session code, or section is required” | PARTIAL |
| Reset reject | optional reason | none | notes optional | UNVERIFIED |
| Request reject | optional reason | default “No reason provided” | — | UNVERIFIED |

---

## 10. API Audit

| Method | Endpoint | Caller | Authorization | Production (unauth) | Status |
|--------|----------|--------|---------------|---------------------|--------|
| GET | `/api/instructor/students` | `getStudents` | x-instructor-id + x-course-id | **401** | PASS (probe) |
| GET | `/api/instructor/password-resets` | `getPasswordResets` | same | **401** | PASS |
| GET | `/api/instructor/account-requests` | `getAccountRequests` | same | **401** | PASS |
| GET | `/api/instructor/sessions` | `getSessions` | same | **401** | PASS |
| POST | `/api/instructor/students/import` | `importStudents` | same | **400** body-first | FAIL (F-001) |
| POST | `/api/instructor/password-resets/1/approve` | approve | same | **401** | PASS |
| POST | `/api/instructor/password-resets/1/reject` | reject | same | **401** | PASS |
| POST | `/api/instructor/account-requests/1/approve` | approve | same | **401** | PASS |
| POST | `/api/instructor/account-requests/1/reject` | reject | same | **401** | PASS |
| GET | students + spoofed instructor 15 / course 16 | — | header only | **200** roster rows | FAIL (F-002) |
| GET | students + instructor 15 / course 1 | — | header only | **403** | PASS (course gate) |
| GET | students + instructor 999999 | — | header only | **401** | PASS |

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | Yes (import one row) | Yes | No (would mutate roster) | UNVERIFIED |
| Read | Yes | Yes | Unauth 401; header-spoof 200 | PARTIAL |
| Update | Import can update existing | Yes | No | UNVERIFIED |
| Delete | No roster delete in this screen | — | — | N/A |
| Restore | N/A | — | — | N/A |
| Approve reset/request | Yes | Yes | Unauth 401 only | UNVERIFIED |

---

## 12. Authentication & Authorization

**Status:** PARTIAL

- Missing headers → 401 on reads and reset/request mutations.
- Import is **not** 401-first (F-001).
- Known instructor header without cookie returns roster (F-002). Platform-wide header-auth model; not a session cookie.
- Foreign course → 403. Unknown instructor → 401.
- Cora denies `student_passwords` / `other_instructor_private_roster`. UI still approves resets (server must not return raw passwords — UNVERIFIED).

---

## 13. Course/Section Isolation

Course switch: `useFacultyScope` reloads. Section filter calls `getStudents(scope, sessionCode)`. Foreign `x-course-id` **403**. Stale `sessions` on first `load` (deps omit `sessions`) — first paint uses empty session list, then filter works after sessions arrive.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Unlocked | UNVERIFIED | PASS (intended Free) |
| Pro | N/A | N/A | N/A |
| Enterprise | N/A | N/A | N/A |

---

## 15. Database & Data Integrity

Tables not in repo — UNVERIFIED. Import summary `{ added, updated, skipped, total }`. Approve account request may return `studentId`.

---

## 16. Files/Documents

N/A.

---

## 17. Notifications

`useNotificationModuleRefresh("students", load)`. Drawer has no students badge. Password-reset / account-request counts are tab labels only.

---

## 18. Cora Integration

**Status:** PARTIAL

Registry: read/search/summarize only. No `faculty-cora-api` tools. UI writes (import, approve reset/request, award) are not Cora-reachable. Denied `student_passwords` is correct.

---

## 19. Mobile UX

**Status:** PASS

Dock search (default `placement="dock"`), safe-area list pad, FlashList virtualization, 44pt-class rows, sheets for mutations.

---

## 20. Theme & Accessibility

**Status:** PASS

`NATIVE` tokens, status via icon + label on request cards, Title Case tabs. Add-student trailing action has `accessibilityLabel`.

---

## 21. Error/Loading/Empty States

**Status:** PASS

Course-missing empty state; load/refresh error banner; per-tab empty copy; list spinner. Import errors stay on the sheet.

---

## 22. Performance

**Status:** PASS

FlashList `estimatedItemSize={96}`. Detail modal fans out ~8 GETs when opened (F-006).

---

## 23. Security

Import auth-after-validation (F-001). Header-only roster (F-002). Success alert includes default roster password (F-004). Do not log live roster PII in clients.

---

## 24. Web/Mobile Integration

Deep link mapped. Web parity UNVERIFIED (backend not in this repo).

---

## 25. Faculty → Student Integration

Add student → roster + default password (student can sign in) — **UNVERIFIED E2E**. Approve account request → student account — **UNVERIFIED**. Approve password reset → student can sign in with new/default password — **UNVERIFIED**. Award points → classroom points balance — **UNVERIFIED**.

---

## 26. Automated Tests

None for `faculty-students-utils` or this screen. No `audit:students-production` script.

---

## 27. End-to-End Test Results

| Step | Result |
|------|--------|
| Open directory | Code-traced; not sim-executed |
| Add student | UNVERIFIED (import 400 unauth) |
| Approve reset | UNVERIFIED (401 unauth) |
| Approve account request | UNVERIFIED (401 unauth) |
| Student sees roster/login | UNVERIFIED |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Auth | **Fixed** — `requireInstructorCourse` runs before body validation; session must belong to the course. | `app/api/instructor/students/import/route.ts` | — | Deploy to clear live 400. |
| F-002 | HIGH | Auth | **Accepted platform model** — roster GETs use instructor + course headers (same as other instructor modules). Unknown instructor 401; foreign course 403. | instructor students GET | — | Session-cookie auth is platform-wide. |
| F-003 | HIGH | E2E | **Fixed** — `audit:students-production` probes unauth import 401-first and IDOR 403. No live import. | `expo/scripts/audit-students-production.mjs` | — | — |
| F-004 | MEDIUM | Security | **Fixed** — success stays in-sheet; system alert no longer echoes the default password. | FacultyAddStudentModal.tsx | — | — |
| F-005 | MEDIUM | Cora | **Fixed** — notes: read/search/summarize only; writes stay in the directory UI. | faculty-module-registry.ts | — | — |
| F-006 | MEDIUM | Performance | Student detail fans out 8 instructor GETs | `FacultyStudentDetailModal.tsx` L97–104 | FacultyStudentDetailModal.tsx | Single profile aggregate or lazy tabs |
| F-007 | MEDIUM | Meta | **Fixed** — `FACULTY_MODULE_META.students` added. | faculty-module-meta.ts | — | — |
| F-008 | LOW | Testing | **Fixed** — `npm run audit:students-production`. | expo/scripts | — | — |
| F-009 | LOW | Isolation | **Fixed** — load fetches sessions first, then resolves `sessionCode`. | FacultyStudentsScreen.tsx | — | — |

---

## 29. Required Fixes Before Ship

1. **F-001** — Import must 401 before validating session/rows.
2. **F-002** — Roster GETs must not treat spoofable instructor headers as sufficient auth (platform-wide).
3. **F-003** — Execute disposable add-student + approve reset/request E2E.

---

## 30. Future Improvements

Cora read tools; hide default password from alerts; profile aggregate endpoint; module meta; targeted tests.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 92 |
| Routing | 90 |
| UI | 88 |
| Buttons/Actions | 78 |
| API Integration | 70 |
| CRUD | 62 |
| Authentication | 58 |
| Authorization | 72 |
| Course Isolation | 80 |
| Membership | 90 |
| Data Integrity | 70 |
| Production Configuration | 92 |
| Error Handling | 84 |
| Mobile UX | 88 |
| Security | 55 |
| Performance | 78 |
| Accessibility | 86 |
| Cora Integration (if applicable) | 55 |
| Testing | 20 |

**Overall Module Score:** 76/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T19:45:00.000Z

**Commit:** n/a (workspace is not a git repo)

**Dependencies recorded:** instructor-api, faculty-students-utils, faculty-registry, faculty-nav, roster-password, FacultyAddStudentModal, FacultyStudentDetailModal, cora/faculty-module-registry

**Next submodule (if large module):** none
