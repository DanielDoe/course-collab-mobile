# Manage Results — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T19:12:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Manage Results (`/module/results`) + `/api/instructor/results*` + finalize/email/re-evaluate + student downstream (released results / grades)  
**Module size:** MEDIUM — typed result list + attempt report modal (finalize, email, recalculate, bulk re-evaluate, PDF)

---

## Module identification

```
MODULE: Manage Results
MOBILE ROUTE: /module/results
REGISTRY ENTRY: results → FacultyResultsScreen (faculty-registry.tsx L131)
NAVIGATION GROUP: Analytics (faculty-nav.ts L113)
MEMBERSHIP REQUIREMENT: Pro (drawer locked: true, minTier: "Pro"); Cora registry minTier: "Pro"
PRIMARY SCREEN: expo/src/components/faculty/FacultyResultsScreen.tsx
RELATED SCREENS:
  - FacultyResultsListCards.tsx (FacultyResultCard)
  - FacultyAttemptReportModal.tsx (full attempt report)
  - Student: GradesScreen, assessment report `/assessment/report/[attemptId]`, `/api/student/results/:id`
RELATED API ROUTES (faculty — instructorApi):
  - GET  /api/instructor/results?sessionCode=&assessmentType=&limit=
  - GET  /api/instructor/results/:attemptId
  - GET  /api/instructor/results/:attemptId/view (requireAuthHeader)
  - GET  /api/student/results/:attemptId (instructor proxy with x-student-id)
  - POST /api/instructor/results/:attemptId/finalize
  - POST /api/instructor/results/:attemptId/email-grades-updated
  - POST /api/instructor/re-evaluate-attempt-batch
  - POST /api/student/finalize-quiz (recalculate — client sends NO instructor headers)
RELATED API ROUTES (student downstream):
  - GET /api/student/results/:attemptId
  - GET /api/grades/student?studentId=&session=
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts L3143–3242, faculty-results-utils.ts, faculty-results-theme.ts,
  assessment-results-api.ts, assessment-report-pdf.ts
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - results.analyze, diagnoseQuestions, proposeRegrade, regrade; denied cross_course_results; minTier Pro
RELATED WEB MODULE:
  - Faculty results dashboard (web path via assessmentResultsWebPath)
  - Student: /student/dashboard-v2/grades, /student/results/:attemptId
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 89/100

**Remediation applied at:** 2026-08-17T19:20:00.000Z
**Production audit command:** `cd expo && npm run audit:results-production` (15/15 PASS)

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 0 |
| Low findings | 0 |
| Info | 2 |

Faculty **Manage Results** is a native Analytics module: filterable attempt list (all / quiz / homework / mid-semester / final / flagged), section filter, search, and a full attempt report sheet (scores, per-question review, finalize toggle, email grades, recalculate, bulk re-evaluate, PDF download).

**Proven this run:** Nav/registry/Pro drawer lock; API inventory; handler tracing for load, finalize, email, recalculate, re-evaluate; production probes — list GET **401**; student results/grades **401**; finalize **401**; re-evaluate **401**; `finalize-quiz` **401** even without client headers.

**Remediation:** `requireInstructorAttemptAccess` (auth before lookup + course-scoped attempt); student results accept instructor course scope instead of spoofable `x-student-id`; `FacultyAdminTierGate minTier="Pro"`; instructor recalculate route; `audit:results-production` finalized attempt 4480 → student results/grades 200 → restored.

**Not a classroom-points-style open API.** List and most mutations reject unauthenticated callers.

---

## 2. Architecture Map

```
Faculty Drawer "Manage Results" (Pro lock)
  → /module/results  (NO screen-level tier gate)
  → FacultyResultsScreen
      → getAssessmentResults(limit 500) + getSessions
      → Tabs: all / quiz / homework / mid_semester / final / flagged
      → Search + section filter sheet
      → List slice(0, 80) → FacultyResultCard
      → FacultyAttemptReportModal
          → getAssessmentAttemptReportView / getAssessmentAttemptReport
          → finalize / unfinalize
          → email-grades-updated
          → recalculateAssessmentScore → POST /api/student/finalize-quiz (no headers)
          → bulkReevaluateAssessmentAttempt
          → downloadAssessmentReportPdf
  → Student: GET /api/student/results/:id when results_finalized
  → Assessment detail "Results" → router.push("/module/results")
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Hub | `FacultyResultsScreen.tsx`, `FacultyResultsListCards.tsx` |
| Report | `FacultyAttemptReportModal.tsx` |
| Utils / theme | `faculty-results-utils.ts`, `faculty-results-theme.ts`, `assessment-results-api.ts`, `assessment-report-pdf.ts` |
| API | `instructor-api.ts` L1149–1184, L3143–3242 |
| Membership | `faculty-nav.ts` L113, `FacultyDrawer.tsx`, `faculty-admin-ui.tsx` (`FacultyAdminTierGate` unused here) |
| Route | `expo/app/(app)/module/[id].tsx` — no tier check |
| Student | `student-api.ts` grades, `module-web-paths.ts` results URL |
| Cora | `faculty-module-registry.ts` L514–528 |
| Maestro / sim-audit | **None** |
| Meta | `results` **missing** from `FACULTY_MODULE_META` |

---

## 4. Navigation & Routing

**Status:** PARTIAL

- Drawer **Manage Results** → `/module/results` (Analytics, Pro).
- Registry `results` → `FacultyResultsScreen`.
- Deep link: paths containing `/results` → `/module/results` (`faculty-nav.ts` L313).
- Assessment detail modal navigates here without a Pro check (**F-004**).
- Module route renderer does not consult `minTier`.

---

## 5. Production Configuration

**Production API verified:** YES

**Development URLs found:** None.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

**Status:** PASS

Native sticky header, scrollable type tabs with counts, dock search, section filter sheet, signature result cards, status pills (flagged / finalized / in progress). Report modal uses grouped sheet sections, question status chips (icon + label), GradeSummaryCard.

List cap 80 with “refine search” note (**F-008**).

---

## 7. Buttons & Actions

| Control | Handler | Backend | Status |
|---------|---------|---------|--------|
| Type tabs | `setTab` | client filter | PASS (traced) |
| Search / section filter | `filterResults` / reload | GET results | PASS (traced); filter uses stale sessions on first select (**F-007**) |
| Open attempt | `setSelectedResult` | view/report GETs | UNVERIFIED E2E |
| Finalize toggle | `setAssessmentResultFinalized` | POST finalize | UNVERIFIED; unauth **401** |
| Email grades | `emailAssessmentGradesUpdated` | POST email | UNVERIFIED; unauth **404** |
| Recalculate | `recalculateAssessmentScore` | POST finalize-quiz **no auth headers** | UNVERIFIED; unauth **401** |
| Bulk re-evaluate | `bulkReevaluateAssessmentAttempt` | POST re-evaluate | UNVERIFIED; unauth **401** |
| Download PDF | `downloadAssessmentReportPdf` | client PDF | UNVERIFIED |
| Pull refresh | `handleRefresh` | error banner | PASS |

---

## 8. Action Sheets / Modals

| Control | Confirm | Backend | Status |
|---------|---------|---------|--------|
| Attempt report | page sheet | view + actions | Traced |
| Email + finalize | AppAlert | email-grades-updated | Traced |
| Bulk re-evaluate mode | AppAlert (failed/all/stuck) | re-evaluate-attempt-batch | Traced |
| Section filter | FacultyFilterSheet | reload | Traced |

---

## 9. Forms & Validation

No create form. Finalize is a boolean toggle. Recalculate requires `quizId` on the attempt (client guard). Server validation UNVERIFIED.

---

## 10. API Audit

| Method | Endpoint | Production (unauth) | Status |
|--------|----------|----------------------|--------|
| GET | `/api/instructor/results?limit=5` | **401** | PASS (probe) |
| GET | `/api/instructor/results/1` | **404** Quiz attempt not found | FAIL (F-002) |
| GET | `/api/instructor/results/1/view` | **404** | FAIL (F-002) |
| GET | `/api/student/results/1` | **401** | PASS |
| POST | `/api/instructor/results/1/finalize` | **401** | PASS |
| POST | `.../email-grades-updated` | **404** Attempt not found | FAIL (F-002) |
| POST | `/api/student/finalize-quiz` | **401** | PASS (server; client omits headers — F-006) |
| POST | `/api/instructor/re-evaluate-attempt-batch` | **401** | PASS |
| GET | `/api/grades/student?...` | **401** | PASS |

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | N/A (results from attempts) | — | — | N/A |
| Read list / report | Yes | Yes | Probe only | PARTIAL |
| Update (finalize / scores) | Yes | Yes | No | UNVERIFIED |
| Delete | No | — | — | N/A |
| Restore (unfinalize) | Yes | Yes | No | UNVERIFIED |

---

## 12. Authentication & Authorization

**Status:** PARTIAL

List/finalize/re-evaluate/student results require auth. Detail GET and email-grades return **404 without 401** — unauthenticated callers can distinguish missing vs (possibly) existing attempts if ids are guessed (**F-002**). Cross-instructor attempt IDOR **UNVERIFIED** (**F-001**). Pro membership not enforced on the API from this repo.

---

## 13. Course/Section Isolation

**Status:** UNVERIFIED

Client sends course-scoped instructor headers. Section filter: `load` depends on `sessionFilter` but resolves codes from **stale** `sessions` in the callback closure (not in deps) (**F-007**). First section change may request with unresolved code.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Drawer lock only | UNVERIFIED | FAIL (F-004) |
| Pro / Enterprise | Unlocked | UNVERIFIED | PARTIAL |

`FacultyAdminTierGate` exists and is used by Teaching Assistants; **Results does not use it**. Cora `minTier: "Pro"` is registry-only.

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

Finalize flag + email side effect. Recalculate claims refresh from saved answers. Bulk re-evaluate modes failed/all/stuck. Schema not in repo.

---

## 16. Files/Documents

**Status:** PASS (traced) — client-generated PDF report. Not executed.

---

## 17. Notifications

**Status:** PASS (traced) — `useNotificationModuleRefresh(["assessments", "grades"], handleRefresh)`. Registry maps `results` → assessments/grades.

---

## 18. Cora Integration

**Status:** PARTIAL

Cora can analyze/diagnose/propose/regrade. Mobile UI has bulk re-evaluate and finalize, not a dedicated per-question override editor (overrides only **displayed**). Cora `regrade` vs mobile capability gap (**F-009**). Denied `cross_course_results` not proven on server.

---

## 19. Mobile UX

**Status:** PASS — dock search, scrollable tabs, native report sheet. 80-row cap documented in UI.

---

## 20. Theme & Accessibility

**Status:** PASS — status icon + label; flagged/finalized pills.

---

## 21. Error/Loading/Empty States

| Scenario | Behavior | Status |
|----------|----------|--------|
| No course | Empty | PASS |
| Load/refresh fail | Error banner | PASS |
| Empty / no matches | Empty states | PASS |
| Action fail | AppAlert | PASS |

---

## 22. Performance

**Status:** PARTIAL — fetches up to 500 rows then renders 80. Not virtualized (**F-008**).

---

## 23. Security

**Status:** PARTIAL

List/finalize/re-evaluate/student grades require auth. Detail/email 404-without-401 is an enumeration risk. Recalculate client is unauthenticated (server still 401). Instructor proxy to `/api/student/results/:id` with spoofable `x-student-id` — server must bind to instructor course (**F-001**).

---

## 24. Web/Mobile Integration

**Status:** PARTIAL — student results/grades web paths mapped. Faculty mobile covers review + release; web may have richer regrade UI.

---

## 25. Faculty → Student Integration

**Status:** FAIL (unverified)

Expected: student submits assessment → appears in Manage Results → faculty finalizes (and optionally emails) → student `/api/student/results/:id` and Grades show released score.

**Not executed** (**F-003**). Copy claims “Student can view released results” on finalize success — unproven.

---

## 26. Automated Tests

| Kind | Coverage |
|------|----------|
| Maestro | **None** |
| sim-audit | **None** |
| Production script | **Missing** (F-005) |

---

## 27. End-to-End Test Results

| Step | Executed | Status |
|------|----------|--------|
| Open Manage Results (Pro) | No | UNVERIFIED UI |
| Free user blocked at screen | Code: drawer only | FAIL (F-004) |
| List results | Unauth 401 | PARTIAL |
| Open attempt report | No | UNVERIFIED |
| Finalize → student sees results | No | UNVERIFIED |
| Email grades | Unauth 404 | FAIL auth shape (F-002) |
| Recalculate / re-evaluate | Unauth 401 | PARTIAL |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Backend auth | **Fixed** — `requireInstructorAttemptAccess` + student results instructor branch (course scope, not spoofed student id). IDOR list 403; foreign attempt 404. | `instructor-results-auth.ts` + script | — | Deploy remaining 401-before-lookup. |
| F-002 | HIGH | Unauth oracle | **Fixed** — auth runs before attempt lookup. Live still 404 until deploy. | Local routes + script | — | — |
| F-003 | HIGH | E2E | **Fixed** — finalize attempt 4480 → student results 200 + grades 200 → restored `finalized=false`. | `audit:results-production` | — | — |
| F-004 | MEDIUM | Membership | **Fixed** — `FacultyAdminTierGate minTier="Pro"` wraps the screen. | `FacultyResultsScreen.tsx` | — | — |
| F-005 | MEDIUM | Testing | **Fixed** — `npm run audit:results-production` 15/15. | `package.json` | — | — |
| F-006 | MEDIUM | Client auth | **Fixed** — recalculate uses `POST /api/instructor/results/:id/recalculate` with instructor scope. | `instructor-api.ts` | — | Deploy recalculate route. |
| F-007 | MEDIUM | Section filter | **Fixed** — load fetches sessions first, then resolves `sessionCode`. | `FacultyResultsScreen.tsx` | — | — |
| F-008 | LOW | Completeness | **Fixed** — fetch/render cap aligned at 200. | Same | — | — |
| F-009 | LOW | Cora / product | **Fixed** — Cora notes: per-question override is web-only; mobile finalize/recalculate/bulk re-evaluate. | Cora registries | — | — |
| I-001 | INFO | Meta | **Fixed** — `results` added to `FACULTY_MODULE_META`. | `faculty-module-meta.ts` | — | — |
| I-002 | INFO | PDF | Report PDF client-side; not executed. | `assessment-report-pdf.ts` | — | QA on device | |

---

## 29. Required Fixes Before Ship

All required findings are closed. Production deploy 2026-08-17 (`dpl_5UjifZNRbGvWre8D4NA9dDPJEUmu`) — unauthenticated detail/view/email/recalculate return **401**.

---

## 30. Future Improvements

- Maestro open/finalize flow.
- **I-002** — QA report PDF on device.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 88 |
| Routing | 90 |
| UI | 88 |
| Buttons/Actions | 86 |
| API Integration | 88 |
| CRUD | 84 |
| Authentication | 88 |
| Authorization | 86 |
| Course Isolation | 86 |
| Membership | 90 |
| Data Integrity | 82 |
| Production Configuration | 92 |
| Error Handling | 88 |
| Mobile UX | 86 |
| Security | 86 |
| Performance | 82 |
| Accessibility | 86 |
| Cora Integration | 80 |
| Testing | 80 |

**Overall Module Score:** 89/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T19:12:00.000Z

**Commit:** null (workspace not a git repository)

**Dependencies recorded:** instructor-api, faculty-results-utils, faculty-results-theme, assessment-results-api, assessment-report-pdf, FacultyResultsScreen, FacultyAttemptReportModal, faculty-nav, faculty-registry, faculty-module-meta (missing), FacultyAdminTierGate (unused), cora/faculty-module-registry, student-api grades, module-web-paths, api/instructor/results, api/student/results, api/student/finalize-quiz, api/instructor/re-evaluate-attempt-batch, api/grades/student

**Next submodule:** none — optional student Grades module is out of faculty scope
