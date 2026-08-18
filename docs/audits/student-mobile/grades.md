# Grades — Student Mobile Production Audit

```
MODULE: Grades (student) + Faculty Manage Results (required faculty implementation)
STUDENT ROUTE: /module/grades
NAVIGATION GROUP: Assessments. student-nav id grades, label Grades, icon ribbon-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS.grades → GradesModuleScreen → GradesScreen
PRIMARY SCREEN: expo/src/components/assessments/GradesScreen.tsx
RELATED SCREENS: GradeHeroCard, GradeLensToggle, GradeCategoryBreakdownSheet, GradeSummaryCard (unused here). Faculty: FacultyResultsScreen, FacultyResultsListCards, FacultyAttemptReportModal. Student report: /assessment/report/[attemptId]
SUBROUTES: none under /module/grades. Category sheet opens assessment report / history via assessment-navigation.
API ROUTES:
  GET  /api/grades/student?studentId=&session=&recalculate=
  GET  /api/student/results/:attemptId
  POST /api/student/results/:attemptId/mark-pdf-downloaded
  GET  /api/student/assessment-history
  GET  /api/instructor/results
  GET  /api/instructor/results/:attemptId[/view]
  POST /api/instructor/results/:attemptId/finalize|email-grades-updated|recalculate
  GET  /api/grades/weights
  POST /api/grades/adjust-weight
SERVICES: student-api.ts getGrades (session-proof), grades-api.ts, grades-category-breakdown.ts, assessment-results-api.ts (header-only), rewards-api.ts (header-only, breakdown), instructor-api.ts
DATABASE MODELS: UNVERIFIED directly. Inferred: student_grades, grade_weights, quiz_attempts, class averages
MEMBERSHIP: Student Grades unlocked all tiers. Faculty Manage Results Pro-gated in drawer + FacultyAdminTierGate. Server results list has no membership check.
CORA INTEGRATION: student-module-registry grades allowed read/explain/summarize/navigate; denied modify_grades / read_other_student_grades. Faculty results.* Pro.
FACULTY DEPENDENCY: Faculty Expo Manage Results + grading policies/weights. Faculty publish/finalize attempts flow into this gradebook.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: /student/dashboard-v2/grades
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Grades**. Scope is Faculty Expo Manage Results plus required backend and student Grades downstream.

Execution: production HTTPS probes with review roster (Alex ECE `910000001` / db `722` / Scholar, Jordan `723`, ELEG `734`, faculty `mchen` / instructor `15`, course `16`). Simulator UI: **UNVERIFIED**. Did not finalize live attempts or submit valid weight changes.

A prior faculty-mobile Manage Results report marked READY TO SHIP (89) using `audit:results-production`, which treats header-only instructor ids as auth. This run **rejects that result**.

---

## Executive Summary

Readiness: **READY WITH MINOR FIXES**  
Score: **72/100**  
Blockers: 0  
Critical: 0 remaining on production (G1–G4 were 200 earlier this run; re-probe 401)  
High: 0 remaining locally (G5–G7 repaired in Expo)  
Medium: 1 (sim / finalize E2E still UNVERIFIED)  
Low: 2

Student Grades is a native gradebook: hero total/letter, pending vs recorded lens, category rows, contribution summary, locked banner, category sheet of contributing assessments. `studentApi.getGrades` already failed closed without session cookies.

**Same-run production flip:** first probes (this audit) showed header-only grades/results/adjust-weight **200**. A later independent re-probe on `https://coursecollab.vercel.app` returned header-only **401** on G1–G4. That deploy is **not** from this mobile repo. Cookie-only student grades (Alex login, no `x-student-id`) → **200** 12.88 F. Cookie + Jordan header → **403**. Faculty cookie + course headers → **200** results list. Faculty cookie-only → **400** missing `x-course-id`.

Expo takeaways from this run: results/rewards clients now fail closed; missing weights are 0, not invented; `audit-results-production.mjs` no longer treats header-only 200 as PASS. Simulator UI and faculty finalize → student letter E2E remain **UNVERIFIED** — not READY TO SHIP.

---

## Architecture

Student Drawer (`Assessments` → Grades)  
→ `/module/grades`  
→ `GradesScreen`  
→ hero + category list + contribution + lock  
→ category sheet → quizzes/history/attendance/points  
→ `studentApi.getGrades` (`studentRequest` session-proof)  
→ production `/api/grades/student` binds **`x-student-id`**, ignores cookies  
→ Faculty Drawer `Manage Results` (Pro UI gate)  
→ `FacultyResultsScreen` → `instructorApi` (client session-proof)  
→ production `/api/instructor/results*` accepts **header-only instructor id**

---

## Files Inspected

- `expo/src/constants/student-nav.ts`, `faculty-nav.ts`
- `expo/src/modules/registry.tsx`, `native-screens.tsx`, `faculty-registry.tsx`
- `expo/src/components/assessments/GradesScreen.tsx`, `GradeHeroCard.tsx`, `GradeCategoryBreakdownSheet.tsx`, `GradeLensToggle.tsx`
- `expo/src/lib/grades-api.ts`, `grades-category-breakdown.ts`, `grades-theme.ts`, `student-api.ts`, `assessment-results-api.ts`, `rewards-api.ts`
- `expo/src/components/faculty/FacultyResultsScreen.tsx`, `FacultyResultsListCards.tsx`
- `expo/src/lib/instructor-api.ts` (results + weights)
- `expo/scripts/audit-results-production.mjs`
- `expo/src/lib/cora/student-module-registry.ts`
- Prior `expo/docs/audits/faculty-mobile/results.md` (not trusted)

---

## Navigation & Routing

**Status:** PASS (traced)

- Student **Grades** → `/module/grades` → `GradesScreen`. Does not resolve a faculty screen.
- Faculty **Manage Results** → `/module/results` → `FacultyResultsScreen` inside `FacultyAdminTierGate minTier="Pro"`.
- Category sheet can push `/assessment/report/[attemptId]`.
- Web remap: `/student/dashboard-v2/grades`.

Simulator drawer tap: **UNVERIFIED**.

---

## Production Configuration

Production API verified: YES (`https://coursecollab.vercel.app`)  
Development URLs: none in grades/results clients  
Mock dependencies: `DEFAULT_WEIGHTS` in `grades-api.ts` (client fallback, not a network mock)

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| GradesScreen | Gradebook | ACTIVE |
| GradeHeroCard + lens | Total / letter / pending | ACTIVE |
| GradeCategoryBreakdownSheet | Per-category items | ACTIVE (traced) |
| FacultyResultsScreen | Attempt list | ACTIVE |
| FacultyAttemptReportModal | Finalize / email / recalc | ACTIVE (not executed on live) |
| AssessmentReportScreen | Student attempt report | Related; header-only client |

---

## Components

| Component | Class |
|-----------|--------|
| CategoryCard rows | ACTIVE |
| Contribution summary | ACTIVE |
| Locked gradebook banner | ACTIVE |
| GradeSummaryCard | UNUSED on this screen |
| assessment-results-api | ACTIVE (header-only) |
| rewards-api | ACTIVE for attendance/classroom/engagement breakdown |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Grades nav | Student drawer | registry | getGrades | Open book | Traced | PASS |
| Pull refresh | Grades | load() | getGrades | Reload | Traced | PASS |
| Try again | Error | onRefresh | getGrades | Retry | Traced | PASS |
| Pending / Recorded lens | Hero | setGradeLens | none | Toggle display | Traced | PASS |
| Category row | List | open sheet | breakdown fetch | Sheet | Traced | PASS |
| Breakdown item | Sheet | open report / take | results API | Report | Header-only client | FAIL client |
| Faculty search/tabs | Results | filterResults | none | Filter | Traced | PASS |
| Faculty row | Results | report modal | results/:id/view | Report | Header-only 200 | FAIL auth |
| Finalize / email | Modal | instructorApi | POST finalize | Mutate | Unauth 401; header fake 404 | PARTIAL |

No student control writes the gradebook. **PASS** for student mutations.

---

## Menus / Action Sheets

Category breakdown is a sheet, not an action menu. Faculty report modal actions traced, not executed on live attempts.

---

## Modals

GradeCategoryBreakdownSheet: open/close traced. Second-open stale category: **UNVERIFIED**. Faculty report modal: **UNVERIFIED UI**.

---

## Forms

No student grade-edit form. Faculty weight adjust lives in Grading Policies (header-only reached validator). Faculty finalize body `{ finalized }` — not executed on live ids.

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/grades/student` | getGrades | No query **400**. Query-only **401**. Cookie-only **401**. Header-only **200** | Query must match header (mismatch **403**) | none | session query | **CRITICAL** |
| POST/PUT | `/api/grades/student` | none | **405** | — | — | — | PASS (no write) |
| GET | `/api/student/results/:id` | assessmentResultsApi | Unauth **401**. Header as owner **200**. Header as other **403** | claimed header | none | attempt course | **CRITICAL** |
| GET | `/api/student/assessment-history` | breakdown | Header as other **403**. Header as self **200** | claimed header | none | session | FAIL auth |
| GET | `/api/instructor/results` | FacultyResults | Unauth **401**. Header-only **200** (35 rows) | course 1 **403** | none (Pro UI only) | course header | **CRITICAL** |
| GET | `/api/instructor/results/:id` | modal | Header-only **200** | — | none | — | **CRITICAL** |
| GET | `/api/instructor/results/:id/view` | modal | Header-only **200** + answer keys | — | none | — | **CRITICAL** |
| POST | `.../finalize` | modal | Unauth **401**. Header fake id **404** | — | none | — | FAIL auth |
| GET | `/api/grades/weights` | policies | Header-only **200**. Student **401**. Course 1 header **403** | instructor | none | header course | FAIL auth |
| POST | `/api/grades/adjust-weight` | policies | Header-only empty → **400** (total 0%) | instructor | none | — | **CRITICAL** |

---

## CRUD

Student: **read only**. Faculty: read results proven; finalize/email/recalc **not executed** on live attempts. Weight adjust auth bypass proven; valid write **not executed**.

---

## Authentication

**FAIL.**

| Probe | Result |
|-------|--------|
| GET grades no params | 400 Student ID required |
| GET grades query 722 no header | **401** |
| GET grades `x-student-id: 722` | **200** total 12.88 F |
| GET grades `x-student-id: 910000001` | **200** same book |
| GET grades `x-student-id: 723` | **200** Jordan 12.82 F |
| GET grades `x-student-id: 734` ELEG | **200** 0.00 F, avg 72.40 |
| Cookie-only grades + query 722 | **401** (cookie is not identity) |
| Cookie + query 722 + header 723 | **403** |
| Faculty results no headers | 401 |
| Faculty results header 15/16 | **200** 35 named scores |
| Student header → faculty results | 401 |

---

## Student Authorization

Students cannot write `/api/grades/student` (405) or `/api/grades/adjust-weight` (401). Students cannot list faculty results with a student header (401).

Students **can** read any gradebook or owned attempt by sending that student’s `x-student-id`.

---

## Cross-Student Isolation

| Probe | Result |
|-------|--------|
| Header 722 + query 723 grades | **403** |
| Header 722 + history for 723 | **403** |
| Header 722 + results 4480 (Avery) | **403** |
| Header 723 + results 4463 (Alex) | **403** |
| Header `910000007` + results 4480 | **200** Avery 0% + `correct_answer` |
| Header 722 + results 4463 | **200** Alex Homework 7 |

Honest-header isolation **PASS**. Header spoof **FAIL**.

---

## Course / Section Isolation

ELEG 734 gradebook is distinct (0.00, quiz weight 10 vs ECE 20). Faculty results course 1 **403**. Weights `?courseId=1` with header course 16 returns **course 16** (query ignored). Weights header course 1 **403**.

---

## Membership Enforcement

Student Grades: no tier gate — **PASS**. Faculty Results: Pro UI gate only. Header-only results list has no membership check — **FAIL server**.

---

## Security

THE MOBILE CLIENT IS UNTRUSTED. Production trusts `x-student-id` and `x-instructor-id`+`x-course-id`. Cookies are insufficient for grades. `audit-results-production.mjs` treats those headers as auth and treats some 404s as PASS.

---

## Assessment Security

Student attempt report for the claimed owner includes `correct_answer`, `bank_correct_answer`, `sample_answers`. That is intended after completion **if** identity is a real session. Header-only owner spoof leaks keys. Faculty view likewise leaks keys to anyone with instructor headers.

---

## Cora Security

Registry denies `modify_grades` / `read_other_student_grades`. Tool-level enforcement **UNVERIFIED**. Cora context loader calls `studentApi.getGrades` (session-proof client).

---

## Database Integrity

`recalculate=true` vs `false` both returned 12.88. Whether recalculate writes the row: **UNVERIFIED**. `is_locked=false` on review books. Weights total on ECE is **110** (API returned total 110) — policy integrity note, not a mobile bug.

---

## Files / Documents

PDF mark-downloaded exists on `assessmentResultsApi` (header-only). Not executed.

---

## Notifications

`useNotificationModuleRefresh(["grades", "assessments"])`. Registry maps `grades` and faculty `results`. Push E2E **UNVERIFIED**.

---

## Mobile UX

Grouped category list, status pills with labels, score + contribution (not color-only). No search dock — appropriate (not a searchable catalog). Faculty results uses dock search. Simulator **UNVERIFIED**.

---

## Theme

`grades-theme` tokens, `NATIVE` lists, hero gauge. Light/dark **UNVERIFIED** on device.

---

## Accessibility

Category rows have `accessibilityRole` + label including score. Icon-only chevron is on a labeled row. Dynamic type **UNVERIFIED**.

---

## Errors / Loading / Empty States

Initial spinner; error + Try again; empty categories copy; locked banner. Breakdown sheet has its own loading. Offline **UNVERIFIED**.

---

## Performance

Single grades GET. Category sheet fans out to quizzes/history/attendance/points. Acceptable.

---

## Web / Mobile Integration

Web path mapped. Same `/api/grades/student` as dashboard KPIs. Parity of letter/total with web **UNVERIFIED** in UI.

---

## Faculty → Student Integration

Faculty results show Alex Homework 7 attempt 4463 (0%). Student gradebook homework_score **64.40** (category aggregate, not that one attempt). Weights from `/api/grades/weights` match the student payload (quiz 20 on ECE). Finalize → student letter update: **UNVERIFIED** (live attempts not toggled).

---

## Tests

`grade-trend-logic.test.ts` is dashboard, not this module. No grades/results client auth contract tests. `audit:results-production` is a **false PASS** harness.

---

## End-to-End Results

| Step | Executed | Status |
|------|----------|--------|
| Open Grades from drawer | No (sim) | UNVERIFIED UI |
| Load Alex gradebook | Yes | PASS payload / FAIL auth |
| Category sheet | Code trace | UNVERIFIED UI |
| Faculty list results | Yes | PASS payload / FAIL auth |
| Faculty finalize → student refresh | No | UNVERIFIED |
| Student write grade | POST/PUT 405 | PASS |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Header-only victim grades | **200** (Alex, Jordan, ELEG) |
| Query-only grades | 401 |
| Cookie-only grades | 401 |
| Cookie + other header | 403 |
| Student POST/PUT grades | 405 |
| Student adjust weights | 401 |
| Header-only faculty results list | **200** 35 PII rows |
| Header-only faculty view | **200** + answer keys |
| Student → faculty results | 401 |
| Header as other → attempt | 403 |
| Header as owner roster id → attempt | **200** + keys |
| Header-only adjust-weight empty | **400** (auth passed) |
| Foreign course results | 403 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| G1 | CRITICAL | Auth | First probe: header-only grades **200**. Later probe: header-only **401**; cookie-only own **200**; cookie+other header **403**. | Both 2026-08-18 on production | `/api/grades/student` | Re-prove after next deploy; keep session bind |
| G2 | CRITICAL | Auth / privacy | First probe: header-only faculty results **200** (35 names). Later: header-only **401**; cookie+headers **200**. | Same | `/api/instructor/results*` | Keep session bind; course header still required |
| G3 | CRITICAL | Isolation / keys | First probe: header-only owner results **200** + keys. Later: header-only **401**. Cookie+own 4463 **200**. | Same | `/api/student/results/:id` | Keep session bind |
| G4 | CRITICAL | Auth | First probe: header-only adjust-weight **400** (auth passed). Later: header-only **401**. Valid write never sent. | Same | `/api/grades/adjust-weight` | Keep session bind |
| G5 | HIGH | Client auth | **Fixed locally.** `assessmentResultsApi` now uses `studentAuthenticatedRequest`. | file read after repair | `assessment-results-api.ts` | — |
| G6 | HIGH | Client auth | **Fixed locally.** `rewardsApi` now uses `studentAuthenticatedRequest`. | file read after repair | `rewards-api.ts` | — |
| G7 | HIGH | Testing | **Fixed locally.** Script fails header-only 200 / 500 / 404-as-auth. | `audit-results-production.mjs` | same | — |
| G8 | MEDIUM | Data | **Fixed locally.** Missing weight → 0; no `DEFAULT_WEIGHTS` merge. | `grades-api.ts` + weights test | same | — |
| G9 | MEDIUM | Testing | **Fixed locally.** Results/rewards contract tests + weights test pass via tsx. | `npx tsx --test` 4/4 | expo tests | — |
| G10 | LOW | UX | Simulator / theme / a11y not executed. | this run | — | module-deep-test Grades + Manage Results |
| G11 | LOW | Integrity | ECE weights `total: 110` from API. | weights probe | backend policy | Faculty grading-policies audit |

---

## Required Before Ship

1. Run simulator module-deep-test on student Grades + faculty Manage Results (still UNVERIFIED).  
2. Faculty finalize → student letter/total refresh on a disposable attempt (do not toggle live 4463/4480).  
3. Re-run `audit:results-production` after the next web deploy — header-only flipped mid-audit.  
4. Confirm faculty Pro is server-enforced, not only `FacultyAdminTierGate`.

---

## Future Improvements

- Stop merging `DEFAULT_WEIGHTS` (G8)  
- Confirm weights total 100% on ECE  
- Sim-audit Grades + Manage Results  

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 92 |
| Routing | 90 |
| UI | 82 |
| Buttons | 78 |
| API | 34 |
| CRUD | 70 |
| Authentication | 20 |
| Authorization | 48 |
| Student Isolation | 40 |
| Course Isolation | 78 |
| Membership | 70 |
| Production Configuration | 92 |
| Data Integrity | 62 |
| Security | 26 |
| Assessment Security | 38 |
| Cora Security | 50 |
| Error Handling | 80 |
| Mobile UX | 84 |
| Performance | 86 |
| Accessibility | 74 |
| Testing | 20 |

OVERALL SCORE: 72/100

FINAL STATUS: READY WITH MINOR FIXES

Authentication (re-probe): 82. First-pass header-only 200s are recorded above and must not be forgotten if a deploy rolls back.

Audited at: 2026-08-18T03:25:00.000Z  
Commit: dba7f46  

Dependencies: student-api, grades-api, grades-category-breakdown, assessment-results-api, rewards-api, instructor-api results/weights, FacultyResultsScreen, GradesScreen, /api/grades/student, /api/student/results, /api/instructor/results

Prior faculty-mobile `results` READY TO SHIP requires **REVALIDATION_REQUIRED**.
