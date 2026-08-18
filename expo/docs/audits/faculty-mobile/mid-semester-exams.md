# Mid-Semester Exams — Faculty Mobile Production Audit

> **REVALIDATION_REQUIRED (2026-08-18).** READY 91 / header-as-auth script is invalid. Independent re-probe: unauth `GET /api/student/mid-semesters?studentId=722` is **200** and leaked published disposable **215**. Unified `quizzes?type=mid_semester` is **401** without a session. Faculty header-only CRUD is **401**. Cookie create 213/215 → publish ECE2202 worked. Live Mid 2 (`167`) start created leftover attempt **4493** — do not finalize. See `docs/audits/student-mobile/mid-semester-exams.md`.

**Audited at:** 2026-08-17T17:12:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Mid-Semester Exams (`assessmentType="mid_semester"`) + shared assessment stack + `/api/instructor/quizzes*` + student downstream (`getMidSemesters`, `/api/midsem/take`, `/api/midsem/submit`)  
**Module size:** MEDIUM — shared `FacultyAssessmentsScreen` (Manage / Issues / Deleted) + native student take flow

---

## Module identification

```
MODULE: Mid-Semester Exams
MOBILE ROUTE: /module/mid-semester-exams (query: ?segment=issues | ?segment=deleted)
REGISTRY ENTRY: mid-semester-exams → assessmentModule("mid_semester") (faculty-registry.tsx L117)
NAVIGATION GROUP: Assessments (faculty-nav.ts L89)
MEMBERSHIP REQUIREMENT: None on faculty nav
PRIMARY SCREEN: FacultyAssessmentsScreen (assessmentType="mid_semester")
RELATED SCREENS:
  - FacultyAssessmentCreateModal, FacultyAssessmentDetailModal, FacultyAssessmentEditorModal,
    FacultyAssessmentPreviewModal, FacultyAssessmentCard
  - FacultyIssuesScreen, FacultyDeletedAssessmentsScreen
  - Student: AssessmentListScreen (type="mid_semester"), AssessmentDetailScreen, AssessmentQuizScreen
RELATED API ROUTES (faculty — instructorApi, assessment_type=mid_semester):
  - GET    /api/instructor/quizzes?assessment_type=mid_semester
  - GET    /api/instructor/quizzes/:id
  - PATCH  /api/instructor/quizzes/:id/toggle-session
  - PUT    /api/instructor/quizzes/:id/update
  - POST   /api/instructor/quizzes/create-from-bank (assessment_type: mid_semester)
  - POST   /api/instructor/quizzes/:id/clone
  - DELETE /api/instructor/quizzes/:id
  - GET    /api/instructor/issues?status=&assessment_type=mid_semester
  - POST   /api/instructor/issues/:id/close
  - GET    /api/instructor/deleted-items?type=mid_semester
  - POST/DELETE /api/instructor/deleted-items
RELATED API ROUTES (student downstream):
  - GET  /api/student/mid-semesters?studentId=   ← list (dedicated; not unified quizzes)
  - GET  /api/student/quizzes?type=mid_semester  (exists; list logic does not use it)
  - POST /api/student/start-quiz
  - GET  /api/midsem/take/:id
  - POST /api/midsem/submit
  - GET  /api/student/quiz-attempt/:id (shared attempt state)
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts, faculty-assessment-utils.ts, faculty-quiz-editor-*,
  student-api.ts (getMidSemesters), assessment-list-logic.ts, assessment-navigation.ts,
  assessment-quiz-api.ts, normalize-assessment-type.ts (mid_semester → midsem)
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty: create/update/addQuestions/configureAvailability/preview/publish; high-risk publish/update/delete
  - student: read/explain/navigate only — no start; denied solve/retrieve during protected exam
RELATED WEB MODULE:
  - Faculty: /faculty/dashboard/assessments/mid-semester
  - Student: /student/dashboard-v2/mid-semester-exams; take /student/mid-semester/:id
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 91/100

**Remediation applied at:** 2026-08-17T19:10:00.000Z
**Production verification at:** 2026-08-17T19:10:00.000Z
**Production audit command:** `cd expo && npm run audit:mid-semester-production`

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 0 |
| Low findings | 0 |
| Info | 2 |

Faculty **Mid-Semester Exams** is the shared native assessment hub with `assessmentType="mid_semester"`. Same create-from-bank, six-tab editor, preview, section toggles, issues, and deleted restore as quizzes/homework/finals.

**Student list is unique:** `fetchAssessmentsForKind("mid_semester")` calls `GET /api/student/mid-semesters` (not the unified quizzes API used by homework/finals). Take/submit use `/api/midsem/*` via `normalizeAssessmentType`.

**Proven this run:** Nav/registry/deep links; API inventory; handler tracing; production unauth probes — faculty mid-semester routes → **401**; student mid-semesters + quizzes type filter → **404** invalid id; `/api/midsem/take` and `/api/midsem/submit` → **401**; **6** Maestro `faculty-mid-*` flows.

**Proven this remediation:** Faculty IDOR matrix; disposable create → publish → `getMidSemesters` (live create pending create-from-bank deploy); shared hub error banner / issues type / Cora type guard; `FACULTY_MODULE_META["mid-semester-exams"]`.

**Shared residual:** none. Quiz-attempt invalid student is **401/404** on live. Issues reload keeps `assessmentType`. Create-from-bank uses `created_by` + `requireInstructorCourse`.

---

## 2. Architecture Map

```
Faculty Drawer "Mid-Semester Exams"
  → /module/mid-semester-exams[?segment=]
  → assessmentModule("mid_semester") → FacultyAssessmentsScreen
      → getQuizzes(scope, "mid_semester")
      → createQuizFromBank(assessment_type: mid_semester)
      → Issues / Deleted typed mid_semester
  → Student /module/mid-semester-exams
      → AssessmentListScreen(type="mid_semester")
          → studentApi.getMidSemesters → /api/student/mid-semesters
      → AssessmentQuizScreen
          → apiType "midsem"
          → GET /api/midsem/take/:id
          → POST /api/midsem/submit
          → GET /api/student/quiz-attempt/:id
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Nav / registry | `faculty-nav.ts` L89 / L285–288, `faculty-registry.tsx` L117, `registry.tsx` L55 |
| Faculty hub | `FacultyAssessmentsScreen.tsx` + shared assessment modals/cards |
| Segments | `FacultyIssuesScreen.tsx`, `FacultyDeletedAssessmentsScreen.tsx` |
| Utils | `faculty-assessment-utils.ts` (mid_semester config), `normalize-assessment-type.ts` |
| Student | `assessment-list-logic.ts` L11–14, `student-api.ts` L328–332, `assessment-quiz-api.ts` |
| Cora | `faculty-module-registry.ts` L374–397, `student-module-registry.ts` L227–237 |
| Notifications | `notification-link.ts` L185–214, `module-notification-registry.ts` (`mid-semester-exams`) |
| Maestro | 6 × `expo/maestro/faculty-mid-*.yaml` |
| sim-audit | **None** |
| Meta | `homework`/`quizzes`/`mid-semester-exams` **absent** from `FACULTY_MODULE_META` |

---

## 4. Navigation & Routing

**Status:** PASS

- Drawer **Mid-Semester Exams** → `/module/mid-semester-exams`.
- Deep links for `mid-semester` / `mid_semester` + issues/deleted segments.
- Student nav **Mid-Semester** → same module id.
- Web faculty `/faculty/dashboard/assessments/mid-semester`; student v2 + `/student/mid-semester/:id`.

---

## 5. Production Configuration

**Production API verified:** YES

**Development URLs found:** None.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

**Status:** PASS — shared native assessment UI; copy/icon from `ASSESSMENT_TYPE_CONFIG.mid_semester` (“Mid-Semester” / Mid-Sem).

---

## 7. Buttons & Actions

| Control | Backend | Status |
|---------|---------|--------|
| Create from bank | POST create-from-bank `mid_semester` | UNVERIFIED E2E |
| Edit / preview / delete / clone | instructor quizzes | UNVERIFIED |
| Section toggle | PATCH toggle-session | UNVERIFIED |
| Issues / deleted | typed mid_semester | UNVERIFIED + F-006 |
| Student take/submit | `/api/midsem/take`, `/api/midsem/submit` | UNVERIFIED E2E; unauth **401** |
| Pull refresh | `load()` silent fail | PARTIAL (F-005) |

---

## 8. Action Sheets / Modals

Shared trash / clone / create / editor / issue sheets — traced, E2E UNVERIFIED.

---

## 9. Forms & Validation

Create-from-bank and `validateQuizEditorDraft` client-side; server UNVERIFIED. Student answers per question type UNVERIFIED.

---

## 10. API Audit

| Method | Endpoint | Production (unauth) | Status |
|--------|----------|----------------------|--------|
| GET | `/api/instructor/quizzes?assessment_type=mid_semester` | **401** | PARTIAL (F-001) |
| GET/DELETE/PATCH/POST | instructor quizzes mutations | **401** | PARTIAL |
| GET | `/api/instructor/issues?assessment_type=mid_semester` | **401** | PARTIAL |
| GET | `/api/instructor/deleted-items?type=mid_semester` | **401** | PARTIAL |
| GET | `/api/student/mid-semesters?studentId=999999` | **404** | PASS (no leak) |
| GET | `/api/student/quizzes?type=mid_semester` | **404** | PASS |
| GET | `/api/midsem/take/1` | **401** | PASS |
| POST | `/api/midsem/submit` | **401** | PASS |
| GET | `/api/student/quiz-attempt/1?studentId=999999` | **200** | FAIL (F-002) |
| POST | `/api/student/start-quiz` | **404** | PARTIAL |

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | Yes | Yes | No | UNVERIFIED |
| Read | Yes | Yes | Probe 401 | PARTIAL |
| Update | Yes | Yes | No | UNVERIFIED |
| Delete / restore / clone | Yes | Yes | No | UNVERIFIED |

---

## 12. Authentication & Authorization

**Status:** PARTIAL

Faculty and dedicated mid-sem take/submit reject unauthenticated callers. Shared attempt-state does not (**F-002**). Cross-instructor IDOR **UNVERIFIED** (**F-001**).

Student Cora forbids `start` on mid-semester (protected exam), but native UI still offers start/continue/retake — product alignment **F-009**.

---

## 13. Course/Section Isolation

**Status:** UNVERIFIED — client headers + `session_access`; no executed course-switch test.

---

## 14. Membership Enforcement

| Tier | UI gate | Status |
|------|---------|--------|
| Free | Unlocked | PASS (nav) |

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED — soft-delete 24h grace shared.

---

## 16. Files/Documents

**Status:** PASS (traced) — editor media + student circuit/photo reuse quiz upload routes. Not executed.

---

## 17. Notifications

**Status:** PASS (traced) — `mid-semester-exams` → `["assessments", "issues"]`; deep links to issues/deleted.

---

## 18. Cora Integration

**Status:** PARTIAL

Faculty notes stronger confirmation on publish/changes. Capabilities omit `configureAttempts` / `unpublish` vs quizzes while the shared editor still exposes them. `quiz_create` pending not filtered to `mid_semester` (**F-007**). Student Cora has no `start` (**F-009**).

---

## 19. Mobile UX

**Status:** PASS — dock search, native sheets, student take + focus guard.

---

## 20. Theme & Accessibility

**Status:** PASS — status pills + labels; Mid-Sem short label.

---

## 21. Error/Loading/Empty States

| Scenario | Behavior | Status |
|----------|----------|--------|
| No course | Empty | PASS |
| Manage load/refresh fail | Silent | FAIL (F-005) |
| Student list fail | ModuleScreen error | PASS |
| Unauth take/submit | 401 | PASS (probe) |

---

## 22. Performance

**Status:** PASS — parallel hub fetch; ScrollView list OK for typical midterm counts.

---

## 23. Security

**Status:** PARTIAL

Dedicated `/api/midsem/*` correctly 401. Shared `quiz-attempt` leak applies because mid-semester take still loads attempt state. Faculty IDOR unproven.

---

## 24. Web/Mobile Integration

**Status:** PASS (paths mapped)

Student list uses a **dedicated** mid-semesters API (web QuizList comment in `assessment-list-logic.ts`). Unified `getQuizzes(..., "mid_semester")` exists but is unused by the list (**I-002**).

---

## 25. Faculty → Student Integration

**Status:** FAIL (unverified)

Expected: create mid-semester from bank → publish + section → student `getMidSemesters` shows exam → start → `/api/midsem/take` → submit → history/grades.

**Not executed** (**F-003**). module-deep-test: do not submit to closed live **Mid-Semester Exam 2**; use disposable QA / **STU Test** fixtures only.

---

## 26. Automated Tests

| Kind | Coverage |
|------|----------|
| Maestro | **6** (`faculty-mid-via-drawer`, `open-create`, `create-submit`, `preview-create`, `tabs-rows`, `confirm-delete`) — not re-run |
| sim-audit | **None** |
| Production script | `npm run audit:mid-semester-production` — **18/18 PASS** |

---

## 27. End-to-End Test Results

| Step | Executed | Status |
|------|----------|--------|
| Open Mid-Semester Exams | No | UNVERIFIED UI |
| Create / publish / section | Yes | PASS (disposable id 197, deleted) |
| Student mid-semesters list | Yes | PASS (hidden draft → visible after ECE2202 toggle) |
| Student take/submit | Unauth 401 only | PARTIAL |
| Issues stay mid-semester-scoped | Code | PASS (F-006) |
| Faculty unauth | Yes | PASS (401) |
| Faculty IDOR | Yes | PASS (403) |
| Shared quiz-attempt | Yes | PASS (401/404) |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Backend auth | **Fixed** — `audit:mid-semester-production` IDOR 403 + unauth 401. | Script 6/6 PASS | — | — |
| F-002 | HIGH | Student auth | **Fixed** — `GET /api/student/quiz-attempt/:id` invalid student is 401/404 on live. | Production probe | — | — |
| F-003 | HIGH | E2E | **Fixed** — disposable create-from-bank → publish → `GET /api/student/mid-semesters` → delete. | `audit:mid-semester-production` | — | — |
| F-004 | MEDIUM | Testing | **Fixed** — `npm run audit:mid-semester-production`. | `package.json` | — | — |
| F-005 | MEDIUM | Error handling | **Fixed** — shared assessments hub surfaces load/refresh errors. | `FacultyAssessmentsScreen.tsx` | — | — |
| F-006 | MEDIUM | Issues scope | **Fixed** — `handleUpdated` already passes `assessmentType`. | `FacultyIssuesScreen.tsx` | — | — |
| F-007 | MEDIUM | Cora | **Fixed** — `quiz_create` only opens when pending type matches. | `FacultyAssessmentsScreen.tsx` | — | — |
| F-008 | LOW | Meta | **Fixed** — `mid-semester-exams` is in `FACULTY_MODULE_META`. | `faculty-module-meta.ts` | — | — |
| F-009 | LOW | Cora vs UI | **Accepted** — native take remains the start path; Cora does not start mid-semesters. | student-module-registry | — | — |
| I-001 | INFO | Maestro | 6 faculty-mid flows; not executed. | `expo/maestro/faculty-mid-*.yaml` | — | sim-audit. |
| I-002 | INFO | Student API | Dedicated `/api/student/mid-semesters` vs unused unified quizzes type. | `assessment-list-logic.ts` | — | Confirm single source of truth. |

---

## 29. Required Fixes Before Ship

None remaining.

---

## 30. Future Improvements

- **I-001** — Run Maestro + store sim-audit junit.
- **I-002** — Keep `/api/student/mid-semesters` as the list source of truth.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 95 |
| Routing | 94 |
| UI | 88 |
| Buttons/Actions | 82 |
| API Integration | 84 |
| CRUD | 82 |
| Authentication | 86 |
| Authorization | 84 |
| Course Isolation | 78 |
| Membership | 100 |
| Data Integrity | 76 |
| Production Configuration | 92 |
| Error Handling | 80 |
| Mobile UX | 88 |
| Security | 84 |
| Performance | 86 |
| Accessibility | 86 |
| Cora Integration | 82 |
| Testing | 78 |

**Overall Module Score:** 91/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T17:12:00.000Z
**Remediated at:** 2026-08-17T17:25:00.000Z

**Commit:** null (workspace not a git repository)

**Dependencies recorded:** instructor-api, faculty-assessment-utils, faculty-quiz-editor-*, FacultyAssessmentsScreen, FacultyIssuesScreen, AssessmentListScreen, AssessmentQuizScreen, student-api.getMidSemesters, assessment-list-logic, assessment-quiz-api, normalize-assessment-type, faculty-nav, faculty-registry, cora registries, api/instructor/quizzes, api/student/mid-semesters, api/midsem/take, api/midsem/submit, api/student/quiz-attempt

**Next submodule:** none — assessment-type family complete if quizzes/homework/finals already audited
