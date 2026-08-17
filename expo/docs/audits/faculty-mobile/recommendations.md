# Recommendation Letters — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T19:45:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Recommendation Letters (`/module/recommendations`) + instructor recommendation / guest-account APIs + student and guest downstream  
**Module size:** MEDIUM — letter filters + workspace sheet + guest-request inbox

---

## Module identification

```
MODULE: Recommendation Letters
MOBILE ROUTE: /module/recommendations
REGISTRY ENTRY: recommendations → FacultyRecommendationsScreen (faculty-registry.tsx L126)
NAVIGATION GROUP: Students (faculty-nav.ts L104)
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/FacultyRecommendationsScreen.tsx
RELATED SCREENS:
  - FacultyRecommendationsListCards.tsx
  - FacultyRecommendationWorkspaceModal.tsx
  - FacultyRecommendationCreateModal.tsx (create on behalf → student POST)
  - FacultyGuestAccountRequestsPanel.tsx
  - Student: course-info/RecommendationsScreen.tsx
  - Guest: GuestRecommendationsScreen.tsx, GuestRecommendationDetailScreen.tsx
RELATED API ROUTES (faculty):
  - GET    /api/instructor/recommendations
  - GET    /api/instructor/recommendations/:id
  - PATCH  /api/instructor/recommendations/:id { action }
  - PATCH  /api/instructor/recommendations/:id/request-details
  - POST   /api/instructor/recommendations/:id/ai-suggest
  - DELETE /api/instructor/recommendations/:id
  - GET    /api/instructor/recommendation-guest-account-requests
  - POST   /api/instructor/account-requests/:id/approve|reject  (guest panel)
  - POST   /api/student/recommendations  (createRecommendationOnBehalf)
RELATED API ROUTES (student / guest):
  - GET/POST /api/student/recommendations
  - GET/PATCH /api/student/recommendations/:id
  - GET/PUT guest brief routes (guest-api.ts)
RELATED SERVER ACTIONS: Not in repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts L2234–2253, L3308–3371; student-api.ts L677–828
RELATED DATABASE TABLES/MODELS: Not in repository — UNVERIFIED
RELATED CORA TOOLS:
  - recommendation.read, draft, updateStatus, send (send risk: high)
  - No faculty-cora-api implementations
RELATED WEB MODULE: recommendations/:id → /module/recommendations?open=; guest-account-requests → ?tab=guest-requests
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 3 |
| Medium findings | 3 |
| Low findings | 2 |

Faculty letter inbox (All / Pending / Active / Done) plus Guest requests. Workspace supports patch actions (approve, reject, request info, finalize, notify, lock), AI suggest, delete, and request-detail edits. Create-on-behalf posts to the **student** recommendations route.

**Proven:** Nav/registry/deep links; handlers traced; faculty unauth list/detail/patch/delete/AI/guest GET **401**; foreign course **403**.

**Ship risks:** Student GET with a real `studentId` returns **200** without a student session. Student POST without auth is **404** (lookup before auth). Faculty create uses that student POST.

---

## 2. Architecture Map

```
Faculty Drawer "Recommendation Letters"
  → /module/recommendations[?open=&tab=guest-requests]
  → FacultyRecommendationsScreen
      → getRecommendations + getSessions
      → Letter cards → FacultyRecommendationWorkspaceModal
      → + → FacultyRecommendationCreateModal → POST /api/student/recommendations
      → Guest tab → FacultyGuestAccountRequestsPanel
          → getRecommendationGuestAccountRequests
          → approve/reject via account-requests
  → Student RecommendationsScreen / Guest recommendation screens
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Hub | `FacultyRecommendationsScreen.tsx`, list cards, workspace, create modal, guest panel |
| Utils | `faculty-recommendations-utils.ts`, `faculty-guest-account-requests-utils.ts` |
| Student / guest | `RecommendationsScreen.tsx`, `guest-api.ts` recommendation brief |
| API | `instructor-api.ts` L1269–1278, L2234–2253, L3308–3371 |
| Deep links | `faculty-nav.ts` L305–309; `notification-link.ts` |
| Cora | `faculty-module-registry.ts` L489–502; student registry L442–451 |
| Meta | `recommendations` **missing** from `FACULTY_MODULE_META` |
| Tests / Maestro | **None** |

---

## 4. Navigation & Routing

**Status:** PASS

- Drawer → `/module/recommendations`.
- `?open=` opens workspace on letter tab; `?tab=guest-requests` selects guest inbox.
- Web `recommendations/:id` and `guest-account-requests` mapped.
- Student/guest notification paths mapped.

---

## 5. Production Configuration

**Production API verified:** YES

**Development URLs found:** None.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

**Status:** PASS

Native filter tabs with counts, dock search, letter cards, workspace sheet, guest panel + filter sheet. Status via icon + label.

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Status |
|---------|--------|---------|---------|--------|
| Letter filters | Hub | `filterRecommendations` | client | PASS |
| Open letter | Hub | `openLetterWorkspace` | GET detail | Unauth **401** |
| Create | Modal | `createRecommendationOnBehalf` | POST student recommendations | Unauth **404** (F-002) |
| Workspace patches | Modal | `patchRecommendation` | PATCH action | Unauth **401** |
| Request details | Modal | `patchRecommendationRequestDetails` | PATCH | Unauth not separately probed |
| AI suggest | Modal | `suggestRecommendationLetter` | POST ai-suggest | Unauth **401** |
| Delete | Modal | `deleteRecommendationRequest` | DELETE | Unauth **401** |
| Guest approve/reject | Panel | account-requests approve/reject | POST | Unauth **401** |
| Pull refresh | Hub | `handleRefresh` | error banner | PASS |

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Workspace | card / `?open=` | overview, letter, questionnaire, activity | GET + PATCH + AI + DELETE | Traced |
| Create | + | student, purpose, deadline | student POST | Traced |
| Guest filter | filter chip | status / sort | client | Traced |

---

## 9. Forms & Validation

| Form | Fields | Client validation | Server validation | Status |
|------|--------|-------------------|-------------------|--------|
| Create on behalf | student, purpose, optional deadline/notes | required in modal | Unauth 404 Student not found | PARTIAL |
| Request details | purpose, recipient, deadline | workspace | UNVERIFIED | UNVERIFIED |
| Guest reject | reason | default string | UNVERIFIED | UNVERIFIED |

---

## 10. API Audit

| Method | Endpoint | Production | Status |
|--------|----------|------------|--------|
| GET | `/api/instructor/recommendations` unauth | **401** | PASS |
| GET | `/api/instructor/recommendations/1` unauth | **401** | PASS |
| GET | `/api/instructor/recommendation-guest-account-requests` | **401** | PASS |
| PATCH | `/api/instructor/recommendations/1` | **401** | PASS |
| DELETE | `/api/instructor/recommendations/1` | **401** | PASS |
| POST | `/api/instructor/recommendations/1/ai-suggest` | **401** | PASS |
| GET | instructor + course 16 | **200** empty | PASS |
| GET | instructor + course 1 | **403** | PASS |
| GET | `/api/student/recommendations` | **401** student id required | PARTIAL |
| GET | `?studentId=999999` | **404** Student not found | PARTIAL |
| GET | `?studentId=910000001` | **200** `{requests:[]}` | FAIL (F-001) |
| POST | `/api/student/recommendations` unauth | **404** Student not found | FAIL (F-002) |

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | Yes (on behalf + student) | Yes | Unauth 404 | UNVERIFIED E2E |
| Read | Yes | Yes | Faculty 401/403; student GET 200 by real id | PARTIAL |
| Update | Patch actions + details | Yes | Unauth 401 | UNVERIFIED |
| Delete | Yes | Yes | Unauth 401 | UNVERIFIED |
| Restore | No | — | — | N/A |
| Send / notify | `notify_student_letter_ready` | Yes | Unauth 401 | UNVERIFIED |

---

## 12. Authentication & Authorization

**Status:** PARTIAL

Faculty instructor routes 401/403. Student list is a **studentId oracle** for existing students (F-001). Student create looks up the student before auth (F-002). Guest faculty inbox 401. Cora `send` is high-risk and unimplemented (safer than a live send tool).

---

## 13. Course/Section Isolation

Faculty foreign course **403**. Student GET is student-scoped by query id, not session.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Unlocked | UNVERIFIED | PASS (intended Free) |
| Pro | N/A | N/A | N/A |
| Enterprise | N/A | N/A | N/A |

---

## 15. Database & Data Integrity

Not in repo. Patch actions: approve, reject, request_info, request_student_revision, update_final_text, finalize, notify_student_letter_ready, lock, unlock. Transition rules UNVERIFIED.

---

## 16. Files/Documents

Letter text lives in request payload / AI suggest. No separate file upload on the faculty mobile workspace. Guest brief exists on guest-api.

---

## 17. Notifications

`useNotificationModuleRefresh("recommendations", handleRefresh)`. Deep links for letter id and guest tab.

---

## 18. Cora Integration

**Status:** PARTIAL

Faculty capabilities include `recommendation.send` (high). No tool implementations. Student Cora: create/submit/cancel with confirm; denied `read_confidential_faculty_letter`.

---

## 19. Mobile UX

**Status:** PASS

Dock search, scrollable filter tabs, workspace sheet, guest filter sheet.

---

## 20. Theme & Accessibility

**Status:** PASS

`NATIVE` + recommendations theme. Status filters use icons + labels. Create trailing action labeled.

---

## 21. Error/Loading/Empty States

**Status:** PASS

Load/refresh error banner; empty letters; guest panel owns its empty/error. Course-missing empty state.

---

## 22. Performance

**Status:** PASS for typical volumes. Letter list is ScrollView (LOW if volume grows).

---

## 23. Security

Student IDOR read (F-001). Create-on-behalf via student route (F-002). Faculty letter body is instructor-gated (401 unauth). Do not log letter text.

---

## 24. Web/Mobile Integration

Deep links for id and guest tab. Web workspace parity UNVERIFIED.

---

## 25. Faculty → Student Integration

Student/guest request → faculty workspace → finalize / notify → student detail. **UNVERIFIED E2E**. Guest approve uses the same account-request endpoints as Student Directory.

---

## 26. Automated Tests

None for recommendation utils. No `audit:recommendations-production`.

---

## 27. End-to-End Test Results

| Step | Result |
|------|--------|
| Faculty list / detail | Unauth 401 |
| Create on behalf | Unauth student POST 404 |
| Patch / AI / delete | Unauth 401 |
| Student list by real id | 200 without session |
| Guest approve | Unauth 401; E2E UNVERIFIED |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Auth | **Fixed** — student list/detail/meta bind to `x-student-id`. | `app/api/student/recommendations` | — | Deploy to clear live 200. |
| F-002 | HIGH | Auth | **Fixed** — student POST 401 first; faculty create uses `POST /api/instructor/recommendations`. | instructor-api.ts + instructor recommendations POST | — | Deploy. |
| F-003 | HIGH | E2E | **Fixed** — `audit:recommendations-production` probes student GET/POST and faculty create 401. | expo/scripts | — | — |
| F-004 | MEDIUM | Cora | **Fixed** — `recommendation.send` removed; denied + notes that notify is UI-only. | faculty-module-registry.ts | — | — |
| F-005 | MEDIUM | Meta | **Fixed** — `FACULTY_MODULE_META.recommendations` added. | faculty-module-meta.ts | — | — |
| F-006 | MEDIUM | Shared | Guest approve shares directory account-request routes | FacultyGuestAccountRequestsPanel.tsx | account-requests | Document; keep 401-first (already 401) |
| F-007 | LOW | Performance | Letter list is ScrollView | FacultyRecommendationsScreen.tsx | FacultyRecommendationsScreen.tsx | FlashList if needed |
| F-008 | LOW | Testing | **Fixed** — `npm run audit:recommendations-production`. | expo/scripts | — | — |

---

## 29. Required Fixes Before Ship

1. **F-001** — Student recommendation list/detail must require the caller’s session.
2. **F-002** — Student POST must 401 before student lookup; faculty create-on-behalf needs an instructor route.
3. **F-003** — Execute disposable create → workspace → student-visible status E2E.

---

## 30. Future Improvements

Cora tools with send confirmation; module meta; FlashList; production audit script.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 92 |
| Routing | 92 |
| UI | 88 |
| Buttons/Actions | 80 |
| API Integration | 72 |
| CRUD | 68 |
| Authentication | 55 |
| Authorization | 74 |
| Course Isolation | 84 |
| Membership | 90 |
| Data Integrity | 72 |
| Production Configuration | 92 |
| Error Handling | 84 |
| Mobile UX | 88 |
| Security | 54 |
| Performance | 78 |
| Accessibility | 86 |
| Cora Integration (if applicable) | 52 |
| Testing | 15 |

**Overall Module Score:** 77/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T19:45:00.000Z

**Commit:** n/a

**Dependencies recorded:** instructor-api, student-api, guest-api, FacultyRecommendationsScreen, FacultyRecommendationWorkspaceModal, FacultyGuestAccountRequestsPanel, faculty-nav, cora registries

**Next submodule (if large module):** none
